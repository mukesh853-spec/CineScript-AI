import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = 3000;
const AUTH_SALT = process.env.AUTH_SALT || "cinescript_sec_salt_2026";

// ==========================================
// SECURE SERVER-SIDE AUTH & REAL GATEWAYS
// ==========================================

interface ServerPhoneOtpRecord {
  otpHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sendCount: number;
}

interface ServerEmailOtpRecord {
  otpHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sendCount: number;
  name?: string;
}

interface ServerEmailVerificationRecord {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  name: string;
  passwordHash: string;
  lastSentAt: number;
}

interface ServerPasswordResetRecord {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

interface ServerUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  isVerified: boolean;
  createdAt: string;
}

const phoneOtpStore = new Map<string, ServerPhoneOtpRecord>();
const emailOtpStore = new Map<string, ServerEmailOtpRecord>();
const emailVerificationStore = new Map<string, ServerEmailVerificationRecord>();
const passwordResetStore = new Map<string, ServerPasswordResetRecord>();
const registeredUsers = new Map<string, ServerUser>();
const activeSessions = new Map<string, { userId: string; expiresAt: number }>();

// ==========================================
// PERSISTENT STORAGE MANAGEMENT (FILE-BACKED)
// ==========================================
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

function ensureDataDirExists(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("[Storage] Failed to create data directory:", err);
  }
}

function loadUsersFromDisk(): void {
  try {
    ensureDataDirExists();
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      if (raw && raw.trim()) {
        const parsed: ServerUser[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          registeredUsers.clear();
          for (const u of parsed) {
            if (u && u.id) {
              registeredUsers.set(u.id, u);
            }
          }
          console.log(`[Storage] Loaded ${registeredUsers.size} persistent user account(s) from storage.`);
        }
      }
    }
  } catch (err) {
    console.error("[Storage] Error loading users from disk:", err);
  }
}

function saveUsersToDisk(): void {
  try {
    ensureDataDirExists();
    const usersArray = Array.from(registeredUsers.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2), "utf-8");
  } catch (err) {
    console.error("[Storage] Error saving users to disk:", err);
  }
}

function loadSessionsFromDisk(): void {
  try {
    ensureDataDirExists();
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          activeSessions.clear();
          const now = Date.now();
          for (const [token, sess] of Object.entries(parsed)) {
            if (sess && typeof sess === "object" && (sess as any).userId && (sess as any).expiresAt > now) {
              activeSessions.set(token, sess as { userId: string; expiresAt: number });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[Storage] Error loading sessions from disk:", err);
  }
}

function saveSessionsToDisk(): void {
  try {
    ensureDataDirExists();
    const sessionsObj = Object.fromEntries(activeSessions.entries());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessionsObj, null, 2), "utf-8");
  } catch (err) {
    console.error("[Storage] Error saving sessions to disk:", err);
  }
}

function normalizeEmail(email?: string): string {
  if (!email || typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

function findUserByEmail(rawEmail?: string): ServerUser | undefined {
  const targetEmail = normalizeEmail(rawEmail);
  if (!targetEmail) return undefined;
  return Array.from(registeredUsers.values()).find(
    (u) => normalizeEmail(u.email) === targetEmail
  );
}

function findUserByPhone(rawPhone?: string): ServerUser | undefined {
  if (!rawPhone) return undefined;
  const cleanDigits = String(rawPhone).replace(/[^0-9]/g, "");
  if (!cleanDigits) return undefined;
  return Array.from(registeredUsers.values()).find(
    (u) => u.phone && u.phone.replace(/[^0-9]/g, "") === cleanDigits
  );
}

// Initialize persistent data on boot
loadUsersFromDisk();
loadSessionsFromDisk();

function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret + AUTH_SALT).digest("hex");
}

function maskPhone(phone: string): string {
  const clean = phone.trim();
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  const prefix = clean.startsWith("+") ? clean.slice(0, 3) : "";
  return `${prefix} ******${last4}`;
}

function normalizeE164Phone(rawPhone: string): { e164: string; isValid: boolean; error?: string } {
  if (!rawPhone || typeof rawPhone !== "string") {
    return { e164: "", isValid: false, error: "Please enter a valid phone number." };
  }

  let trimmed = rawPhone.trim().replace(/[\s\-\(\)\.]/g, "");
  if (!trimmed) {
    return { e164: "", isValid: false, error: "Phone number cannot be empty." };
  }

  // Handle leading 00 (international call prefix)
  if (trimmed.startsWith("00")) {
    trimmed = "+" + trimmed.slice(2);
  }

  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/[^0-9]/g, "");

  if (!digits) {
    return { e164: "", isValid: false, error: "Phone number must contain digits." };
  }

  // 1. If domestic leading 0 is present (e.g. 09876543210 - 11 digits in India):
  if (digits.startsWith("0") && digits.length === 11) {
    const withoutZero = digits.slice(1);
    if (/^[6-9]\d{9}$/.test(withoutZero)) {
      return { e164: `+91${withoutZero}`, isValid: true };
    }
  }

  // 2. If 10 digits starting with 6,7,8,9 (Standard Indian mobile number):
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return { e164: `+91${digits}`, isValid: true };
  }

  // 3. If 12 digits starting with 91 (e.g. 919876543210):
  if (digits.length === 12 && digits.startsWith("91")) {
    return { e164: `+${digits}`, isValid: true };
  }

  // 4. If explicit + was provided
  if (hasPlus) {
    if (digits.length >= 7 && digits.length <= 15) {
      return { e164: `+${digits}`, isValid: true };
    } else {
      return { e164: `+${digits}`, isValid: false, error: "Invalid international phone number length (must be 7-15 digits)." };
    }
  }

  // 5. If 11 digits starting with 1 (e.g. US/Canada: 15551234567)
  if (digits.length === 11 && digits.startsWith("1")) {
    return { e164: `+${digits}`, isValid: true };
  }

  // 6. Generic fallback if 10-15 digits
  if (digits.length >= 10 && digits.length <= 15) {
    return { e164: `+${digits}`, isValid: true };
  }

  return {
    e164: `+${digits}`,
    isValid: false,
    error: "Invalid phone number format. Please provide a valid 10-digit mobile number or E.164 international format (e.g. +91 9876543210).",
  };
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const firstChar = user[0] || "";
  return `${firstChar}***@${domain}`;
}

interface SmsDispatchResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

async function sendSmsViaProvider(phoneNumber: string, message: string, otpCode: string): Promise<SmsDispatchResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  const msg91AuthKey = process.env.MSG91_AUTH_KEY;
  const msg91TemplateId = process.env.MSG91_TEMPLATE_ID;
  const genericGatewayUrl = process.env.SMS_GATEWAY_URL;

  console.log(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_STARTED: target=${maskPhone(phoneNumber)}`);

  // Provider 1: Twilio SMS API
  if (accountSid && authToken && (fromNumber || messagingServiceSid)) {
    try {
      console.log(`[PHONE_AUTH_DIAGNOSTICS] Attempting SMS dispatch via Twilio Gateway...`);
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const params = new URLSearchParams();
      params.append("To", phoneNumber);
      if (messagingServiceSid) {
        params.append("MessagingServiceSid", messagingServiceSid);
      } else if (fromNumber) {
        params.append("From", fromNumber);
      }
      params.append("Body", message);

      const twilioRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const responseText = await twilioRes.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // non-json response
      }

      if (!twilioRes.ok) {
        const twilioCode = responseJson?.code || twilioRes.status;
        const twilioMsg = responseJson?.message || responseText;
        console.error(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_FAILED: provider=Twilio target=${maskPhone(phoneNumber)} error_code=${twilioCode} error_msg=${twilioMsg}`);
        
        let userFriendlyMsg = `Twilio SMS dispatch failed (${twilioCode}): ${twilioMsg}`;
        if (twilioCode === 21608) {
          userFriendlyMsg = "Twilio trial account restriction: Unverified recipient number. In Twilio Trial mode, please verify your number in the Twilio Console (Caller IDs) or upgrade your Twilio account.";
        } else if (twilioCode === 21408) {
          userFriendlyMsg = "Twilio Geo-Permission restriction: SMS to this country is not enabled in your Twilio Console (Messaging Geo-Permissions).";
        } else if (twilioCode === 21211) {
          userFriendlyMsg = "Invalid phone number format rejected by Twilio.";
        } else if (twilioCode === 20003) {
          userFriendlyMsg = "Twilio authentication failed: Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.";
        }

        return {
          success: false,
          provider: "Twilio",
          errorCode: String(twilioCode),
          error: userFriendlyMsg,
        };
      }

      const sid = responseJson?.sid || "TWILIO_DISPATCHED";
      console.log(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_SUCCESS: provider=Twilio target=${maskPhone(phoneNumber)} message_id=${sid}`);
      return {
        success: true,
        provider: "Twilio",
        messageId: sid,
      };
    } catch (err: any) {
      console.error(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_FAILED: provider=Twilio target=${maskPhone(phoneNumber)} error_code=NETWORK_ERROR error_msg=${err.message}`);
      return {
        success: false,
        provider: "Twilio",
        errorCode: "NETWORK_ERROR",
        error: `Twilio network connection error: ${err.message}`,
      };
    }
  }

  // Provider 2: Fast2SMS API (for India numbers)
  if (fast2smsKey) {
    try {
      console.log(`[PHONE_AUTH_DIAGNOSTICS] Attempting SMS dispatch via Fast2SMS Gateway...`);
      const clean10Digits = phoneNumber.replace(/[^0-9]/g, "").slice(-10);
      const f2sRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2smsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otpCode,
          numbers: clean10Digits,
        }),
      });

      const f2sData: any = await f2sRes.json().catch(() => ({}));
      if (f2sData.return === true || f2sRes.ok) {
        console.log(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_SUCCESS: provider=Fast2SMS target=${maskPhone(phoneNumber)} message_id=${f2sData.request_id || "F2S_OK"}`);
        return {
          success: true,
          provider: "Fast2SMS",
          messageId: f2sData.request_id,
        };
      } else {
        const errorMsg = f2sData.message?.[0] || f2sData.message || "Fast2SMS dispatch failed";
        console.error(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_FAILED: provider=Fast2SMS target=${maskPhone(phoneNumber)} error_code=F2S_ERROR error_msg=${errorMsg}`);
        return {
          success: false,
          provider: "Fast2SMS",
          errorCode: "F2S_ERROR",
          error: `Fast2SMS error: ${errorMsg}`,
        };
      }
    } catch (err: any) {
      console.error(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_FAILED: provider=Fast2SMS target=${maskPhone(phoneNumber)} error_code=NETWORK_ERROR error_msg=${err.message}`);
      return {
        success: false,
        provider: "Fast2SMS",
        errorCode: "NETWORK_ERROR",
        error: `Fast2SMS network error: ${err.message}`,
      };
    }
  }

  // Provider 3: Msg91 API
  if (msg91AuthKey && msg91TemplateId) {
    try {
      console.log(`[PHONE_AUTH_DIAGNOSTICS] Attempting SMS dispatch via Msg91 Gateway...`);
      const cleanDigits = phoneNumber.replace(/[^0-9]/g, "");
      const msg91Res = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${msg91TemplateId}&mobile=${cleanDigits}&otp=${otpCode}`, {
        method: "POST",
        headers: {
          authkey: msg91AuthKey,
          "Content-Type": "application/json",
        },
      });
      const msg91Data: any = await msg91Res.json().catch(() => ({}));
      if (msg91Data.type === "success" || msg91Res.ok) {
        console.log(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_SUCCESS: provider=Msg91 target=${maskPhone(phoneNumber)} message_id=${msg91Data.message || "MSG91_OK"}`);
        return {
          success: true,
          provider: "Msg91",
          messageId: msg91Data.message,
        };
      } else {
        const errorMsg = msg91Data.message || "Msg91 OTP dispatch failed";
        console.error(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_FAILED: provider=Msg91 target=${maskPhone(phoneNumber)} error_code=MSG91_ERROR error_msg=${errorMsg}`);
        return {
          success: false,
          provider: "Msg91",
          errorCode: "MSG91_ERROR",
          error: `Msg91 error: ${errorMsg}`,
        };
      }
    } catch (err: any) {
      console.error(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_FAILED: provider=Msg91 target=${maskPhone(phoneNumber)} error_code=NETWORK_ERROR error_msg=${err.message}`);
      return {
        success: false,
        provider: "Msg91",
        errorCode: "NETWORK_ERROR",
        error: `Msg91 network error: ${err.message}`,
      };
    }
  }

  // Provider 4: Custom HTTP Gateway Webhook
  if (genericGatewayUrl) {
    try {
      console.log(`[PHONE_AUTH_DIAGNOSTICS] Attempting SMS dispatch via Custom Webhook Gateway...`);
      const customRes = await fetch(genericGatewayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.SMS_GATEWAY_API_KEY ? { Authorization: `Bearer ${process.env.SMS_GATEWAY_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          to: phoneNumber,
          message,
          otp: otpCode,
        }),
      });
      if (customRes.ok) {
        console.log(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_SUCCESS: provider=CustomGateway target=${maskPhone(phoneNumber)}`);
        return {
          success: true,
          provider: "CustomGateway",
        };
      } else {
        const errText = await customRes.text();
        console.error(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_FAILED: provider=CustomGateway target=${maskPhone(phoneNumber)} error_code=${customRes.status} error_msg=${errText}`);
        return {
          success: false,
          provider: "CustomGateway",
          errorCode: String(customRes.status),
          error: `Custom SMS gateway returned error status ${customRes.status}`,
        };
      }
    } catch (err: any) {
      console.error(`[PHONE_AUTH_DIAGNOSTICS] PHONE_AUTH_REQUEST_FAILED: provider=CustomGateway target=${maskPhone(phoneNumber)} error_code=NETWORK_ERROR error_msg=${err.message}`);
      return {
        success: false,
        provider: "CustomGateway",
        errorCode: "NETWORK_ERROR",
        error: `Custom gateway connection failed: ${err.message}`,
      };
    }
  }

  // If NO SMS Provider is configured in environment:
  console.log(`[PHONE_AUTH_STATUS] Gateway check: No external SMS provider credentials (e.g. TWILIO_ACCOUNT_SID, FAST2SMS_API_KEY) found in environment.`);
  
  return {
    success: false,
    provider: "none",
    errorCode: "SMS_PROVIDER_NOT_CONFIGURED",
    error: "Real SMS Gateway is not yet configured. Please configure your SMS credentials (e.g. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) in Settings, or sign in using Email.",
  };
}

interface EmailDispatchResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

async function sendEmailViaProvider(
  toEmail: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<EmailDispatchResult> {
  const rawBrevoApiKey = process.env.BREVO_API_KEY;
  const brevoApiKey = rawBrevoApiKey?.trim().replace(/^['"]|['"]$/g, "");
  const brevoSenderEmail = (process.env.BREVO_SENDER_EMAIL || "mukeshravi853@gmail.com").trim();
  const brevoSenderName = (process.env.BREVO_SENDER_NAME || "CineScript AI").trim();

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || "CineScript AI <auth@cinescript.ai>";
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

  const resendApiKey = process.env.RESEND_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  const resendFrom = process.env.RESEND_FROM || "CineScript AI <onboarding@resend.dev>";

  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const sendgridFrom = process.env.SENDGRID_FROM || smtpFrom;

  const postmarkServerToken = process.env.POSTMARK_SERVER_TOKEN;
  const postmarkFrom = process.env.POSTMARK_FROM || smtpFrom;

  console.log(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_REQUEST_STARTED: target=${maskEmail(toEmail)}`);

  // Provider 1: Brevo Transactional Email (REST API & SMTP Relay)
  if (brevoApiKey) {
    // 1A. Brevo REST API v3
    try {
      console.log(`[EMAIL_AUTH_DIAGNOSTICS] Attempting Email dispatch via Brevo REST API v3 to ${maskEmail(toEmail)}...`);
      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: brevoSenderName,
            email: brevoSenderEmail,
          },
          to: [
            {
              email: toEmail,
            },
          ],
          subject: subject,
          htmlContent: htmlContent,
          textContent: textContent,
        }),
      });

      const responseBody: any = await brevoRes.json().catch(() => ({}));

      if (brevoRes.ok) {
        const messageId = responseBody.messageId || "brevo-ok";
        console.log(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_SUCCESS: provider=Brevo-REST target=${maskEmail(toEmail)} messageId=${messageId}`);
        return {
          success: true,
          provider: "Brevo",
          messageId,
        };
      } else {
        const errMsg = responseBody.message || responseBody.code || `HTTP ${brevoRes.status}`;
        console.warn(`[EMAIL_AUTH_DIAGNOSTICS] Brevo REST API returned: ${errMsg}. Attempting Brevo SMTP Relay fallback...`);
      }
    } catch (err: any) {
      console.warn(`[EMAIL_AUTH_DIAGNOSTICS] Brevo REST API network error: ${err.message}. Attempting Brevo SMTP Relay fallback...`);
    }

    // 1B. Brevo SMTP Relay Fallback (handles SMTP keys xsmtpsib-... or REST fallback)
    try {
      console.log(`[EMAIL_AUTH_DIAGNOSTICS] Attempting Email dispatch via Brevo SMTP Relay (smtp-relay.brevo.com:587) to ${maskEmail(toEmail)}...`);
      const brevoTransporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: {
          user: brevoSenderEmail,
          pass: brevoApiKey,
        },
      });

      const info = await brevoTransporter.sendMail({
        from: `"${brevoSenderName}" <${brevoSenderEmail}>`,
        to: toEmail,
        subject: subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_SUCCESS: provider=Brevo-SMTP target=${maskEmail(toEmail)} messageId=${info.messageId}`);
      return {
        success: true,
        provider: "Brevo",
        messageId: info.messageId,
      };
    } catch (smtpErr: any) {
      console.error(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_FAILED: provider=Brevo-SMTP target=${maskEmail(toEmail)} error=${smtpErr.message}`);
      
      // If no other provider configured, return clear Brevo guidance
      if (!smtpHost && !resendApiKey && !sendgridApiKey && !postmarkServerToken) {
        return {
          success: false,
          provider: "Brevo",
          errorCode: "BREVO_ERROR",
          error: `Brevo dispatch failed: ${smtpErr.message}. Please verify your BREVO_API_KEY in Settings (generated from Brevo > SMTP & API > API Keys).`,
        };
      }
    }
  }

  // Provider 2: Resend API (Fallback if configured)
  if (resendApiKey) {
    try {
      console.log(`[EMAIL_AUTH_DIAGNOSTICS] Attempting Email dispatch via Resend SDK fallback...`);
      const resend = new Resend(resendApiKey);
      const resendResponse = await resend.emails.send({
        from: resendFrom,
        to: [toEmail],
        subject: subject,
        html: htmlContent,
        text: textContent,
      });

      if (!resendResponse.error) {
        const messageId = resendResponse.data?.id || "resend-ok";
        console.log(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_SUCCESS: provider=Resend target=${maskEmail(toEmail)} messageId=${messageId}`);
        return {
          success: true,
          provider: "Resend",
          messageId,
        };
      } else {
        const errMsg = resendResponse.error.message || JSON.stringify(resendResponse.error);
        console.error(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_FAILED: provider=Resend target=${maskEmail(toEmail)} error=${errMsg}`);
      }
    } catch (err: any) {
      console.error(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_FAILED: provider=Resend target=${maskEmail(toEmail)} error=${err.message}`);
    }
  }

  // Provider 2: SMTP via Nodemailer
  if (smtpHost && smtpUser && smtpPass) {
    try {
      console.log(`[EMAIL_AUTH_DIAGNOSTICS] Attempting Email dispatch via SMTP Gateway (${smtpHost}:${smtpPort})...`);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: smtpFrom,
        to: toEmail,
        subject: subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_SUCCESS: provider=SMTP target=${maskEmail(toEmail)} messageId=${info.messageId}`);
      return {
        success: true,
        provider: "SMTP",
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_FAILED: provider=SMTP target=${maskEmail(toEmail)} error=${err.message}`);
      return {
        success: false,
        provider: "SMTP",
        errorCode: "SMTP_ERROR",
        error: `SMTP email dispatch failed: ${err.message}`,
      };
    }
  }

  // Provider 3: SendGrid API
  if (sendgridApiKey) {
    try {
      console.log(`[EMAIL_AUTH_DIAGNOSTICS] Attempting Email dispatch via SendGrid API...`);
      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toEmail }] }],
          from: { email: sendgridFrom },
          subject: subject,
          content: [
            { type: "text/plain", value: textContent },
            { type: "text/html", value: htmlContent },
          ],
        }),
      });

      if (sgRes.ok || sgRes.status === 202) {
        console.log(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_SUCCESS: provider=SendGrid target=${maskEmail(toEmail)}`);
        return {
          success: true,
          provider: "SendGrid",
        };
      } else {
        const sgText = await sgRes.text();
        console.error(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_FAILED: provider=SendGrid target=${maskEmail(toEmail)} error=${sgText}`);
        return {
          success: false,
          provider: "SendGrid",
          errorCode: String(sgRes.status),
          error: `SendGrid error: ${sgText}`,
        };
      }
    } catch (err: any) {
      console.error(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_FAILED: provider=SendGrid target=${maskEmail(toEmail)} error=${err.message}`);
      return {
        success: false,
        provider: "SendGrid",
        errorCode: "NETWORK_ERROR",
        error: `SendGrid network error: ${err.message}`,
      };
    }
  }

  // Provider 4: Postmark API
  if (postmarkServerToken) {
    try {
      console.log(`[EMAIL_AUTH_DIAGNOSTICS] Attempting Email dispatch via Postmark API...`);
      const pmRes = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": postmarkServerToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          From: postmarkFrom,
          To: toEmail,
          Subject: subject,
          HtmlBody: htmlContent,
          TextBody: textContent,
        }),
      });

      const pmData: any = await pmRes.json().catch(() => ({}));
      if (pmRes.ok && pmData.ErrorCode === 0) {
        console.log(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_SUCCESS: provider=Postmark target=${maskEmail(toEmail)} messageId=${pmData.MessageID}`);
        return {
          success: true,
          provider: "Postmark",
          messageId: pmData.MessageID,
        };
      } else {
        const errMsg = pmData.Message || `HTTP ${pmRes.status}`;
        console.error(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_FAILED: provider=Postmark target=${maskEmail(toEmail)} error=${errMsg}`);
        return {
          success: false,
          provider: "Postmark",
          errorCode: String(pmData.ErrorCode || pmRes.status),
          error: `Postmark error: ${errMsg}`,
        };
      }
    } catch (err: any) {
      console.error(`[EMAIL_AUTH_DIAGNOSTICS] EMAIL_DISPATCH_FAILED: provider=Postmark target=${maskEmail(toEmail)} error=${err.message}`);
      return {
        success: false,
        provider: "Postmark",
        errorCode: "NETWORK_ERROR",
        error: `Postmark network error: ${err.message}`,
      };
    }
  }

  // If NO Email Provider is configured in environment:
  console.log(`[EMAIL_AUTH_STATUS] Gateway check: No external email credentials (e.g. BREVO_API_KEY, SMTP_HOST, SENDGRID_API_KEY) found in environment.`);
  return {
    success: false,
    provider: "none",
    errorCode: "EMAIL_PROVIDER_NOT_CONFIGURED",
    error: "Real Email Gateway is not yet configured. Please configure BREVO_API_KEY in Settings to enable real verification code delivery.",
  };
}

// 0A. Send Email OTP Endpoint (Real Email OTP Verification Flow)
app.post("/api/auth/send-email-otp", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name ? String(name).trim() : "";

    const existingRecord = emailOtpStore.get(cleanEmail);
    const now = Date.now();

    // Enforce 60-second cooldown between requests
    if (existingRecord && now - existingRecord.lastSentAt < 60000) {
      const remainingSeconds = Math.ceil((60000 - (now - existingRecord.lastSentAt)) / 1000);
      return res.status(429).json({
        error: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
        cooldownSeconds: remainingSeconds,
      });
    }

    // Rate limit: max 10 requests per email per hour
    if (existingRecord && existingRecord.sendCount >= 10 && now < existingRecord.expiresAt) {
      return res.status(429).json({
        error: "Too many verification requests. Please try again in 1 hour.",
      });
    }

    // Generate secure 6-digit random code
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashSecret(rawOtp);

    const emailSubject = `Your CineScript AI Verification Code: ${rawOtp}`;
    const emailText = `Your CineScript AI verification code is: ${rawOtp}\n\nThis code will expire in 10 minutes. If you did not request this code, please ignore this message.`;
    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0A0A0B; color: #FFFFFF; padding: 40px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background: #18181B; border: 1px solid #27272A; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <div style="font-size: 24px; font-weight: bold; color: #F59E0B; margin-bottom: 8px;">🎬 CineScript AI</div>
          <div style="font-size: 13px; color: #A1A1AA; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px;">Director Authentication</div>
          <p style="font-size: 15px; color: #D4D4D8; line-height: 1.6; margin-bottom: 24px;">
            Use the one-time verification code below to authenticate your session in CineScript AI:
          </p>
          <div style="font-size: 32px; font-family: monospace; font-weight: bold; letter-spacing: 6px; color: #F59E0B; background: #27272A; padding: 16px 24px; border-radius: 12px; display: inline-block; margin-bottom: 24px;">
            ${rawOtp}
          </div>
          <p style="font-size: 13px; color: #71717A; line-height: 1.5; margin-bottom: 0;">
            This code is valid for 10 minutes. If you did not request this verification code, please ignore this email.
          </p>
        </div>
      </div>
    `;

    // Attempt real email dispatch
    const dispatchResult = await sendEmailViaProvider(cleanEmail, emailSubject, emailHtml, emailText);

    if (!dispatchResult.success) {
      return res.status(400).json({
        error: dispatchResult.error || "Failed to deliver email verification code. Please check your email configuration.",
        provider: dispatchResult.provider,
        errorCode: dispatchResult.errorCode,
      });
    }

    // Store salted hash with 10-minute expiry
    emailOtpStore.set(cleanEmail, {
      otpHash,
      expiresAt: now + 10 * 60 * 1000,
      attempts: 0,
      lastSentAt: now,
      sendCount: (existingRecord?.sendCount || 0) + 1,
      name: cleanName || existingRecord?.name,
    });

    console.log(`[EMAIL_AUTH] Verification code dispatched successfully to ${maskEmail(cleanEmail)} via ${dispatchResult.provider}`);

    // CRITICAL: NEVER return the OTP in the API response!
    res.json({
      success: true,
      message: "Verification code sent to your email.",
      maskedEmail: maskEmail(cleanEmail),
      cooldownSeconds: 60,
    });
  } catch (error: any) {
    console.error("[Auth Send Email OTP Error]:", error);
    res.status(500).json({ error: "Failed to process verification code request. Please try again." });
  }
});

// 0B. Verify Email OTP Endpoint
app.post("/api/auth/verify-email-otp", (req, res) => {
  try {
    const { email, code, name } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email and 6-digit verification code are required." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();

    if (cleanCode.length !== 6) {
      return res.status(400).json({ error: "Please enter the 6-digit verification code sent to your email." });
    }

    const record = emailOtpStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({ error: "No pending verification found. Please request a new code." });
    }

    if (Date.now() > record.expiresAt) {
      emailOtpStore.delete(cleanEmail);
      return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
    }

    if (record.attempts >= 5) {
      emailOtpStore.delete(cleanEmail);
      return res.status(400).json({ error: "Too many failed attempts. Please request a new verification code." });
    }

    const enteredHash = hashSecret(cleanCode);
    if (enteredHash !== record.otpHash) {
      record.attempts += 1;
      const remaining = 5 - record.attempts;
      return res.status(400).json({
        error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
      });
    }

    // Code is valid - consume OTP
    emailOtpStore.delete(cleanEmail);

    // Find or create registered user
    let user = findUserByEmail(cleanEmail);

    const displayName = (name && String(name).trim()) || record.name || (user ? user.name : "Director");

    if (!user) {
      const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      user = {
        id: userId,
        name: displayName,
        email: cleanEmail,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      registeredUsers.set(userId, user);
      saveUsersToDisk();
    } else {
      user.isVerified = true;
      if (displayName && displayName !== "Director" && !user.name) {
        user.name = displayName;
      }
      saveUsersToDisk();
    }

    const sessionToken = `sess_${crypto.randomBytes(32).toString("hex")}`;
    activeSessions.set(sessionToken, {
      userId: user.id,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    saveSessionsToDisk();

    console.log(`[EMAIL_AUTH_SUCCESS] User ${user.id} (${maskEmail(cleanEmail)}) authenticated successfully via Email OTP.`);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      token: sessionToken,
    });
  } catch (error: any) {
    console.error("[Auth Verify Email OTP Error]:", error);
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// 1. Send Phone OTP Endpoint (NEVER returns OTP in response)
app.post("/api/auth/send-phone-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ error: "Please enter a valid phone number." });
    }

    const { e164: cleanPhone, isValid, error: normError } = normalizeE164Phone(phone);
    if (!isValid || !cleanPhone) {
      return res.status(400).json({ error: normError || "Invalid phone number format. Please enter a valid 10-digit mobile number or E.164 international format (e.g. +91 9876543210)." });
    }

    const existingRecord = phoneOtpStore.get(cleanPhone);
    const now = Date.now();

    // Enforce 60-second cooldown between requests
    if (existingRecord && now - existingRecord.lastSentAt < 60000) {
      const waitRemaining = Math.ceil((60000 - (now - existingRecord.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitRemaining}s before requesting a new OTP.` });
    }

    // Rate limiting: max 10 OTP requests per hour
    if (existingRecord && existingRecord.sendCount >= 10 && now - existingRecord.lastSentAt < 3600000) {
      return res.status(429).json({ error: "Too many OTP requests for this phone number. Please try again later." });
    }

    // Generate secure cryptographic 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = hashSecret(otp);

    // Send SMS via configured SMS Gateway
    const smsResult = await sendSmsViaProvider(
      cleanPhone,
      `Your CineScript AI verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
      otp
    );

    // If SMS provider returned an explicit failure or not configured:
    if (!smsResult.success) {
      return res.status(400).json({
        success: false,
        error: smsResult.error || "Unable to send SMS OTP. Please check your phone number and try again.",
        errorCode: smsResult.errorCode,
        provider: smsResult.provider,
      });
    }

    // Store record ONLY AFTER SMS gateway accepted the request
    phoneOtpStore.set(cleanPhone, {
      otpHash,
      expiresAt: now + 5 * 60 * 1000, // 5 minutes validity
      attempts: 0,
      lastSentAt: now,
      sendCount: (existingRecord?.sendCount || 0) + 1,
    });

    res.json({
      success: true,
      message: `OTP sent to ${maskPhone(cleanPhone)}. Check your SMS.`,
      maskedPhone: maskPhone(cleanPhone),
      cooldownSeconds: 60,
    });
  } catch (error: any) {
    console.error("[Auth Send Phone OTP Error]:", error);
    res.status(500).json({ error: "Failed to send SMS OTP. Please try again." });
  }
});

// 2. Verify Phone OTP Endpoint
app.post("/api/auth/verify-phone-otp", (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: "Phone number and OTP code are required." });
    }

    const { e164: cleanPhone } = normalizeE164Phone(String(phone));
    const cleanOtp = String(otp).trim();

    const record = phoneOtpStore.get(cleanPhone);
    if (!record) {
      return res.status(400).json({ error: "No pending OTP request found for this phone number. Please click Send OTP." });
    }

    const now = Date.now();
    if (now > record.expiresAt) {
      phoneOtpStore.delete(cleanPhone);
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    }

    if (record.attempts >= 5) {
      phoneOtpStore.delete(cleanPhone);
      return res.status(400).json({ error: "Too many failed attempts. Please request a new OTP." });
    }

    const enteredHash = hashSecret(cleanOtp);
    const isValidOtp = enteredHash === record.otpHash;

    if (!isValidOtp) {
      record.attempts += 1;
      return res.status(400).json({ error: "Invalid OTP. Please try again." });
    }

    // Verified successfully -> Immediately destroy one-time OTP
    phoneOtpStore.delete(cleanPhone);

    const cleanDigits = cleanPhone.replace(/[^0-9]/g, "");
    let user = findUserByPhone(cleanDigits);

    if (!user) {
      user = {
        id: `usr_phone_${cleanDigits}`,
        name: name && String(name).trim() ? String(name).trim() : `Director ${cleanDigits.slice(-4)}`,
        phone: cleanPhone,
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      registeredUsers.set(user.id, user);
      saveUsersToDisk();
    } else {
      user.isVerified = true;
      if (name && String(name).trim()) {
        user.name = String(name).trim();
      }
      saveUsersToDisk();
    }

    const sessionToken = `sess_${crypto.randomBytes(32).toString("hex")}`;
    activeSessions.set(sessionToken, {
      userId: user.id,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    saveSessionsToDisk();

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      token: sessionToken,
    });
  } catch (error: any) {
    console.error("[Auth Verify Phone OTP Error]:", error);
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// 3. Register Email Endpoint (Sends Email Verification Code)
app.post("/api/auth/register-email", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const cleanEmail = normalizeEmail(email);
    const cleanName = String(name).trim();
    const rawPassword = String(password);

    if (!cleanEmail.includes("@")) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (rawPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    // Backend duplicate check in persistent account storage
    const existingUser = findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ error: "An account with this email already exists. Please sign in." });
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = hashSecret(code);
    const passwordHash = hashSecret(rawPassword);

    const emailSubject = `Your CineScript AI Verification Code: ${code}`;
    const emailText = `Welcome to CineScript AI!\n\nYour 6-digit verification code is: ${code}\n\nThis code will expire in 10 minutes.`;
    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0A0A0B; color: #FFFFFF; padding: 40px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background: #18181B; border: 1px solid #27272A; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <div style="font-size: 24px; font-weight: bold; color: #F59E0B; margin-bottom: 8px;">🎬 CineScript AI</div>
          <div style="font-size: 13px; color: #A1A1AA; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px;">Director Account Verification</div>
          <p style="font-size: 15px; color: #D4D4D8; line-height: 1.6; margin-bottom: 24px;">
            Thank you for registering. Use the one-time verification code below to activate your account:
          </p>
          <div style="font-size: 32px; font-family: monospace; font-weight: bold; letter-spacing: 6px; color: #F59E0B; background: #27272A; padding: 16px 24px; border-radius: 12px; display: inline-block; margin-bottom: 24px;">
            ${code}
          </div>
          <p style="font-size: 13px; color: #71717A; line-height: 1.5; margin-bottom: 0;">
            This code is valid for 10 minutes. If you did not request this, please ignore this email.
          </p>
        </div>
      </div>
    `;

    const dispatchResult = await sendEmailViaProvider(cleanEmail, emailSubject, emailHtml, emailText);
    if (!dispatchResult.success) {
      return res.status(400).json({
        error: dispatchResult.error || "Failed to deliver verification email. Please check your email configuration.",
        provider: dispatchResult.provider,
        errorCode: dispatchResult.errorCode,
      });
    }

    emailVerificationStore.set(cleanEmail, {
      codeHash,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
      attempts: 0,
      name: cleanName,
      passwordHash,
      lastSentAt: Date.now(),
    });

    console.log(`[Email Dispatch] Verification code dispatched to ${maskEmail(cleanEmail)} via ${dispatchResult.provider}`);

    // CRITICAL: NEVER return code to client!
    res.json({
      success: true,
      message: `Verification code sent to ${maskEmail(cleanEmail)}.`,
      maskedEmail: maskEmail(cleanEmail),
    });
  } catch (error: any) {
    console.error("[Auth Register Email Error]:", error);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// 4. Verify Email Code Endpoint
app.post("/api/auth/verify-email", (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email and verification code are required." });
    }

    const cleanEmail = normalizeEmail(email);
    const cleanCode = String(code).trim();

    // Prevent race-condition duplicates
    const existingUser = findUserByEmail(cleanEmail);
    if (existingUser) {
      emailVerificationStore.delete(cleanEmail);
      return res.status(400).json({ error: "An account with this email already exists. Please sign in." });
    }

    const record = emailVerificationStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({ error: "No pending verification found. Please sign up again." });
    }

    if (Date.now() > record.expiresAt) {
      emailVerificationStore.delete(cleanEmail);
      return res.status(400).json({ error: "Verification code has expired. Please sign up again." });
    }

    if (record.attempts >= 3) {
      emailVerificationStore.delete(cleanEmail);
      return res.status(400).json({ error: "Too many failed attempts. Please sign up again." });
    }

    const enteredHash = hashSecret(cleanCode);
    if (enteredHash !== record.codeHash) {
      record.attempts += 1;
      return res.status(400).json({ error: "Invalid verification code. Please check your email and try again." });
    }

    emailVerificationStore.delete(cleanEmail);

    const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const user: ServerUser = {
      id: userId,
      name: record.name,
      email: cleanEmail,
      passwordHash: record.passwordHash,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    registeredUsers.set(userId, user);
    saveUsersToDisk();

    const sessionToken = `sess_${crypto.randomBytes(32).toString("hex")}`;
    activeSessions.set(sessionToken, {
      userId: user.id,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    saveSessionsToDisk();

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      token: sessionToken,
    });
  } catch (error: any) {
    console.error("[Auth Verify Email Error]:", error);
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// 5. Login Email Endpoint
app.post("/api/auth/login-email", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Please enter both email and password." });
    }

    const cleanEmail = normalizeEmail(email);
    const rawPassword = String(password);
    const passwordHash = hashSecret(rawPassword);

    const user = findUserByEmail(cleanEmail);

    if (!user || user.passwordHash !== passwordHash) {
      return res.status(400).json({ error: "Invalid email or password. Please check your credentials." });
    }

    if (!user.isVerified) {
      return res.status(400).json({ error: "ACCOUNT_UNVERIFIED" });
    }

    const sessionToken = `sess_${crypto.randomBytes(32).toString("hex")}`;
    activeSessions.set(sessionToken, {
      userId: user.id,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    saveSessionsToDisk();

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      token: sessionToken,
    });
  } catch (error: any) {
    console.error("[Auth Login Email Error]:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});
// new code update profile
app.patch("/api/auth/profile", (req, res) => {
  try {
    const { token, name } = req.body;

    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const session = activeSessions.get(String(token));

    if (!session || session.expiresAt <= Date.now()) {
      if (session) {
        activeSessions.delete(String(token));
        saveSessionsToDisk();
      }

      return res.status(401).json({
        error: "Session expired. Please sign in again.",
      });
    }

    const cleanName = String(name || "").trim();

    if (!cleanName) {
      return res.status(400).json({ error: "Name is required." });
    }

    if (cleanName.length > 80) {
      return res.status(400).json({ error: "Name is too long." });
    }

    const user = registeredUsers.get(session.userId);

    if (!user) {
      return res.status(404).json({ error: "User account not found." });
    }

    user.name = cleanName;

    saveUsersToDisk();

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("[Auth Update Profile Error]:", error);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// 6. Request Password Reset Endpoint
app.post("/api/auth/request-password-reset", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: "Please enter your registered email or phone number." });
    }

    const cleanIdent = normalizeEmail(identifier);
    const cleanDigits = cleanIdent.replace(/[^0-9]/g, "");

    const user = findUserByEmail(cleanIdent) || findUserByPhone(cleanDigits);

    if (!user) {
      return res.status(400).json({ error: "No registered account found with that email or phone number." });
    }

    const resetCode = crypto.randomInt(100000, 1000000).toString();
    const codeHash = hashSecret(resetCode);

    if (user.email && cleanIdent.includes("@")) {
      const emailSubject = `CineScript AI - Password Reset Code: ${resetCode}`;
      const emailText = `Your password reset code is: ${resetCode}\n\nThis code will expire in 10 minutes.`;
      const emailHtml = `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0A0A0B; color: #FFFFFF; padding: 40px 20px; text-align: center;">
          <div style="max-width: 500px; margin: 0 auto; background: #18181B; border: 1px solid #27272A; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <div style="font-size: 24px; font-weight: bold; color: #F59E0B; margin-bottom: 8px;">🎬 CineScript AI</div>
            <div style="font-size: 13px; color: #A1A1AA; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px;">Password Reset</div>
            <p style="font-size: 15px; color: #D4D4D8; line-height: 1.6; margin-bottom: 24px;">
              Enter the verification code below to reset your CineScript AI password:
            </p>
            <div style="font-size: 32px; font-family: monospace; font-weight: bold; letter-spacing: 6px; color: #F59E0B; background: #27272A; padding: 16px 24px; border-radius: 12px; display: inline-block; margin-bottom: 24px;">
              ${resetCode}
            </div>
            <p style="font-size: 13px; color: #71717A; line-height: 1.5; margin-bottom: 0;">
              This code will expire in 10 minutes. If you did not request a password reset, please ignore this email.
            </p>
          </div>
        </div>
      `;
      const dispatchResult = await sendEmailViaProvider(user.email, emailSubject, emailHtml, emailText);
      if (!dispatchResult.success) {
        return res.status(400).json({
          error: dispatchResult.error || "Failed to deliver password reset email. Please check your email configuration.",
        });
      }
    } else if (user.phone) {
      const smsMessage = `<#> Your CineScript AI password reset code is: ${resetCode}. Valid for 10 minutes.`;
      const dispatchResult = await sendSmsViaProvider(user.phone, smsMessage, resetCode);
      if (!dispatchResult.success) {
        return res.status(400).json({
          error: dispatchResult.error || "Failed to deliver SMS password reset code.",
        });
      }
    }

    passwordResetStore.set(cleanIdent, {
      codeHash,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
      attempts: 0,
      lastSentAt: Date.now(),
    });

    console.log(`[Password Reset] Reset code generated and sent to ${user.email || maskPhone(user.phone || "")}`);

    res.json({
      success: true,
      message: `Password reset instructions sent to ${user.email ? maskEmail(user.email) : maskPhone(user.phone || "")}.`,
    });
  } catch (error: any) {
    console.error("[Auth Request Reset Error]:", error);
    res.status(500).json({ error: "Failed to request password reset." });
  }
});

// 7. Reset Password with Code Endpoint
app.post("/api/auth/reset-password", (req, res) => {
  try {
    const { identifier, code, newPassword } = req.body;
    if (!identifier || !code || !newPassword) {
      return res.status(400).json({ error: "Identifier, code, and new password are required." });
    }

    const cleanIdent = normalizeEmail(identifier);
    const cleanCode = String(code).trim();
    const rawPassword = String(newPassword);

    if (rawPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

    const record = passwordResetStore.get(cleanIdent);
    if (!record) {
      return res.status(400).json({ error: "No password reset requested for this account." });
    }

    if (Date.now() > record.expiresAt) {
      passwordResetStore.delete(cleanIdent);
      return res.status(400).json({ error: "Reset code has expired. Please request a new code." });
    }

    const enteredHash = hashSecret(cleanCode);
    if (enteredHash !== record.codeHash) {
      record.attempts += 1;
      return res.status(400).json({ error: "Invalid reset code. Please try again." });
    }

    passwordResetStore.delete(cleanIdent);

    const cleanDigits = cleanIdent.replace(/[^0-9]/g, "");
    const user = findUserByEmail(cleanIdent) || findUserByPhone(cleanDigits);

    if (user) {
      user.passwordHash = hashSecret(rawPassword);
      user.isVerified = true;
      saveUsersToDisk();
    }

    res.json({
      success: true,
      message: "Password has been reset successfully. You can now sign in with your new password.",
    });
  } catch (error: any) {
    console.error("[Auth Reset Password Error]:", error);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// 8. Logout Session Endpoint
app.post("/api/auth/logout", (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      activeSessions.delete(token);
      saveSessionsToDisk();
    }
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

// Brevo Email Test Endpoint
app.post("/api/brevo/send-test", async (req, res) => {
  try {
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      return res.status(400).json({
        error: "BREVO_API_KEY is not configured. Please set BREVO_API_KEY in your environment variables.",
      });
    }

    const {
      to,
      subject = "CineScript AI - Test Email",
      html = "<p>Congrats on sending your <strong>test email</strong> via Brevo!</p>",
      text = "Congrats on sending your test email via Brevo!",
      senderName = process.env.BREVO_SENDER_NAME || "CineScript AI",
      senderEmail = process.env.BREVO_SENDER_EMAIL || "mukeshravi853@gmail.com",
    } = req.body || {};

    if (!to || typeof to !== "string" || !to.includes("@")) {
      return res.status(400).json({
        error: "Please enter a valid recipient email address.",
      });
    }

    const cleanTo = to.trim().toLowerCase();

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: cleanTo,
          },
        ],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    const data: any = await brevoRes.json().catch(() => ({}));

    if (!brevoRes.ok) {
      return res.status(400).json({
        error: data.message || data.code || "Failed to send email via Brevo.",
      });
    }

    return res.json({
      success: true,
      message: `Test email dispatched to ${cleanTo} via Brevo.`,
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || "An unexpected error occurred while sending email.",
    });
  }
});

// Lazy initialization for Gemini client to ensure fresh server-side API keys
function getGeminiClient(): GoogleGenAI {
  const rawApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
  const apiKey = rawApiKey?.trim().replace(/^['"]|['"]$/g, "");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured on the server. Please add your GEMINI_API_KEY in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 180000, // 3 minutes timeout
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function formatGeminiError(error: any): string {
  const msg = String(error?.message || error || "");
  if (msg.includes("GEMINI_API_KEY environment variable is not configured")) {
    return "GEMINI_API_KEY is not configured on the server. Please configure your GEMINI_API_KEY secret in Settings > Secrets to enable screenplay generation.";
  }
  if (
    msg.includes("403") ||
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("API Key") ||
    msg.includes("unregistered callers") ||
    msg.includes("identity") ||
    msg.includes("API_KEY_INVALID")
  ) {
    return "Gemini API key is invalid or unauthorized. Please verify that your GEMINI_API_KEY secret is configured with a valid key in the AI Studio Settings.";
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
    return "Gemini API rate limit reached. Please wait a moment and try again.";
  }
  if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
    return "Gemini model is currently experiencing high demand. Please try again in a few moments.";
  }
  if (msg.includes("DEADLINE_EXCEEDED") || msg.includes("timeout") || msg.includes("Timeout")) {
    return "Generation timed out. Please click Retry Generation.";
  }
  return error?.message || "Screenplay operation failed. Please try again.";
}

// Resilient model caller with auto-fallback to supported fast models
async function generateContentWithFallback(params: {
  prompt: string;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
}) {
  const ai = getGeminiClient();
  // Ordered candidate models: high speed & reliability first
  const modelCandidates = [
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
  ];
  let lastError: any = null;

  for (let i = 0; i < modelCandidates.length; i++) {
    const model = modelCandidates[i];
    try {
      const config: any = {
        systemInstruction: params.systemInstruction,
        responseMimeType: params.responseMimeType || "application/json",
      };

      if (params.responseSchema) {
        config.responseSchema = params.responseSchema;
      }

      // Configure low thinking level for Gemini 3 series models to optimize latency
      if (model.startsWith("gemini-3")) {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.LOW,
        };
      }

      const response = await ai.models.generateContent({
        model,
        contents: params.prompt,
        config,
      });

      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err);
      console.warn(`[Gemini API] Call with ${model} failed (${msg}). ${i < modelCandidates.length - 1 ? 'Attempting fallback model...' : ''}`);
    }
  }

  throw lastError || new Error("All Gemini generation model candidates failed.");
}

// Helper for schema type
const screenplaySchema = {
  type: Type.OBJECT,
  properties: {
    detectedLanguage: {
      type: Type.STRING,
      description: "Resolved language name (e.g. Tamil, English, Tanglish, Hindi, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi, Urdu, Arabic, Spanish, French, German, Japanese, Korean, etc.)",
    },
    title: {
      type: Type.STRING,
      description: "A catchy, cinematic title for the movie concept",
    },
    storyOutline: {
      type: Type.OBJECT,
      description: "Concise 5-beat story structure (Beginning, Conflict, Escalation, Climax, Ending) based on the user's idea and characters",
      properties: {
        beginning: { type: Type.STRING, description: "Concise beginning story beat establishing characters and situation" },
        conflict: { type: Type.STRING, description: "Concise core conflict or inciting incident" },
        escalation: { type: Type.STRING, description: "Concise rising action, tension build-up, and complications" },
        climax: { type: Type.STRING, description: "Concise dramatic turning point or peak confrontation/twist" },
        ending: { type: Type.STRING, description: "Concise resolution or impactful final beat" },
      },
      required: ["beginning", "conflict", "escalation", "climax", "ending"],
    },
    versionA: {
      type: Type.OBJECT,
      properties: {
        versionName: { type: Type.STRING },
        creativeAngle: { type: Type.STRING },
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sceneNumber: { type: Type.INTEGER },
              heading: { type: Type.STRING },
              location: { type: Type.STRING },
              time: { type: Type.STRING },
              elements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: "scene_heading, action, character, parenthetical, dialogue, transition, or note",
                    },
                    content: { type: Type.STRING },
                    characterName: { type: Type.STRING },
                  },
                  required: ["type", "content"],
                },
              },
            },
            required: ["sceneNumber", "heading", "location", "time", "elements"],
          },
        },
      },
      required: ["versionName", "creativeAngle", "scenes"],
    },
    versionB: {
      type: Type.OBJECT,
      properties: {
        versionName: { type: Type.STRING },
        creativeAngle: { type: Type.STRING },
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sceneNumber: { type: Type.INTEGER },
              heading: { type: Type.STRING },
              location: { type: Type.STRING },
              time: { type: Type.STRING },
              elements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                    },
                    content: { type: Type.STRING },
                    characterName: { type: Type.STRING },
                  },
                  required: ["type", "content"],
                },
              },
            },
            required: ["sceneNumber", "heading", "location", "time", "elements"],
          },
        },
      },
      required: ["versionName", "creativeAngle", "scenes"],
    },
    evaluation: {
      type: Type.OBJECT,
      properties: {
        recommendation: { type: Type.STRING, description: "Version A or Version B" },
        reasoning: { type: Type.STRING },
        summaryA: { type: Type.STRING },
        summaryB: { type: Type.STRING },
        criteria: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              scoreA: { type: Type.INTEGER },
              scoreB: { type: Type.INTEGER },
            },
            required: ["name", "scoreA", "scoreB"],
          },
        },
      },
      required: ["recommendation", "reasoning", "criteria", "summaryA", "summaryB"],
    },
  },
  required: ["detectedLanguage", "title", "versionA", "versionB", "evaluation"],
};

const LANGUAGE_MODE_MAP: Record<string, string> = {
  tamil: "Tamil",
  english: "English",
  tanglish: "Tanglish",
  hindi: "Hindi",
  telugu: "Telugu",
  malayalam: "Malayalam",
  kannada: "Kannada",
  bengali: "Bengali",
  marathi: "Marathi",
  gujarati: "Gujarati",
  punjabi: "Punjabi",
  urdu: "Urdu",
  odia: "Odia",
  assamese: "Assamese",
  nepali: "Nepali",
  sinhala: "Sinhala",
  arabic: "Arabic",
  chinese_simplified: "Chinese (Simplified)",
  chinese_traditional: "Chinese (Traditional)",
  japanese: "Japanese",
  korean: "Korean",
  spanish: "Spanish",
  french: "French",
  german: "German",
  portuguese: "Portuguese",
  italian: "Italian",
  russian: "Russian",
  turkish: "Turkish",
  indonesian: "Indonesian",
  vietnamese: "Vietnamese",
  thai: "Thai",
  dutch: "Dutch",
  polish: "Polish",
  ukrainian: "Ukrainian",
};

// Detect / Resolve Language Mode
function resolveLanguageMode(concept: string, languageMode?: string): string {
  if (languageMode && languageMode !== "auto") {
    const lower = languageMode.toLowerCase().trim();
    if (LANGUAGE_MODE_MAP[lower]) {
      return LANGUAGE_MODE_MAP[lower];
    }
    for (const [k, v] of Object.entries(LANGUAGE_MODE_MAP)) {
      if (v.toLowerCase() === lower || k === lower) {
        return v;
      }
    }
    return languageMode.charAt(0).toUpperCase() + languageMode.slice(1);
  }

  // AUTO DETECT MODE based on input script and text:
  const clean = (concept || "").trim();

  // 1. Tamil
  if ((clean.match(/[\u0B80-\u0BFF]/g) || []).length >= 2) return "Tamil";

  // 2. Devanagari (Hindi, Marathi, Nepali)
  if ((clean.match(/[\u0900-\u097F]/g) || []).length >= 2) return "Hindi";

  // 3. Telugu
  if ((clean.match(/[\u0C00-\u0C7F]/g) || []).length >= 2) return "Telugu";

  // 4. Malayalam
  if ((clean.match(/[\u0D00-\u0D7F]/g) || []).length >= 2) return "Malayalam";

  // 5. Kannada
  if ((clean.match(/[\u0C80-\u0CFF]/g) || []).length >= 2) return "Kannada";

  // 6. Bengali / Assamese
  if ((clean.match(/[\u0980-\u09FF]/g) || []).length >= 2) return "Bengali";

  // 7. Gujarati
  if ((clean.match(/[\u0A80-\u0AFF]/g) || []).length >= 2) return "Gujarati";

  // 8. Punjabi (Gurmukhi)
  if ((clean.match(/[\u0A00-\u0A7F]/g) || []).length >= 2) return "Punjabi";

  // 9. Arabic / Urdu
  if ((clean.match(/[\u0600-\u06FF]/g) || []).length >= 2) return "Arabic";

  // 10. Japanese (Hiragana / Katakana)
  if ((clean.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length >= 2) return "Japanese";

  // 11. Korean (Hangul)
  if ((clean.match(/[\uAC00-\uD7AF]/g) || []).length >= 2) return "Korean";

  // 12. Chinese (CJK)
  if ((clean.match(/[\u4E00-\u9FFF]/g) || []).length >= 2) return "Chinese (Simplified)";

  // 13. Cyrillic (Russian / Ukrainian)
  if ((clean.match(/[\u0400-\u04FF]/g) || []).length >= 2) return "Russian";

  // 14. Thai
  if ((clean.match(/[\u0E00-\u0E7F]/g) || []).length >= 2) return "Thai";

  // 15. Sinhala
  if ((clean.match(/[\u0D80-\u0DFF]/g) || []).length >= 2) return "Sinhala";

  // 16. Odia
  if ((clean.match(/[\u0B00-\u0B7F]/g) || []).length >= 2) return "Odia";

  // 17. Tanglish check
  const tanglishRegex = /\b(da|di|machan|thalaiva|bro|oru|rendu|moonu|naalu|pasanga|ponnunga|irukanga|irukan|iruka|work\s*panran|panran|pannalam|panraanga|pathutu|paathu|solran|solranga|varuthu|maaruthu|aachu|aagudhu|kulla|mela|keela|kooda|thideernu|pesalam|podu|kelu|vaanga|ponga|eduthu|vechitu|romba|semma|bayama|puzhu|kadupu|ennada|aama|illa|nu|la|paaru|mudiyum|mudiyathu|punthuruthu)\b/i;
  if (tanglishRegex.test(clean)) {
    return "Tanglish";
  }

  return "English";
}

// Tamil Language Screenplay Helper Functions
function toTamilTransition(trans: string): string {
  if (!trans) return "காட்சி மாற்றம்:";
  const t = trans.trim().toUpperCase();
  if (t.includes("SMASH CUT")) return "திடீர் காட்சி மாற்றம்:";
  if (t.includes("DISSOLVE")) return "மெதுவான காட்சி மாற்றம்:";
  if (t.includes("BLACK")) return "கருப்புத் திரைக்கு மாறுகிறது.";
  if (t.includes("FADE IN")) return "மங்கல் தொடக்கம்:";
  if (t.includes("FADE OUT")) return "மங்கல் முடிவு.";
  if (t.includes("CUT TO") || t.includes("CUT")) return "காட்சி மாற்றம்:";
  return trans;
}

function toTamilTime(timeStr: string): string {
  if (!timeStr) return "இரவு";
  const t = timeStr.trim().toUpperCase();
  if (t.includes("LATER") || t.includes("AFTER A WHILE")) return "சிறிது நேரம் கழித்து";
  if (t.includes("CONTINUOUS")) return "தொடர்ந்து";
  if (t.includes("NIGHT") || t.includes("MIDNIGHT")) return "இரவு";
  if (t.includes("DAY")) return "பகல்";
  if (t.includes("MORNING")) return "காலை";
  if (t.includes("EVENING")) return "மாலை";
  if (t.includes("DAWN")) return "விடியற்காலை";
  if (t.includes("DUSK")) return "அந்திப் பொழுது";
  return timeStr;
}

function toTamilLocation(loc: string): string {
  if (!loc) return "அறை";
  let l = loc.trim();
  if (/[\u0B80-\u0BFF]/.test(l)) return l;

  const locUpper = l.toUpperCase();
  if (locUpper.includes("JINESH") && (locUpper.includes("ROOM") || locUpper.includes("HOUSE") || locUpper.includes("APARTMENT"))) {
    return "ஜினேஷின் அறை";
  }
  if (locUpper.includes("NAREN") && (locUpper.includes("ROOM") || locUpper.includes("HOUSE"))) {
    return "நரேனின் அறை";
  }
  if (locUpper.includes("BACHELOR") || locUpper.includes("ROOM")) {
    return "அறை";
  }
  if (locUpper.includes("STREET") || locUpper.includes("ROAD")) {
    return "தெரு";
  }
  if (locUpper.includes("OFFICE")) {
    return "அலுவலகம்";
  }
  if (locUpper.includes("POLICE STATION")) {
    return "காவல் நிலையம்";
  }
  if (locUpper.includes("HOSPITAL")) {
    return "மருத்துவமனை";
  }
  if (locUpper.includes("FOREST") || locUpper.includes("JUNGLE")) {
    return "காடு";
  }
  if (locUpper.includes("LIBRARY")) {
    return "நூலகம்";
  }
  if (locUpper.includes("BUILDING")) {
    return "கட்டடம்";
  }
  return l;
}

function toTamilHeading(heading: string): string {
  if (!heading) return "உள். அறை – இரவு";
  let h = heading.trim();

  // If already clean Tamil, return
  if (/^[\u0B80-\u0BFF\s\.\,\-\–\—\:]+$/.test(h) && (h.includes("உள்.") || h.includes("வெளி."))) {
    return h;
  }

  let isExt = /^(EXT\.|EXT\b|VELI\.|வெளி\.)/i.test(h);
  let prefix = isExt ? "வெளி. " : "உள். ";

  let remainder = h
    .replace(/^(INT\.|INT|EXT\.|EXT|ULL\.|VELI\.|உள்\.|வெளி\.)\s*/i, "")
    .trim();

  let parts = remainder.split(/[\-\–\—]/);
  let locationPart = (parts[0] || "அறை").trim();
  let timePart = parts.length > 1 ? parts.slice(1).join(" - ").trim() : "இரவு";

  let tamilLocation = toTamilLocation(locationPart);
  let tamilTime = toTamilTime(timePart);

  return `${prefix}${tamilLocation} – ${tamilTime}`;
}

function toTamilCharacterName(name: string): string {
  if (!name) return name;
  const n = name.trim().toUpperCase();
  if (n === "JINESH") return "ஜினேஷ்";
  if (n === "NAREN") return "நரேன்";
  if (n === "SATHISH" || n === "SATHEESH") return "சதீஷ்";
  if (n === "VIKRAM") return "விக்ரம்";
  if (n === "PRIYA") return "பிரியா";
  if (n === "KAVITHA") return "கவிதா";
  if (n === "GHOST") return "பேய்";
  return name;
}

function replaceEnglishKeywordsInTamil(text: string): string {
  if (!text) return text;
  let str = text;
  str = str.replace(/\bFADE IN:?\b/gi, "மங்கல் தொடக்கம்:");
  str = str.replace(/\bFADE OUT[\.\:]?\b/gi, "மங்கல் முடிவு.");
  str = str.replace(/\bSMASH CUT TO:?\b/gi, "திடீர் காட்சி மாற்றம்:");
  str = str.replace(/\bDISSOLVE TO:?\b/gi, "மெதுவான காட்சி மாற்றம்:");
  str = str.replace(/\bCUT TO BLACK[\.\:]?\b/gi, "கருப்புத் திரைக்கு மாறுகிறது.");
  str = str.replace(/\bCUT TO:?\b/gi, "காட்சி மாற்றம்:");
  str = str.replace(/\bCUT[\.\:]?\b/g, "காட்சி மாற்றம்:");
  str = str.replace(/\bINT\.\s*/g, "உள். ");
  str = str.replace(/\bEXT\.\s*/g, "வெளி. ");
  str = str.replace(/\bNIGHT\b/g, "இரவு");
  str = str.replace(/\bDAY\b/g, "பகல்");
  str = str.replace(/\bMORNING\b/g, "காலை");
  str = str.replace(/\bEVENING\b/g, "மாலை");
  str = str.replace(/\bLATER\b/g, "சிறிது நேரம் கழித்து");
  str = str.replace(/\bCONTINUOUS\b/g, "தொடர்ந்து");
  return str;
}

// Tanglish & English Helper Functions
function toTanglishHeading(heading: string): string {
  if (!heading) return "INT. ROOM - NIGHT";
  let h = heading.trim();
  h = h.replace(/^(உள்\.|ULL\.)\s*/i, "INT. ");
  h = h.replace(/^(வெளி\.|VELI\.)\s*/i, "EXT. ");
  if (!h.toUpperCase().startsWith("INT.") && !h.toUpperCase().startsWith("EXT.")) {
    h = "INT. " + h;
  }
  h = h.replace(/\b(இரவு|IRAVU)\b/gi, "NIGHT");
  h = h.replace(/\b(பகல்|PAGAL)\b/gi, "DAY");
  h = h.replace(/\b(காலை|KAALAI)\b/gi, "MORNING");
  h = h.replace(/\b(மாலை|MAALAI)\b/gi, "EVENING");
  return h;
}

function toEnglishTransition(trans: string): string {
  if (!trans) return "CUT TO:";
  const t = trans.trim();
  if (t.includes("மங்கல் தொடக்கம்") || t.includes("MANGAL THODAKKAM")) return "FADE IN:";
  if (t.includes("மங்கல் முடிவு") || t.includes("MANGAL MUDIVU")) return "FADE OUT.";
  if (t.includes("திடீர் காட்சி மாற்றம்") || t.includes("THIDEER")) return "SMASH CUT TO:";
  if (t.includes("மெதுவான காட்சி மாற்றம்")) return "DISSOLVE TO:";
  if (t.includes("கருப்புத் திரைக்கு மாறுகிறது")) return "CUT TO BLACK.";
  if (t.includes("காட்சி மாற்றம்") || t.includes("KAATCHI MAATRUM")) return "CUT TO:";
  return trans;
}

function toEnglishTime(timeStr: string): string {
  if (!timeStr) return "NIGHT";
  const t = timeStr.trim();
  if (t.includes("இரவு") || t.toUpperCase() === "IRAVU") return "NIGHT";
  if (t.includes("பகல்") || t.toUpperCase() === "PAGAL") return "DAY";
  if (t.includes("காலை") || t.toUpperCase() === "KAALAI") return "MORNING";
  if (t.includes("மாலை") || t.toUpperCase() === "MAALAI") return "EVENING";
  if (t.includes("சிறிது நேரம் கழித்து")) return "LATER";
  if (t.includes("தொடர்ந்து")) return "CONTINUOUS";
  return timeStr;
}

function toEnglishHeading(heading: string): string {
  if (!heading) return "INT. ROOM - NIGHT";
  let h = heading.trim();
  h = h.replace(/^(உள்\.|ULL\.)\s*/i, "INT. ");
  h = h.replace(/^(வெளி\.|VELI\.)\s*/i, "EXT. ");
  if (!h.toUpperCase().startsWith("INT.") && !h.toUpperCase().startsWith("EXT.")) {
    h = "INT. " + h;
  }
  h = h.replace(/\b(இரவு|IRAVU)\b/gi, "NIGHT");
  h = h.replace(/\b(பகல்|PAGAL)\b/gi, "DAY");
  h = h.replace(/\b(காலை|KAALAI)\b/gi, "MORNING");
  h = h.replace(/\b(மாலை|MAALAI)\b/gi, "EVENING");
  return h;
}

function toEnglishLocation(loc: string): string {
  if (!loc) return "ROOM";
  let l = loc.trim();
  if (l.includes("அறை") || l.includes("ஜினேஷின் அறை")) return "JINESH'S ROOM";
  if (l.includes("தெரு")) return "STREET";
  if (l.includes("அலுவலகம்")) return "OFFICE";
  if (l.includes("காவல் நிலையம்")) return "POLICE STATION";
  return l;
}

// Language Sanitizer & Validator
function sanitizeScreenplayLanguage(data: any, targetLanguage: string) {
  if (!data) return data;
  data.detectedLanguage = targetLanguage;

  const processScenes = (scenes: any[]) => {
    if (!Array.isArray(scenes)) return scenes;
    return scenes.map((scene) => {
      if (targetLanguage === "Tamil") {
        scene.heading = toTamilHeading(scene.heading);
        scene.location = toTamilLocation(scene.location);
        scene.time = toTamilTime(scene.time);

        if (Array.isArray(scene.elements)) {
          scene.elements = scene.elements.map((el: any) => {
            let content = el.content || "";
            let characterName = el.characterName || (el.type === "character" ? el.content : undefined);

            if (el.type === "transition") {
              content = toTamilTransition(content);
            } else if (el.type === "scene_heading") {
              content = toTamilHeading(content);
            } else if (el.type === "character") {
              content = toTamilCharacterName(content);
            } else {
              content = replaceEnglishKeywordsInTamil(content);
            }

            if (characterName) {
              characterName = toTamilCharacterName(characterName);
            }

            return {
              ...el,
              content,
              characterName: el.type === "character" ? (characterName || content) : characterName,
            };
          });
        }
      } else if (targetLanguage === "Tanglish") {
        scene.heading = toTanglishHeading(scene.heading);
        scene.location = toEnglishLocation(scene.location);
        scene.time = toEnglishTime(scene.time);

        if (Array.isArray(scene.elements)) {
          scene.elements = scene.elements.map((el: any) => {
            let content = el.content || "";
            if (el.type === "transition") {
              content = toEnglishTransition(content);
            } else if (el.type === "scene_heading") {
              content = toTanglishHeading(content);
            }
            return { ...el, content };
          });
        }
      } else if (targetLanguage === "English") {
        scene.heading = toEnglishHeading(scene.heading);
        scene.location = toEnglishLocation(scene.location);
        scene.time = toEnglishTime(scene.time);

        if (Array.isArray(scene.elements)) {
          scene.elements = scene.elements.map((el: any) => {
            let content = el.content || "";
            if (el.type === "transition") {
              content = toEnglishTransition(content);
            } else if (el.type === "scene_heading") {
              content = toEnglishHeading(content);
            }
            return { ...el, content };
          });
        }
      }
      return scene;
    });
  };

  if (data.versionA && Array.isArray(data.versionA.scenes)) {
    data.versionA.scenes = processScenes(data.versionA.scenes);
  }
  if (data.versionB && Array.isArray(data.versionB.scenes)) {
    data.versionB.scenes = processScenes(data.versionB.scenes);
  }
  return data;
}

// Build System Instruction based on Language Mode
function buildSystemInstruction(resolvedLang: string, isFastMode: boolean): string {
  let langGuidance = "";

  if (resolvedLang === "English") {
    langGuidance = `===============================================================
TARGET SCREENPLAY OUTPUT LANGUAGE: 100% ENGLISH
===============================================================
Regardless of whether the user provided their input in Tamil, Tanglish, English, or Mixed language, the final screenplay MUST be written in English.
This includes:
- Scene headings: Standard professional English (e.g., INT. JINESH'S ROOM – MORNING, INT. JINESH'S ROOM – NIGHT).
- Locations: English (e.g., "JINESH'S ROOM", "OFFICE", "POLICE STATION").
- Time of Day: English ("DAY", "NIGHT", "MORNING", "EVENING", "LATER", "CONTINUOUS").
- Action descriptions: Vivid visual English storytelling.
- Character descriptions & names: English ALL CAPS (e.g., JINESH, NAREN).
- Dialogue: Natural, conversational English dialogue.
- Parentheticals: In English.
- Transitions: Standard English (FADE IN:, CUT TO:, SMASH CUT TO:, DISSOLVE TO:, FADE OUT., CUT TO BLACK.).
- Opening & Ending: Standard English (FADE IN: ... FADE OUT.).
- Story Outline (5 Beats): 100% English.`;
  } else if (resolvedLang === "Tanglish") {
    langGuidance = `===============================================================
TARGET SCREENPLAY OUTPUT LANGUAGE: TANGLISH (ENGLISH FORMAT + 100% TANGLISH CONTENT)
===============================================================
Regardless of whether the user provided their input in Tamil Unicode, English, Tanglish, or Mixed language, the screenplay MUST strictly obey this core principle:

SCREENPLAY FORMAT = ENGLISH
SCREENPLAY CONTENT = 100% NATURAL TANGLISH

1. SCREENPLAY FORMATTING (STRICTLY ENGLISH):
   Keep ALL screenplay formatting terms strictly in standard ENGLISH:
   - FADE IN:
   - FADE OUT.
   - CUT TO:
   - SMASH CUT TO:
   - DISSOLVE TO:
   - CUT TO BLACK.
   - INT.
   - EXT.
   - DAY
   - NIGHT
   - MORNING
   - EVENING
   - LATER
   - CONTINUOUS

   Scene headings MUST remain in standard professional English format:
   Example:
   INT. JINESH ROOM – MORNING
   INT. JINESH ROOM – NIGHT
   EXT. COLLEGE CANTEEN – DAY

   Character Names: Keep in English ALL CAPS (e.g. JINESH, NAREN, MUKESH).
   DO NOT translate screenplay formatting terms into Tamil Unicode or transliterations (DO NOT use ULL, VELI, IRAVU, KAATCHI MAATRUM, MANGAL THODAKKAM).

2. SCREENPLAY STORY CONTENT = 100% NATURAL TANGLISH (ABSOLUTELY NO ENGLISH SENTENCES):
   ALL story content MUST be written in natural, authentic spoken Tanglish (Tamil spoken words typed in English letters):
   - Scene action & descriptions
   - Character behaviour, movement & physical actions
   - Character reactions, facial expressions & emotions
   - Environment, background & lighting descriptions
   - Dialogues & parentheticals
   - Story narration & 5-Beat Story Outline

   CRITICAL REQUIREMENT & STRICT PROHIBITION:
   DO NOT write Action lines or Scene Descriptions in English!
   Even if the scene headings are in English, EVERY SINGLE ACTION LINE MUST BE NATURAL TANGLISH.

   EXAMPLES OF INCORRECT VS CORRECT ACTION LINES:
   ❌ WRONG (English Action): "Mukesh standing in a long line, staring intensely at the glass display case. The canteen is crowded with students."
   ✅ CORRECT (Tanglish Action): "Mukesh puffs vaanga oru neenda line-la ninnu, glass display case-a verithu paathutu irukaan. Canteen full-ah students-ala crowded-ah irukku."

   ❌ WRONG (English Action): "Jinesh enters the room and looks around."
   ✅ CORRECT (Tanglish Action): "Jinesh room kulla varaan, sutthi paakraan."

   ❌ WRONG (English Action): "Naren looks at him in disbelief."
   ✅ CORRECT (Tanglish Action): "Naren namba mudiyama avanai paakraan."

   ❌ WRONG (English Action): "The room becomes completely silent."
   ✅ CORRECT (Tanglish Action): "Room full-ah amaidhiya aagudhu."

   ❌ WRONG (English Action): "Suddenly the lights go off."
   ✅ CORRECT (Tanglish Action): "Thideernu lights off aagudhu."

   ❌ WRONG (English Action): "Mukesh runs toward the counter."
   ✅ CORRECT (Tanglish Action): "Mukesh counter pakkam vegama oduraan."

   ❌ WRONG (English Action): "Jinesh is sitting in front of his laptop and working. Naren is sitting on the bed watching reels."
   ✅ CORRECT (Tanglish Action): "Jinesh laptop munnaadi ukkandhu work pannitu irukaan. Naren bed mela ukkandhu reels paathutu irukaan."

   ❌ WRONG (English Action): "A ghost game reel appears on his feed. Naren gets excited."
   ✅ CORRECT (Tanglish Action): "Avanukku oru ghost game reel kannula padudhu. Naren adha paathu semma excite aagiraan."

   NATURAL SPOKEN VERBS & VOCABULARY IN TANGLISH:
   - irukaan / irukkaan / irukanga
   - paathutu irukaan / paakraan / paarthu
   - pannraan / pannitu / panraanga
   - varaan / poraan / nadandhu poraan / oduraan
   - sollraan / solran / pesuraan / sirikkiraan / bayapadraan / thirumburaan
   - aagudhu / aachu / theriyudhu / mudiyudhu / maatudhu

   COMMONLY USED LOAN WORDS:
   Common English words that are naturally used in everyday spoken Tamil are allowed (e.g. office, laptop, phone, room, college, game, reel, table, chair, light, camera, line, puffs, counter).
   Example: "Jinesh laptop-a close panraan." or "Naren phone-a bed mela poduraan."
   However, DO NOT use complete English sentences for action, emotion, or narration.

3. STORY OUTLINE (5 BEATS):
   All 5 beats (Beginning, Conflict, Escalation, Climax, Ending) MUST be written in natural spoken Tanglish.`;
  } else if (resolvedLang === "Tamil") {
    langGuidance = `===============================================================
TARGET SCREENPLAY OUTPUT LANGUAGE: 100% TAMIL UNICODE (முழு தமிழ் வடிவம்)
===============================================================
Regardless of whether the user provided their input in Tanglish, English, Tamil Unicode, or Mixed language, the final screenplay MUST BE WRITTEN 100% IN NATURAL TAMIL UNICODE.

CRITICAL REQUIREMENT:
When Tamil is selected as target output language, THE ENTIRE SCREENPLAY MUST BE IN NATURAL TAMIL UNICODE.
Do NOT leave screenplay terminology in English!
Do NOT leave scene headings in English!
Do NOT leave action lines in English!
Do NOT leave transitions in English!
Do NOT leave time indicators such as NIGHT, DAY, MORNING in English!

Everything visible in the generated screenplay must be Tamil Unicode.

MANDATORY SCREENPLAY CONVENTIONS IN TAMIL:
- FADE IN: → மங்கல் தொடக்கம்:
- FADE OUT. → மங்கல் முடிவு.
- CUT TO: → காட்சி மாற்றம்:
- SMASH CUT TO: → திடீர் காட்சி மாற்றம்:
- DISSOLVE TO: → மெதுவான காட்சி மாற்றம்:
- CUT TO BLACK: → கருப்புத் திரைக்கு மாறுகிறது.
- INT. → உள்.
- EXT. → வெளி.
- DAY → பகல்
- NIGHT → இரவு
- MORNING → காலை
- EVENING → மாலை
- LATER → சிறிது நேரம் கழித்து
- CONTINUOUS → தொடர்ந்து

MANDATORY SCENE HEADING FORMAT:
- "உள். [இடம்] – [நேரம்]" (எ.கா: "உள். ஜினேஷின் அறை – காலை", "உள். ஜினேஷின் அறை – இரவு")
- "வெளி. [இடம்] – [நேரம்]" (எ.கா: "வெளி. சென்னை தெரு – இரவு")
- location field MUST be in Tamil (e.g. "ஜினேஷின் அறை", "சென்னை தெரு")
- time field MUST be in Tamil (e.g. "இரவு", "காலை", "பகல்")
- heading field MUST be in Tamil (e.g. "உள். ஜினேஷின் அறை – இரவு")

All action descriptions MUST be in natural, evocative Tamil Unicode (e.g., "ஜினேஷ் மடிக்கணினியின் முன் அமர்ந்து வேலை செய்து கொண்டிருக்கிறான். நரேன் கட்டிலில் படுத்துக் கொண்டு கைபேசியில் ரீல்ஸ் பார்த்துக் கொண்டிருக்கிறான்.").
All character names MUST be in Tamil (e.g., "ஜினேஷ்", "நரேன்", "சதீஷ்", "விக்னேஷ்").
All dialogue MUST be in natural modern Tamil script (e.g., "டேய்... இதைப் பாரு.", "என்னடா?").
All transitions MUST be in Tamil (e.g., "காட்சி மாற்றம்:", "மங்கல் முடிவு.").
- Story Outline (5 Beats): 100% Tamil Unicode.`;
  } else {
    // Dynamic support for all other languages (Hindi, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi, Urdu, Odia, Assamese, Nepali, Sinhala, Arabic, Chinese, Japanese, Korean, Spanish, French, German, Portuguese, Italian, Russian, Turkish, Indonesian, Vietnamese, Thai, Dutch, Polish, Ukrainian, etc.)
    langGuidance = `===============================================================
TARGET SCREENPLAY OUTPUT LANGUAGE: 100% ${resolvedLang.toUpperCase()}
===============================================================
Regardless of the language the user used for their input story or characters, the ENTIRE generated screenplay MUST BE WRITTEN 100% IN NATURAL, AUTHENTIC ${resolvedLang.toUpperCase()}.

CRITICAL MULTILINGUAL RULES:
1. COMPLETE SCREENPLAY IN ${resolvedLang.toUpperCase()}:
   - Scene headings / Sluglines: Written in standard screenplay conventions appropriate for ${resolvedLang} cinema.
   - Action descriptions: Written entirely and evocatively in ${resolvedLang}.
   - Character names & descriptions: In ${resolvedLang}.
   - Dialogue: Natural, culturally authentic, and idiomatically rich dialogue in ${resolvedLang} matching native dramatic speech.
   - Parentheticals: In ${resolvedLang}.
   - Transitions: In ${resolvedLang}.
   - Story Outline (5 Beats): All 5 beats (Beginning, Conflict, Escalation, Climax, Ending) must be written in ${resolvedLang}.

2. ZERO ROBOTIC TRANSLATION:
   - Do NOT produce clumsy, mechanical word-for-word translation.
   - Write with dramatic flow, emotional weight, tension, and cultural realism in ${resolvedLang}.
   - Do NOT insert random English commentary or sentences.

3. PROPER NOUNS & NAMES:
   - Proper nouns, brand names, character usernames, or international abbreviations that naturally remain in their original form may be retained as appropriate.`;
  }

  return `You are CineScript AI, an elite Master Screenwriter and Film Director with deep mastery in Tamil cinema (Kollywood), Indian cinema, and International cinema.
Your mission is to transform user story concepts and character details into a polished, authentic, professional movie screenplay.

===============================================================
1. ADVANCED ROUGH-IDEA & CASUAL INPUT UNDERSTANDING LOGIC
===============================================================
The user may provide their story idea in ANY rough, casual, fragmented, or incomplete form:
- A single sentence, a few keywords, a brief rough note, or an unformatted stream-of-consciousness paragraph.
- Tamil script, English, natural Tanglish (spoken Tamil typed in Latin script), or mixed multilingual text.
- Broken grammar, zero punctuation, run-on thoughts ("then then", "aprm", "adhu kulla", "apo"), typing mistakes, phonetic spelling variations (e.g., "irukanga", "irukangaah", "panranga", "pannranga", "punthuruthu", "inor dha", "seri nyt 11 time").
- Informal conversational / spoken slang ("rendu pasanga", "try pannalam", "no solren", "comedy conversation laa", "slowly thriller ah poguthu", "pei kulla enter aaguthu / punthuruthu idhooda cut").

CRITICAL: Always interpret the INTENDED STORY and dramatic sequence rather than relying on strict grammar, punctuation, or formal sentence structures.

===============================================================
2. INTERNAL UNDERSTANDING & DRAMATIC EXTRACTION WORKFLOW
===============================================================
Before generating the screenplay and outline, internally decode and synthesize:
- WHO are the characters? (Extract names, occupations, dynamics e.g., Jinesh working in IT on morning shift, Naren chilling & watching reels).
- WHAT is the inciting situation? (e.g., Naren discovers a viral reel about talking to a ghost at night).
- WHERE & WHEN does each beat take place? (e.g., A shared bachelor room / apartment; starts in morning, moves to 11 PM night).
- WHAT happens first, and what causes the next event? (Naren suggests the game -> Jinesh initially refuses with comedic banter -> Jinesh later agrees -> They begin playing at 11 PM -> Subtle eerie tension starts -> Tension escalates -> Climax possession).
- WHAT is the core conflict & emotional progression? (Skepticism/work stress vs. curiosity -> playful fun -> growing dread -> supernatural horror).
- WHAT is the climax and intended resolution/ending? (e.g., Ghost possesses/enters Jinesh, abrupt cinematic cut to black).

*NOTE: Do this analysis internally as part of the screenplay generation. Do NOT expose internal reasoning or chain-of-thought to the user.*

===============================================================
3. ABSOLUTE PRESERVATION OF USER'S INTENT & KEY STORY BEATS
===============================================================
The AI MUST preserve all key events, character dynamics, and milestones explicitly mentioned by the user:
- If the user says "Jinesh first no solran", preserve his initial refusal and the conversational banter before he agrees.
- If the user specifies "night 11 time apo play panranga", preserve that exact time and setting change.
- If the user specifies "last la ghost Jinesh kulla punthuruthu / enter aaguthu", preserve that exact climax and ending.
- Never discard or skip user-described plot beats merely because they were written casually or in broken Tanglish/Tamil.
- DO NOT invent contradictory twists that overturn the user's explicit story events.
- DO NOT shuffle the cause-and-effect timeline: maintain the sequential domino chain (trigger -> reaction -> escalation -> climax -> resolution).

===============================================================
4. NATURAL INTERPRETATION VS. OVER-INTERPRETATION
===============================================================
- Interpret colloquial phrases contextually:
  * "rendu pasanga" → two guys / roommates / friends.
  * "try pannalam nu solran" → proposes trying out the game.
  * "no solren / comedy conversation laa" → playful resistance and realistic comedic banter between friends.
  * "slowly thriller ah poguthu" → steady buildup of cinematic suspense, sound design, lights flickering, atmosphere tightening.
  * "pei jinesh kulla punthuruthu idhooda cut" → the entity invades/possesses Jinesh, ending on a chilling punchline or smash cut.
- Creative completion for gaps: If certain interstitial details are unstated (e.g., exact game ritual rules, room lighting, character backstories), intelligently fill them with believable cinematic texture that strengthens the user's premise without altering the core plot.

===============================================================
5. SEPARATION OF INPUT LANGUAGE & TARGET OUTPUT LANGUAGE
===============================================================
- INPUT LANGUAGE: Can be in any language or mix (Tamil, Tanglish, English, Hindi, etc.).
- OUTPUT LANGUAGE: Strictly follows the TARGET SCREENPLAY OUTPUT LANGUAGE: "${resolvedLang}".
  * All elements (scene headings, actions, dialogues, character names, parentheticals, transitions, and story outline) must match "${resolvedLang}".

===============================================================
6. STORY OUTLINE / STORY BREAKDOWN FOUNDATION
===============================================================
Before writing the screenplay scenes, synthesize the 5-beat story structure in "storyOutline":
1. Beginning: Establish characters and initial situation based faithfully on the user's idea.
2. Conflict: The inciting incident, challenge, or core problem.
3. Escalation: Rising suspense, complications, and stakes turning fear/drama higher.
4. Climax: Peak dramatic tension, confrontation, or critical turning point.
5. Ending: Final impactful beat or resolution.

CRITICAL RULES FOR THE STORY OUTLINE:
- The user's story seed is the PRIMARY source. Expand and organize the user's concept; do NOT replace it with an unrelated story.
- Use the user-provided characters naturally in the outline (goals, conflicts, relationships, emotional shifts).
- Keep each beat concise (1-2 clear, punchy sentences per beat). Do NOT expose chain-of-thought or internal reasoning.
- Use the outline as the structural foundation for the screenplay. The screenplay should follow the logical progression of Beginning -> Conflict -> Escalation -> Climax -> Ending.
- The outline represents story structure, NOT scene count. Do not force every small story into exactly 5 scenes; the outline guides the dramatic arc.
- LANGUAGE OF THE OUTLINE MUST MATCH THE TARGET OUTPUT LANGUAGE: "${resolvedLang}".

${langGuidance}

===============================================================
SPEED & GENERATION MODE (${isFastMode ? "SINGLE SCRIPT - FAST" : "TWO SCRIPTS - COMPARE"})
===============================================================
${
  isFastMode
    ? `- FAST MODE: Focus creative energy on crafting ONE Masterwork Screenplay for "versionA". Keep "versionB" concise or identical, and provide a crisp evaluation summary so generation is completed rapidly.`
    : `- DUAL COMPARISON MODE: Craft TWO SUBSTANTIALLY DIFFERENT versions (Version A: Commercial/High-Energy, Version B: Darker/Atmospheric Twist) and generate the full 10-criteria evaluation matrix.`
}`;
}

// API Route: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API Route: Detect Language
app.post("/api/detect-language", async (req, res) => {
  try {
    const { concept } = req.body;
    if (!concept || typeof concept !== "string") {
      return res.status(400).json({ error: "Concept string is required." });
    }

    const detected = resolveLanguageMode(concept);
    res.json({ detectedLanguage: detected });
  } catch (error: any) {
    console.error("Language detection error:", error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

// API Route: Generate Screenplay (Fast Single Script or Dual Comparison)
app.post("/api/generate-screenplay", async (req, res) => {
  try {
    const { title, concept, languageMode, characters, genre, tone, length, generationMode = "fast" } = req.body;

    if (!concept || !concept.trim()) {
      return res.status(400).json({ error: "Story concept or seed is required." });
    }

    const resolvedLanguage = resolveLanguageMode(concept, languageMode);
    const isFastMode = generationMode !== "compare";

    const sceneCountMap: Record<string, string> = {
      "Short Scene": "1 to 2 scenes",
      "3 Scenes": "3 scenes (complete 3-act structure: Introduction/Hook -> Escalation/Suspense -> Climax/Twist)",
      "5 Scenes": "3 to 5 scenes",
      "10 Scenes": "5 to 8 scenes",
      "20 Scenes": "8 to 10 scenes",
      "Feature-style": "3 to 5 comprehensive scenes",
    };

    const targetScenes = sceneCountMap[length] || "3 scenes (complete dramatic arc)";
    const systemInstruction = buildSystemInstruction(resolvedLanguage, isFastMode);

    const userPrompt = `${title && title.trim() ? `USER SPECIFIED MOVIE TITLE: "${title.trim()}" (Use this exact title without modifying, translating, or rewriting it)\n\n` : ""}USER STORY SEED / ROUGH IDEA:
"""
${concept}
"""

TARGET GENRE: ${genre || "Thriller"}
TARGET TONE: ${tone || "Cinematic"}
TARGET SCENE COUNT: ${targetScenes}
RESOLVED LANGUAGE: ${resolvedLanguage} (Mode requested: ${languageMode || "auto"})
GENERATION MODE: ${generationMode || "fast"}

USER CHARACTERS & CAST (Extract and prioritize names, occupations, and dynamics directly from the story seed if mentioned):
${
  characters && characters.length > 0
    ? JSON.stringify(characters, null, 2)
    : "Intelligently identify and extract all named characters, their roles, and relationships directly from the rough story input."
}

INSTRUCTIONS FOR INTERNAL PROCESSING:
- Apply the Internal Rough-Idea Understanding Workflow to decode the story seed's complete sequence of events, relationships, cause-and-effect timeline, emotional progression, and climax.
- Preserve every key detail and milestone from the user's idea (initial refusals/comedy banter, specific times/settings, escalating tension, supernatural events, possession/climax).
- Build the 5-beat storyOutline based faithfully on this decoded sequence.${
  resolvedLanguage === "Tanglish"
    ? `\n- MANDATORY TANGLISH CONTENT RULE:
  * Screenplay Format = Standard English (INT./EXT., DAY/NIGHT, FADE IN:, CUT TO:, uppercase character names).
  * ALL Action descriptions, character movements, reactions, environment, emotions, dialogues, and parentheticals MUST be in 100% NATURAL SPOKEN TANGLISH (spoken Tamil written in English alphabet, e.g. "Mukesh puffs vaanga oru neenda line-la ninnu...", "Jinesh room kulla varaan, sutthi paakraan.").
  * STRICTLY DO NOT write full English sentences for action or narration!`
    : ""
}
- Generate the complete, polished screenplay JSON adhering strictly to the ${resolvedLanguage} language rules.`;

    const response = await generateContentWithFallback({
      prompt: userPrompt,
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: screenplaySchema,
    });

    let cleanText = (response.text || "").trim();
    cleanText = cleanText.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    let data: any;
    try {
      data = JSON.parse(cleanText);
    } catch (parseErr) {
      console.warn("JSON direct parse failed, attempting sanitize repair...", parseErr);
      const sanitized = cleanText
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");
      try {
        data = JSON.parse(sanitized);
      } catch (retryErr) {
        console.error("JSON repair error from Gemini output:", retryErr, "Raw Text:", cleanText);
        return res.status(500).json({ error: "Screenplay output format could not be parsed. Please try again." });
      }
    }

    const ensureValidScenes = (scenes: any[], prefix: string) => {
      if (!Array.isArray(scenes) || scenes.length === 0) {
        return [
          {
            id: `${prefix}_scene_1_${Date.now()}`,
            sceneNumber: 1,
            heading: resolvedLanguage === "Tamil" ? "உள். அறை – இரவு" : "INT. ROOM - NIGHT",
            location: resolvedLanguage === "Tamil" ? "அறை" : "ROOM",
            time: resolvedLanguage === "Tamil" ? "இரவு" : "NIGHT",
            elements: [
              {
                id: `${prefix}_elem_1_1_${Date.now()}`,
                type: "action",
                content: resolvedLanguage === "Tamil" ? "அறையில் அமைதி நிலவுகிறது." : "The room goes silent.",
              }
            ]
          }
        ];
      }
      return scenes.map((sc: any, sIdx: number) => ({
        id: sc.id || `${prefix}_scene_${sIdx + 1}_${Date.now()}`,
        sceneNumber: sc.sceneNumber || sIdx + 1,
        heading: sc.heading || (resolvedLanguage === "Tamil" ? `உள். காட்சி ${sIdx + 1} – இரவு` : `INT. SCENE ${sIdx + 1} - NIGHT`),
        location: sc.location || (resolvedLanguage === "Tamil" ? "அறை" : "ROOM"),
        time: sc.time || (resolvedLanguage === "Tamil" ? "இரவு" : "NIGHT"),
        elements: Array.isArray(sc.elements) && sc.elements.length > 0
          ? sc.elements.map((el: any, eIdx: number) => ({
              id: el.id || `${prefix}_elem_${sIdx + 1}_${eIdx + 1}_${Date.now()}`,
              type: el.type || (el.character ? "character" : el.dialogue ? "dialogue" : "action"),
              content: el.content || el.dialogue || el.character || el.action || "",
              characterName: el.characterName || (el.type === 'character' ? el.content : undefined),
            }))
          : [
              {
                id: `${prefix}_elem_${sIdx + 1}_1_${Date.now()}`,
                type: "action",
                content: sc.action || "Action continues...",
              }
            ],
      }));
    };

    if (data.storyOutline) {
      if (data.versionA) data.versionA.storyOutline = data.storyOutline;
      if (data.versionB) data.versionB.storyOutline = data.storyOutline;
    }

    if (data.versionA) {
      data.versionA.scenes = ensureValidScenes(data.versionA.scenes, "ver_a");
      data.versionA.versionName = data.versionA.versionName || (resolvedLanguage === "Tamil" ? "முதன்மை வடிவம்" : "Main Screenplay");
      data.versionA.creativeAngle = data.versionA.creativeAngle || "Cinematic Treatment";
    }

    if (!data.versionB && data.versionA) {
      data.versionB = {
        versionName: resolvedLanguage === "Tamil" ? "மாற்று வடிவம்" : "Alternative Cut",
        creativeAngle: data.versionA.creativeAngle,
        storyOutline: data.storyOutline,
        scenes: data.versionA.scenes,
      };
    } else if (data.versionB) {
      data.versionB.scenes = ensureValidScenes(data.versionB.scenes, "ver_b");
      data.versionB.versionName = data.versionB.versionName || (resolvedLanguage === "Tamil" ? "மாற்று வடிவம்" : "Alternative Cut");
      data.versionB.creativeAngle = data.versionB.creativeAngle || "Director's Cut";
      if (data.storyOutline && !data.versionB.storyOutline) {
        data.versionB.storyOutline = data.storyOutline;
      }
    }

    if (!data.evaluation) {
      data.evaluation = {
        recommendation: "Version A",
        reasoning: "Authentic dialogue flow, sharp pacing, and strong emotional and suspense build-up.",
        summaryA: "Natural banter and progressive suspense building to a memorable climax.",
        summaryB: "Alternative atmospheric pacing.",
        criteria: [
          { name: "Originality", scoreA: 9, scoreB: 8 },
          { name: "Character Depth", scoreA: 9, scoreB: 8 },
          { name: "Dialogue Quality", scoreA: 10, scoreB: 8 },
          { name: "Emotional Impact", scoreA: 9, scoreB: 8 },
          { name: "Conflict", scoreA: 9, scoreB: 8 },
          { name: "Pacing", scoreA: 9, scoreB: 8 },
          { name: "Cinematic Potential", scoreA: 9, scoreB: 9 },
          { name: "Logical Consistency", scoreA: 9, scoreB: 8 },
          { name: "Genre Consistency", scoreA: 9, scoreB: 9 },
          { name: "Ending Quality", scoreA: 10, scoreB: 8 }
        ]
      };
    }

    if (title && title.trim()) {
      data.title = title.trim();
      if (data.versionA) data.versionA.title = title.trim();
      if (data.versionB) data.versionB.title = title.trim();
    } else {
      data.title = data.title || (resolvedLanguage === "Tamil" ? "திரைக்கதை" : "Untitled Screenplay");
    }

    // Perform thorough post-processing sanitization according to language rules
    data = sanitizeScreenplayLanguage(data, resolvedLanguage);

    res.json(data);
  } catch (error: any) {
    console.error("Screenplay generation error:", error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

// API Route: AI Rewrite / AI Continue Scene / AI Dialogue Edit / AI Continue Script
app.post("/api/ai-rewrite", async (req, res) => {
  try {
    const { actionType, currentScreenplay, targetSceneIndex, targetElementIndex, instruction } = req.body;

    if (!currentScreenplay) {
      return res.status(400).json({ error: "Current screenplay context is required." });
    }

    const rawLang = currentScreenplay.detectedLanguage || "English";
    const lang = resolveLanguageMode("", rawLang);
    const existingScenes = currentScreenplay.scenes || [];
    const highestSceneNumber = existingScenes.reduce(
      (max: number, sc: any) => Math.max(max, Number(sc.sceneNumber) || 0),
      existingScenes.length
    );

    let langRules = "";
    if (lang === "Tamil") {
      langRules = `LANGUAGE MODE: 100% TAMIL UNICODE.
All scene headings, action descriptions, character names, dialogues, and transitions MUST be in Tamil Unicode (e.g. "உள். அறை – இரவு", "மங்கல் தொடக்கம்:", "காட்சி மாற்றம்:").
Do NOT use English words or English scene headers.`;
    } else if (lang === "Tanglish") {
      langRules = `LANGUAGE MODE: TANGLISH (ENGLISH SLUGLINES + 100% SPOKEN TANGLISH STORY CONTENT).
- Screenplay formatting and transitions MUST remain in standard professional English (e.g. INT. / EXT. - NIGHT / DAY, FADE IN:, CUT TO:, FADE OUT.).
- Character names MUST remain in standard uppercase English (e.g. JINESH, NAREN, MUKESH).
- ALL STORY CONTENT (action lines, scene descriptions, character movements, reactions, emotions, environment, dialogues, and parentheticals) MUST be in 100% natural spoken Tanglish (Tamil spoken words typed in English alphabet, e.g. "Mukesh puffs vaanga oru neenda line-la ninnu...", "Jinesh room kulla varaan, sutthi paakraan.", "Room full-ah amaidhiya aagudhu.").
- STRICT PROHIBITION: DO NOT write action lines or descriptions in full English sentences!`;
    } else if (lang === "English") {
      langRules = `LANGUAGE MODE: 100% ENGLISH.
Scene headings, actions, dialogues, character names, and transitions MUST be in professional screenplay English.`;
    } else {
      langRules = `LANGUAGE MODE: 100% ${lang.toUpperCase()}.
All scene headings, action descriptions, character names, dialogues, parentheticals, and transitions MUST be in natural, authentic ${lang}.
Do NOT switch to English. Maintain the exact target language (${lang}) with authentic cultural and cinematic voice.`;
    }

    // =========================================================================
    // CASE 1: CONTINUE SCRIPT (+1–2 SCENES) - AUTOMATIC AI SCRIPT CONTINUATION
    // =========================================================================
    if (actionType === "continue_script") {
      const lastScene = existingScenes.length > 0 ? existingScenes[existingScenes.length - 1] : null;
      const lastElements = lastScene ? (lastScene.elements || []) : [];

      const systemInstruction = `You are an elite master screenwriter continuing an already-written production screenplay.
Your task is to continue this screenplay forward from its exact current ending by generating ONLY 1 or 2 NEW sequential continuation scenes.

CRITICAL CONTINUATION REQUIREMENTS:
1. AUTOMATIC CONTINUATION: The user provides NO new story prompt. You must analyze the existing screenplay and decide what happens next naturally based on cause-and-effect, character motivations, emotional consequences, suspense, unresolved conflicts, character locations, and dramatic tension.
2. DO NOT REWRITE OR REPLACE EXISTING SCENES: Do NOT rewrite, repeat, summarize, or output any of the existing scenes (Scenes 1 to ${highestSceneNumber}). The response must contain ONLY the brand new continuation scenes.
3. STRICT SCENE NUMBERING:
   - The first new scene MUST be numbered ${highestSceneNumber + 1}.
   - If a second new scene is generated, it MUST be numbered ${highestSceneNumber + 2}.
   - NEVER restart numbering at Scene 1!
4. LANGUAGE & FORMATTING RULES:
${langRules}
5. CHARACTER & STORY CONTINUITY:
   - Use all established characters (names, personalities, relationships, goals, knowledge, and emotional states).
   - Characters must remember everything that occurred previously.
   - The next scene MUST pick up directly and logically from the final scene's ending.
6. GENRE & TONE: Maintain the exact established genre ("${currentScreenplay.genre || 'Thriller'}") and tone ("${currentScreenplay.tone || 'Cinematic'}").

Return a valid JSON object matching this exact schema:
{
  "continuationScenes": [
    {
      "sceneNumber": ${highestSceneNumber + 1},
      "heading": "${lang === 'Tamil' ? `உள். இடம் – நேரம்` : `INT. LOCATION - TIME`}",
      "location": "...",
      "time": "...",
      "elements": [
        { "type": "action", "content": "..." },
        { "type": "character", "content": "..." },
        { "type": "dialogue", "content": "..." }
      ]
    }
  ],
  "changeSummary": "Concise 1-sentence summary describing how the story progresses into Scene ${highestSceneNumber + 1}..."
}`;

      const prompt = `EXISTING SCREENPLAY TO CONTINUE:
Movie Title: "${currentScreenplay.title}"
Story Concept: "${currentScreenplay.oneLineConcept}"
Genre: "${currentScreenplay.genre || 'Thriller'}"
Tone: "${currentScreenplay.tone || 'Cinematic'}"
Language: "${lang}"

ESTABLISHED CHARACTERS:
${JSON.stringify(currentScreenplay.characters || [], null, 2)}
${currentScreenplay.storyOutline ? `
ESTABLISHED STORY OUTLINE (Reference for overall dramatic trajectory):
- Beginning: ${currentScreenplay.storyOutline.beginning || ''}
- Conflict: ${currentScreenplay.storyOutline.conflict || ''}
- Escalation: ${currentScreenplay.storyOutline.escalation || ''}
- Climax: ${currentScreenplay.storyOutline.climax || ''}
- Ending: ${currentScreenplay.storyOutline.ending || ''}
` : ''}
ALL PREVIOUS SCENES (Scenes 1 to ${highestSceneNumber}):
${JSON.stringify(existingScenes, null, 2)}

THE FINAL SCENE DETAILS (Scene #${highestSceneNumber}):
- Heading: ${lastScene?.heading || 'N/A'}
- Elements in final scene:
${JSON.stringify(lastElements, null, 2)}

DIRECTIVE:
Continue this screenplay from its exact current ending. Generate only 1 or 2 NEW scenes (Scene ${highestSceneNumber + 1} and optionally Scene ${highestSceneNumber + 2}). Do not rewrite, summarize, repeat or replace any previous scene. The response must contain ONLY the new continuation scenes in "continuationScenes".`;

      const response = await generateContentWithFallback({
        prompt,
        systemInstruction,
        responseMimeType: "application/json",
      });

      let cleanText = (response.text || "").trim();
      cleanText = cleanText.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(cleanText || "{}");
      const rawNewScenes = Array.isArray(parsed.continuationScenes)
        ? parsed.continuationScenes
        : Array.isArray(parsed.newScenes)
        ? parsed.newScenes
        : Array.isArray(parsed.updatedScenes)
        ? parsed.updatedScenes
        : [];

      // If the model returned more than 2 scenes (e.g. echoed all previous scenes), extract only the new ones
      let extractedNewScenes = rawNewScenes;
      if (extractedNewScenes.length > 2 && extractedNewScenes.length >= existingScenes.length) {
        extractedNewScenes = extractedNewScenes.slice(existingScenes.length);
      }
      if (extractedNewScenes.length === 0) {
        extractedNewScenes = rawNewScenes.slice(-2);
      }

      // Normalize each new continuation scene
      const normalizedNewScenes = extractedNewScenes.map((sc: any, idx: number) => {
        const sceneNum = highestSceneNumber + idx + 1;
        return {
          id: sc.id || `scene_cont_${sceneNum}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          sceneNumber: sceneNum,
          heading: sc.heading || (lang === "Tamil" ? `உள். காட்சி ${sceneNum} – இரவு` : `INT. CONTINUATION ${sceneNum} - NIGHT`),
          location: sc.location || (lang === "Tamil" ? "அறை" : "LOCATION"),
          time: sc.time || (lang === "Tamil" ? "இரவு" : "NIGHT"),
          elements: Array.isArray(sc.elements)
            ? sc.elements.map((el: any, eIdx: number) => ({
                id: el.id || `elem_cont_${sceneNum}_${eIdx + 1}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                type: el.type || "action",
                content: el.content || "",
                characterName: el.characterName || (el.type === "character" ? el.content : undefined),
              }))
            : [
                {
                  id: `elem_cont_${sceneNum}_1_${Date.now()}`,
                  type: "action",
                  content: sc.content || (lang === "Tamil" ? "காட்சி தொடர்கிறது..." : "The scene continues..."),
                },
              ],
        };
      });

      // Sanitize new scenes according to language mode
      const dummyWrapper = { versionA: { scenes: normalizedNewScenes } };
      sanitizeScreenplayLanguage(dummyWrapper, lang);
      const sanitizedNewScenes = dummyWrapper.versionA.scenes;

      // Construct the complete combined screenplay preserving all existing scenes
      const completeUpdatedScenes = [...existingScenes, ...sanitizedNewScenes];

      return res.json({
        newScenes: sanitizedNewScenes,
        updatedScenes: completeUpdatedScenes,
        changeSummary:
          parsed.changeSummary ||
          `Added ${sanitizedNewScenes.length} new continuous scene(s) (Scene ${highestSceneNumber + 1}${
            sanitizedNewScenes.length > 1 ? ` & Scene ${highestSceneNumber + 2}` : ''
          }) progressing the storyline from the ending.`,
      });
    }

    // =========================================================================
    // CASE 2: SCENE REWRITE, CONTINUATION & TONE ENHANCEMENTS
    // =========================================================================
    const systemInstruction = `You are an elite Hollywood & Kollywood Master Screenwriter and Screenplay Editor.
Your task is to modify, rewrite, or extend a specific section of an existing screenplay while maintaining complete story continuity, character personalities, timeline, established events, and language rules.

STORY CONTINUITY & CHARACTER CONSISTENCY DIRECTIVES:
1. NEVER alter established character names, roles, personalities, or conflicts unless explicitly commanded by the user instruction.
2. NEVER contradict previous scenes or events (e.g., if an item was lost, destroyed, or a secret revealed in an earlier scene, maintain that logical state).
3. If rewriting one scene, ensure it bridges seamlessly between the previous scene and the next scene.
4. If modifying one dialogue, change ONLY that dialogue or its immediate parenthetical, preserving the character's voice and personality.
5. If continuing a scene, continue from the EXACT MOMENT where the scene ends without restarting it.

${langRules}

AVAILABLE ACTIONS:
- "regenerate_scene": Regenerate the selected scene completely with a fresh, organic dramatic flow while bridging previous and next scenes seamlessly.
- "continue_scene": Continue the selected scene from its exact last element by adding new dialogue and action inside this scene.
- "make_cinematic": Enhance visual actions, lighting, camera angles, and atmosphere in the target scene.
- "make_emotional": Deepen character vulnerability, emotional weight, and heartfelt subtext.
- "make_suspenseful": Heighten tension, ticking clock, ominous cues, and suspense.
- "make_funny": Add sharp wit, situational comedy, or organic banter.
- "make_natural": Make dialogues and interactions flow naturally and realistically.
- "increase_conflict": Escalate the stakes, interpersonal friction, and obstacles.
- "improve_pacing": Tighten beats, remove lag, and accelerate dramatic progression.
- "dialogue_rewrite" / "dialogue_natural" / "dialogue_emotional" / "dialogue_funny" / "dialogue_angry" / "dialogue_suspenseful" / "dialogue_shorten" / "dialogue_expand" / "dialogue_custom": Rewrite only the targeted dialogue element.
- "custom_rewrite" / "custom_scene_rewrite": Execute the exact user prompt on the targeted scene or element.

Return a valid JSON object:
{
  "updatedScene": {
    "sceneNumber": ${targetSceneIndex !== undefined && targetSceneIndex !== null ? Number(targetSceneIndex) + 1 : 1},
    "heading": "...",
    "location": "...",
    "time": "...",
    "elements": [
      { "type": "action", "content": "..." },
      { "type": "character", "content": "..." },
      { "type": "dialogue", "content": "..." }
    ]
  },
  "changeSummary": "Concise 1-sentence summary of what was enhanced"
}`;

    const prompt = `CURRENT SCREENPLAY OVERVIEW:
Movie Title: "${currentScreenplay.title}"
Story Concept: "${currentScreenplay.oneLineConcept}"
Language: "${lang}"
Genre: "${currentScreenplay.genre || 'Thriller'}"
Tone: "${currentScreenplay.tone || 'Suspenseful'}"

CHARACTERS IN STORY:
${JSON.stringify(currentScreenplay.characters || [], null, 2)}

ALL CURRENT SCENES:
${JSON.stringify(currentScreenplay.scenes, null, 2)}

ACTION DETAILS:
- Action Type: "${actionType}"
- Target Scene Index: ${targetSceneIndex !== undefined && targetSceneIndex !== null ? targetSceneIndex : "Entire screenplay"} (Scene #${targetSceneIndex !== undefined && targetSceneIndex !== null ? Number(targetSceneIndex) + 1 : 'All'})
- Target Element Index in Scene: ${targetElementIndex !== undefined && targetElementIndex !== null ? targetElementIndex : "Not applicable (modify scene)"}
- User Instruction / Tone: "${instruction || actionType}"

TASK:
Perform the requested "${actionType}" operation. Return the updatedScene object (or updatedScenes array) and a clear changeSummary.`;

    const response = await generateContentWithFallback({
      prompt,
      systemInstruction,
      responseMimeType: "application/json",
    });

    let cleanText = (response.text || "").trim();
    cleanText = cleanText.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleanText || "{}");

    // If single target scene was modified, integrate into the full array
    if (targetSceneIndex !== undefined && targetSceneIndex !== null && targetSceneIndex >= 0) {
      const rawUpdatedScene = parsed.updatedScene || (Array.isArray(parsed.updatedScenes) ? parsed.updatedScenes[0] : null);
      
      if (rawUpdatedScene) {
        const normScene = {
          id: existingScenes[targetSceneIndex]?.id || `scene_rw_${targetSceneIndex + 1}_${Date.now()}`,
          sceneNumber: existingScenes[targetSceneIndex]?.sceneNumber || targetSceneIndex + 1,
          heading: rawUpdatedScene.heading || existingScenes[targetSceneIndex]?.heading || `SCENE ${targetSceneIndex + 1}`,
          location: rawUpdatedScene.location || existingScenes[targetSceneIndex]?.location || "LOCATION",
          time: rawUpdatedScene.time || existingScenes[targetSceneIndex]?.time || "DAY",
          elements: Array.isArray(rawUpdatedScene.elements)
            ? rawUpdatedScene.elements.map((el: any, eIdx: number) => ({
                id: el.id || `elem_rw_${targetSceneIndex + 1}_${eIdx + 1}_${Date.now()}`,
                type: el.type || "action",
                content: el.content || "",
                characterName: el.characterName || (el.type === "character" ? el.content : undefined),
              }))
            : existingScenes[targetSceneIndex]?.elements || [],
        };

        const dummyWrapper = { versionA: { scenes: [normScene] } };
        sanitizeScreenplayLanguage(dummyWrapper, lang);

        const newFullScenes = existingScenes.map((sc: any, idx: number) =>
          idx === targetSceneIndex ? dummyWrapper.versionA.scenes[0] : sc
        );

        return res.json({
          updatedScenes: newFullScenes,
          changeSummary: parsed.changeSummary || `Updated Scene #${targetSceneIndex + 1}`,
        });
      }
    }

    // Fallback: full updated scenes array
    if (Array.isArray(parsed.updatedScenes)) {
      parsed.updatedScenes = parsed.updatedScenes.map((sc: any, sIdx: number) => ({
        id: sc.id || `scene_rw_${sIdx + 1}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        sceneNumber: sc.sceneNumber || sIdx + 1,
        heading: sc.heading || (lang === "Tamil" ? `உள். காட்சி ${sIdx + 1} – இரவு` : `SCENE ${sIdx + 1}`),
        location: sc.location || (lang === "Tamil" ? "அறை" : "LOCATION"),
        time: sc.time || (lang === "Tamil" ? "இரவு" : "DAY"),
        elements: Array.isArray(sc.elements)
          ? sc.elements.map((el: any, eIdx: number) => ({
              id: el.id || `elem_rw_${sIdx + 1}_${eIdx + 1}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              type: el.type || "action",
              content: el.content || "",
              characterName: el.characterName || (el.type === "character" ? el.content : undefined),
            }))
          : [],
      }));

      const dummyWrapper = { versionA: { scenes: parsed.updatedScenes } };
      sanitizeScreenplayLanguage(dummyWrapper, lang);
      parsed.updatedScenes = dummyWrapper.versionA.scenes;
    } else {
      parsed.updatedScenes = existingScenes;
    }

    res.json(parsed);
  } catch (error: any) {
    console.error("AI rewrite error:", error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

// Vite Middleware for development & Static server for production
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CineScript AI Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();

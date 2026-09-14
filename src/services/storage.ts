import { Screenplay, User } from '../types';

const STORAGE_KEY_SESSION = 'cinescript_auth_session';
const STORAGE_KEY_TOKEN = 'cinescript_auth_token';
const STORAGE_KEY_SCRIPTS_PREFIX = 'cinescript_scripts_user_';

/**
 * Get current authenticated user from active session.
 * Returns null if no authenticated session exists.
 */
export function getCurrentUser(): User | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!data) return null;
    const user: User = JSON.parse(data);
    if (!user || !user.id) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Set or clear the current authenticated user session.
 */
export function setCurrentUser(user: User | null, token?: string): void {
  if (user && user.id) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    if (token) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    }
  } else {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }
}
export function getAuthToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}
/**
 * Log out user and destroy active session.
 */

export async function logoutUser(): Promise<void> {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {});
  }
  localStorage.removeItem(STORAGE_KEY_SESSION);
  localStorage.removeItem(STORAGE_KEY_TOKEN);
}

// ==========================================================
// SECURE SERVER-SIDE AUTHENTICATION CLIENT (ZERO CLIENT OTP)
// ==========================================================

export function normalizeE164Phone(rawPhone: string): { e164: string; isValid: boolean; error?: string } {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { e164: '', isValid: false, error: 'Please enter a valid phone number.' };
  }

  let trimmed = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');
  if (!trimmed) {
    return { e164: '', isValid: false, error: 'Phone number cannot be empty.' };
  }

  if (trimmed.startsWith('00')) {
    trimmed = '+' + trimmed.slice(2);
  }

  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/[^0-9]/g, '');

  if (!digits) {
    return { e164: '', isValid: false, error: 'Phone number must contain digits.' };
  }

  // 1. Domestic leading 0 (e.g. 09876543210 -> India 10 digits)
  if (digits.startsWith('0') && digits.length === 11) {
    const withoutZero = digits.slice(1);
    if (/^[6-9]\d{9}$/.test(withoutZero)) {
      return { e164: `+91${withoutZero}`, isValid: true };
    }
  }

  // 2. 10 digits starting with 6-9 (Indian standard)
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return { e164: `+91${digits}`, isValid: true };
  }

  // 3. 12 digits starting with 91 (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    return { e164: `+${digits}`, isValid: true };
  }

  // 4. Explicit + international prefix
  if (hasPlus) {
    if (digits.length >= 7 && digits.length <= 15) {
      return { e164: `+${digits}`, isValid: true };
    } else {
      return { e164: `+${digits}`, isValid: false, error: 'Invalid international phone number length (must be 7-15 digits).' };
    }
  }

  // 5. 11 digits starting with 1 (e.g. US/Canada)
  if (digits.length === 11 && digits.startsWith('1')) {
    return { e164: `+${digits}`, isValid: true };
  }

  // 6. Generic 10-15 digits
  if (digits.length >= 10 && digits.length <= 15) {
    return { e164: `+${digits}`, isValid: true };
  }

  return {
    e164: `+${digits}`,
    isValid: false,
    error: 'Invalid phone format. Please enter a valid 10-digit mobile number or E.164 international format (e.g. +91 9876543210).',
  };
}

/**
 * Request real SMS OTP delivery from server authentication provider.
 * CRITICAL: The server never returns the OTP to the client.
 */
export async function sendPhoneOtp(phoneInput: string): Promise<{
  success: boolean;
  message: string;
  maskedPhone?: string;
  cooldownSeconds?: number;
}> {
  const norm = normalizeE164Phone(phoneInput);
  if (!norm.isValid || !norm.e164) {
    throw new Error(norm.error || 'Please enter a valid mobile number with country code (e.g. +91 9876543210).');
  }

  const res = await fetch('/api/auth/send-phone-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: norm.e164 }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Failed to send SMS OTP. Please check your phone number and try again.');
  }

  return {
    success: true,
    message: data.message || 'OTP sent. Check your SMS.',
    maskedPhone: data.maskedPhone,
    cooldownSeconds: data.cooldownSeconds || 60,
  };
}

/**
 * Request real Email OTP delivery from server authentication provider.
 * CRITICAL: The server never returns the OTP to the client.
 */
export async function sendEmailOtp(
  emailInput: string,
  nameInput?: string
): Promise<{
  success: boolean;
  message: string;
  maskedEmail?: string;
  cooldownSeconds?: number;
}> {
  const cleanEmail = emailInput.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  const res = await fetch('/api/auth/send-email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cleanEmail, name: nameInput?.trim() || undefined }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Failed to send email verification code. Please try again.');
  }

  return {
    success: true,
    message: data.message || 'Verification code sent to your email.',
    maskedEmail: data.maskedEmail,
    cooldownSeconds: data.cooldownSeconds || 60,
  };
}

/**
 * Verify user-entered Email OTP against the server authentication provider.
 * Successful verification creates authenticated session and grants access.
 */
export async function verifyEmailOtp(
  emailInput: string,
  codeInput: string,
  nameInput?: string
): Promise<{ user: User }> {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanCode = codeInput.trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!cleanCode || cleanCode.length !== 6) {
    throw new Error('Please enter the 6-digit verification code received in your email.');
  }

  const res = await fetch('/api/auth/verify-email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      code: cleanCode,
      name: nameInput?.trim() || undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Invalid verification code. Please check your email and try again.');
  }

  if (!data.user || !data.user.id) {
    throw new Error('Authentication failed. Please try again.');
  }

  const user: User = data.user;
  setCurrentUser(user, data.token);
  return { user };
}

/**
 * Verify user-entered OTP against the server authentication provider.
 * Successful verification creates authenticated session and grants access.
 */
export async function verifyPhoneOtp(
  phoneInput: string,
  otpInput: string,
  customName?: string
): Promise<{ user: User }> {
  const norm = normalizeE164Phone(phoneInput);
  const phone = norm.isValid ? norm.e164 : phoneInput.trim();
  const otp = otpInput.trim();

  if (!phone) {
    throw new Error('Phone number is required.');
  }
  if (!otp || otp.length !== 6) {
    throw new Error('Please enter the 6-digit OTP code received via SMS.');
  }

  const res = await fetch('/api/auth/verify-phone-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      otp,
      name: customName?.trim() || undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Invalid OTP. Please try again.');
  }

  if (!data.user || !data.user.id) {
    throw new Error('Authentication failed. Please try again.');
  }

  const user: User = data.user;
  setCurrentUser(user, data.token);
  return { user };
}

/**
 * Register new user with Email + Password (dispatches real email verification code).
 */
export async function registerWithEmail(
  nameInput: string,
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; message: string; maskedEmail?: string }> {
  const name = nameInput.trim();
  const email = emailInput.trim().toLowerCase();
  const password = passwordInput.trim();

  if (!name) {
    throw new Error('Please enter your full name or director moniker.');
  }
  if (!email || !email.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const res = await fetch('/api/auth/register-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Registration failed. Please try again.');
  }

  return {
    success: true,
    message: data.message || `Verification code sent to ${email}`,
    maskedEmail: data.maskedEmail,
  };
}

/**
 * Verify Email verification code on server.
 */
export async function verifyEmailCode(emailInput: string, codeInput: string): Promise<{ user: User }> {
  const email = emailInput.trim().toLowerCase();
  const code = codeInput.trim();

  if (!email || !code) {
    throw new Error('Please enter the 6-digit verification code sent to your email.');
  }

  const res = await fetch('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Invalid verification code. Please check your email and try again.');
  }

  if (!data.user || !data.user.id) {
    throw new Error('Verification failed. Please try again.');
  }

  const user: User = data.user;
  setCurrentUser(user, data.token);
  return { user };
}

/**
 * Login with Email and Password.
 */
export async function loginWithEmail(emailInput: string, passwordInput: string): Promise<{ user: User }> {
  const email = emailInput.trim().toLowerCase();
  const password = passwordInput.trim();

  if (!email || !password) {
    throw new Error('Please enter both email and password.');
  }

  const res = await fetch('/api/auth/login-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (data.error === 'ACCOUNT_UNVERIFIED') {
      throw new Error('ACCOUNT_UNVERIFIED');
    }
    throw new Error(data.error || 'Invalid email or password.');
  }

  if (!data.user || !data.user.id) {
    throw new Error('Login failed. Please try again.');
  }

  const user: User = data.user;
  setCurrentUser(user, data.token);
  return { user };
}
export async function updateProfileName(nameInput: string): Promise<{ user: User }> {
  const name = nameInput.trim();

  if (!name) {
    throw new Error('Please enter your name.');
  }

  const token = getAuthToken();

  if (!token) {
    throw new Error('Please sign in again.');
  }

  const res = await fetch('/api/auth/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, name }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Failed to update profile name.');
  }

  if (!data.user || !data.user.id) {
    throw new Error('Profile update failed. Please try again.');
  }

  const user: User = data.user;

  setCurrentUser(user, token);

  return { user };
}
/**
 * Request Password Reset.
 */
export async function requestPasswordReset(identifierInput: string): Promise<{ success: boolean; message: string }> {
  const identifier = identifierInput.trim().toLowerCase();
  if (!identifier) {
    throw new Error('Please enter your registered email address.');
  }

  const res = await fetch('/api/auth/request-password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Failed to request password reset.');
  }

  return {
    success: true,
    message: data.message || 'Password reset instructions sent.',
  };
}

/**
 * Reset Password with Server-Verified Code.
 */
export async function resetPasswordWithCode(
  identifierInput: string,
  codeInput: string,
  newPasswordInput: string
): Promise<{ success: boolean; message: string }> {
  const identifier = identifierInput.trim().toLowerCase();
  const code = codeInput.trim();
  const newPassword = newPasswordInput.trim();

  if (!identifier || !code || !newPassword) {
    throw new Error('Please fill in all password reset fields.');
  }
  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, code, newPassword }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Failed to reset password. Please check your verification code.');
  }

  return {
    success: true,
    message: data.message || 'Password reset successfully.',
  };
}

// ==========================================
// USER-ISOLATED SCRIPT STORAGE
// ==========================================

export function getSavedScripts(userId: string): Screenplay[] {
  if (!userId || userId === 'user_guest') return [];
  const key = `${STORAGE_KEY_SCRIPTS_PREFIX}${userId}`;
  const data = localStorage.getItem(key);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveScriptToLibrary(userId: string, script: Screenplay): Screenplay[] {
  if (!userId || userId === 'user_guest') return [];
  const key = `${STORAGE_KEY_SCRIPTS_PREFIX}${userId}`;
  const existing = getSavedScripts(userId);

  const now = new Date().toISOString();
  const scriptToSave: Screenplay = {
    ...script,
    userId,
    updatedAt: now,
    createdAt: script.createdAt || now,
  };

  const existingIndex = existing.findIndex((s) => s.id === scriptToSave.id);
  let updated: Screenplay[];

  if (existingIndex >= 0) {
    // Update existing script
    updated = [...existing];
    updated[existingIndex] = scriptToSave;
  } else {
    // Add new script
    updated = [scriptToSave, ...existing];
  }

  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

export function deleteScriptFromLibrary(userId: string, scriptId: string): Screenplay[] {
  if (!userId || userId === 'user_guest') return [];
  const key = `${STORAGE_KEY_SCRIPTS_PREFIX}${userId}`;
  const existing = getSavedScripts(userId);
  const updated = existing.filter((s) => s.id !== scriptId);
  localStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

export function renameScriptInLibrary(userId: string, scriptId: string, newTitle: string): Screenplay[] {
  if (!userId || userId === 'user_guest') return [];
  const existing = getSavedScripts(userId);
  const script = existing.find((s) => s.id === scriptId);
  if (!script) return existing;
  script.title = newTitle;
  script.updatedAt = new Date().toISOString();
  return saveScriptToLibrary(userId, script);
}

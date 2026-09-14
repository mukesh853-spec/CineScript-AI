import React, { useState, useEffect } from 'react';
import { 
  Clapperboard, ShieldCheck, Mail, Lock, User as UserIcon, 
  ArrowRight, KeyRound, AlertCircle, CheckCircle2, Sparkles, ArrowLeft,
  Eye, EyeOff, RotateCw
} from 'lucide-react';
import { User } from '../types';
import { 
  sendEmailOtp, verifyEmailOtp, loginWithEmail, registerWithEmail, verifyEmailCode, 
  requestPasswordReset, resetPasswordWithCode 
} from '../services/storage';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
  intendedDestination?: string;
}

type AuthMode = 'password_login' | 'email_otp' | 'signup' | 'verify_email_signup' | 'forgot_password';

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, intendedDestination }) => {
  const [mode, setMode] = useState<AuthMode>('password_login');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Verification & OTP state
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [maskedDestinationDisplay, setMaskedDestinationDisplay] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Password Reset state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cooldown countdown timer for code resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const resetFormState = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setVerificationCodeInput('');
  };

  const switchMode = (newMode: AuthMode) => {
    resetFormState();
    setIsOtpSent(false);
    setMode(newMode);
  };

  // ==========================================
  // 1. EMAIL & PASSWORD LOGIN FLOW
  // ==========================================
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setIsLoading(true);
    try {
      const { user } = await loginWithEmail(email, password);
      setSuccessMsg(`Welcome back, ${user.name}!`);
      setTimeout(() => onAuthSuccess(user), 300);
    } catch (err: any) {
      if (err.message === 'ACCOUNT_UNVERIFIED') {
        setMode('verify_email_signup');
        setErrorMsg('Please verify your email address before signing in.');
        try {
          await registerWithEmail(name || 'Director', email, password);
        } catch {
          // ignore
        }
      } else {
        setErrorMsg(err.message || 'Invalid email or password. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 2. EMAIL OTP LOGIN FLOW
  // ==========================================
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldown > 0 && isOtpSent) return;

    resetFormState();
    setIsLoading(true);
    try {
      const res = await sendEmailOtp(email, name || undefined);
      setIsOtpSent(true);
      setMaskedDestinationDisplay(res.maskedEmail || email);
      setCooldown(res.cooldownSeconds || 60);
      setSuccessMsg(res.message || 'Verification code sent to your email.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send verification code. Please check your email address.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!verificationCodeInput || verificationCodeInput.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setIsLoading(true);
    try {
      const { user } = await verifyEmailOtp(email, verificationCodeInput, name || undefined);
      setSuccessMsg(`Welcome back, ${user.name}!`);
      setTimeout(() => onAuthSuccess(user), 300);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid verification code. Please check your inbox and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 3. CREATE ACCOUNT (EMAIL SIGNUP FLOW)
  // ==========================================
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerWithEmail(name, email, password);
      setSuccessMsg(res.message || `Verification code sent to ${email}`);
      setMaskedDestinationDisplay(res.maskedEmail || email);
      setMode('verify_email_signup');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setIsLoading(true);
    try {
      const { user } = await verifyEmailCode(email, verificationCodeInput);
      setSuccessMsg(`Account verified! Welcome, ${user.name}.`);
      setTimeout(() => onAuthSuccess(user), 300);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 4. FORGOT PASSWORD FLOW (EMAIL OTP)
  // ==========================================
  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();
    setIsLoading(true);
    try {
      const res = await requestPasswordReset(forgotEmail);
      setSuccessMsg(res.message || 'Password reset instructions sent to your email.');
      setForgotStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPasswordWithCode(forgotEmail, verificationCodeInput, newPassword);
      setSuccessMsg(res.message);
      setTimeout(() => {
        switchMode('password_login');
        setForgotStep(1);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E2E8F0] flex flex-col justify-center items-center py-8 px-4 sm:px-6 relative selection:bg-[#F59E0B]/30 overflow-x-hidden">
      
      {/* Background cinematic glowing accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[540px] h-96 sm:h-[540px] bg-[#F59E0B]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#EF4444]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="relative w-full max-w-md glass border border-white/10 rounded-3xl p-6 sm:p-9 shadow-2xl z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-[#F59E0B] via-[#EF4444] to-[#F59E0B] rounded-2xl text-black shadow-xl shadow-[#F59E0B]/20 mb-3 group hover:scale-105 transition-transform">
            <Clapperboard className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-mono">
            CineScript <span className="text-[#F59E0B]">AI</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wider uppercase mt-1">
            Multilingual Screenplay Engine
          </p>

          {intendedDestination && intendedDestination !== 'home' && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[11px] font-medium text-[#F59E0B]">
              <Sparkles className="w-3 h-3" />
              <span>Sign in to access your {intendedDestination}</span>
            </div>
          )}
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 1: EMAIL LOGIN (Email + Password)                     */}
        {/* ========================================================= */}
        {mode === 'password_login' && (
          <div className="space-y-4">
            <div className="pb-1 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B] font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>EMAIL LOGIN</span>
              </span>
              <button
                type="button"
                onClick={() => switchMode('email_otp')}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                Sign in with OTP code
              </button>
            </div>

            <form onSubmit={handlePasswordLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="director@studio.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot_password')}
                    className="text-[11px] text-[#F59E0B] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email.trim() || !password.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#d98a08] text-black font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-[#F59E0B]/20 transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider mt-1"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>LOGIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Create Account Action */}
            <div className="pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs transition-all cursor-pointer uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
              >
                <span>CREATE NEW ACCOUNT</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 2: EMAIL OTP LOGIN                                   */}
        {/* ========================================================= */}
        {mode === 'email_otp' && (
          <div className="space-y-4">
            <div className="pb-1 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B] font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>EMAIL OTP LOGIN</span>
              </span>
              <button
                type="button"
                onClick={() => switchMode('password_login')}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Back to Password Login
              </button>
            </div>

            {!isOtpSent ? (
              // Step 1: Request Email OTP Code
              <form onSubmit={handleSendEmailOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    A secure 6-digit verification code will be sent to your email address.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Director / Writer Name (Optional)
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Christopher Nolan"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#d98a08] text-black font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-[#F59E0B]/20 transition-all disabled:opacity-50 cursor-pointer mt-1 tracking-wider uppercase"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>SEND CODE</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              // Step 2: Enter & Verify Email Code
              <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <Mail className="w-7 h-7 text-[#F59E0B] mx-auto mb-1.5" />
                  <h3 className="text-xs font-semibold text-white">Verification Code</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Verification code sent to your email <strong className="font-mono text-slate-200">{maskedDestinationDisplay}</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={verificationCodeInput}
                      onChange={(e) => setVerificationCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter code"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-center font-mono text-lg tracking-[0.35em] focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 text-center mt-1">
                    Enter the 6-digit code received in your inbox.
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setVerificationCodeInput('');
                      setErrorMsg(null);
                    }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Change Email
                  </button>

                  <button
                    type="button"
                    disabled={cooldown > 0 || isLoading}
                    onClick={() => handleSendEmailOtp()}
                    className="inline-flex items-center gap-1 text-[#F59E0B] hover:text-[#d98a08] disabled:text-slate-500 font-medium transition-colors cursor-pointer disabled:cursor-not-allowed uppercase text-[11px]"
                  >
                    <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{cooldown > 0 ? `RESEND CODE (${cooldown}s)` : 'RESEND CODE'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || verificationCodeInput.length !== 6}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#d98a08] text-black font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-[#F59E0B]/20 transition-all disabled:opacity-50 cursor-pointer tracking-wider uppercase"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>VERIFY</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Quick Links */}
            {!isOtpSent && (
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[11px]">
                <button
                  type="button"
                  onClick={() => switchMode('password_login')}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Sign in with Password
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-[#F59E0B] hover:underline font-medium"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 3: CREATE ACCOUNT (EMAIL SIGNUP FLOW)                 */}
        {/* ========================================================= */}
        {mode === 'signup' && (
          <form onSubmit={handleEmailSignup} className="space-y-3.5">
            <div className="pb-1 border-b border-white/5">
              <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B] font-semibold">
                CREATE NEW ACCOUNT
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Director / Writer Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lokesh Kanagaraj"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="director@studio.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#d98a08] text-black font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-[#F59E0B]/20 transition-all disabled:opacity-50 mt-2 cursor-pointer uppercase tracking-wider"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account & Send Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchMode('password_login')}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Already have an account? <span className="text-[#F59E0B] font-medium">Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* MODE 4: VERIFY EMAIL SIGNUP CODE STEP                     */}
        {/* ========================================================= */}
        {mode === 'verify_email_signup' && (
          <form onSubmit={handleVerifyEmailSignup} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
              <Mail className="w-8 h-8 text-[#F59E0B] mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-white">Verification Code</h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Verification code sent to your email <strong className="text-slate-200">{maskedDestinationDisplay || email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  maxLength={6}
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-center font-mono text-base tracking-widest focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || verificationCodeInput.length < 6}
                className="flex-[2] py-2.5 rounded-xl bg-[#F59E0B] text-black font-bold text-xs hover:bg-[#d98a08] transition-colors disabled:opacity-50 cursor-pointer uppercase tracking-wider"
              >
                {isLoading ? 'Verifying...' : 'VERIFY & SIGN IN'}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* MODE 5: FORGOT PASSWORD                                   */}
        {/* ========================================================= */}
        {mode === 'forgot_password' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setForgotStep(1);
                switchMode('password_login');
              }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotStep1} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="director@studio.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !forgotEmail.trim()}
                  className="w-full py-3 rounded-xl bg-[#F59E0B] text-black font-bold text-xs hover:bg-[#d98a08] transition-colors disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                >
                  {isLoading ? 'Sending Reset Instructions...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotStep2} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      maxLength={6}
                      value={verificationCodeInput}
                      onChange={(e) => setVerificationCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter code"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-center font-mono text-base tracking-widest focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    New Password (min 6 chars)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-[#F59E0B] text-black font-bold text-xs hover:bg-[#d98a08] transition-colors disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                >
                  {isLoading ? 'Updating Password...' : 'Save New Password & Sign In'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Security Assurance Badge */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>User-Isolated Private Screenplay Library</span>
        </div>

      </div>

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, ShieldCheck, ArrowRight, X, KeyRound, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react';
import { User } from '../types';
import { 
  sendEmailOtp, verifyEmailOtp, loginWithEmail, registerWithEmail, verifyEmailCode, 
  requestPasswordReset, resetPasswordWithCode 
} from '../services/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

type AuthTab = 'password_login' | 'email_otp' | 'signup' | 'verify_email_signup' | 'forgot_password';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('password_login');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Verification & OTP state
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [maskedDestinationDisplay, setMaskedDestinationDisplay] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Password reset state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const resetMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setVerificationCodeInput('');
  };

  const switchTab = (tab: AuthTab) => {
    resetMessages();
    setIsOtpSent(false);
    setActiveTab(tab);
  };

  // 1. Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);
    try {
      const { user } = await loginWithEmail(email, password);
      setSuccessMsg(`Welcome, ${user.name}!`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 300);
    } catch (err: any) {
      if (err.message === 'ACCOUNT_UNVERIFIED') {
        setActiveTab('verify_email_signup');
        setErrorMsg('Please verify your email before logging in.');
      } else {
        setErrorMsg(err.message || 'Invalid email or password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Email OTP
  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldown > 0 && isOtpSent) return;

    resetMessages();
    setIsLoading(true);
    try {
      const res = await sendEmailOtp(email, name || undefined);
      setIsOtpSent(true);
      setMaskedDestinationDisplay(res.maskedEmail || email);
      setCooldown(res.cooldownSeconds || 60);
      setSuccessMsg(res.message || 'Verification code sent to your email.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!verificationCodeInput || verificationCodeInput.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setIsLoading(true);
    try {
      const { user } = await verifyEmailOtp(email, verificationCodeInput, name || undefined);
      setSuccessMsg(`Welcome, ${user.name}!`);
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 300);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Signup with email
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerWithEmail(name, email, password);
      setSuccessMsg(res.message || `Verification code sent to ${email}`);
      setMaskedDestinationDisplay(res.maskedEmail || email);
      setActiveTab('verify_email_signup');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Verify Email code
  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);
    try {
      const { user } = await verifyEmailCode(email, verificationCodeInput);
      setSuccessMsg('Account verified successfully!');
      setTimeout(() => {
        onSuccess(user);
        onClose();
      }, 300);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Password Reset
  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);
    try {
      const res = await requestPasswordReset(forgotEmail);
      setSuccessMsg(res.message || 'Password reset instructions sent.');
      setForgotStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await resetPasswordWithCode(forgotEmail, verificationCodeInput, newPassword);
      setSuccessMsg(res.message);
      setTimeout(() => {
        switchTab('password_login');
        setForgotStep(1);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#121316] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold font-mono text-white">
            CineScript <span className="text-[#F59E0B]">AI</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to access your saved screenplays
          </p>
        </div>

        {/* Error / Success Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* 1. PASSWORD LOGIN */}
        {activeTab === 'password_login' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="pb-1 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B] font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>EMAIL LOGIN</span>
              </span>
              <button
                type="button"
                onClick={() => switchTab('email_otp')}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                Sign in with OTP
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="director@studio.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => switchTab('forgot_password')}
                  className="text-[11px] text-[#F59E0B] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#d98a08] text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer uppercase tracking-wider"
            >
              {isLoading ? 'Signing In...' : 'LOGIN'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>

            <div className="pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                CREATE NEW ACCOUNT
              </button>
            </div>
          </form>
        )}

        {/* 2. EMAIL OTP LOGIN */}
        {activeTab === 'email_otp' && (
          <div className="space-y-4">
            <div className="pb-1 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B] font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>EMAIL OTP LOGIN</span>
              </span>
              <button
                type="button"
                onClick={() => switchTab('password_login')}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Back to Password
              </button>
            </div>

            {!isOtpSent ? (
              <form onSubmit={handleSendEmailOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="director@studio.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#d98a08] text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer uppercase tracking-wider"
                >
                  {isLoading ? 'Sending Code...' : 'SEND CODE'}
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailOtp} className="space-y-3">
                <div className="p-3 rounded-xl bg-white/5 text-center text-xs text-slate-300">
                  Code sent to <strong className="text-white">{maskedDestinationDisplay}</strong>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Verification Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={6}
                      value={verificationCodeInput}
                      onChange={(e) => setVerificationCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-center font-mono text-base tracking-widest focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setVerificationCodeInput('');
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    Change Email
                  </button>

                  <button
                    type="button"
                    disabled={cooldown > 0 || isLoading}
                    onClick={() => handleSendEmailOtp()}
                    className="text-[#F59E0B] hover:underline disabled:text-slate-600 inline-flex items-center gap-1 text-[11px]"
                  >
                    <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Code'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || verificationCodeInput.length !== 6}
                  className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#d98a08] text-black font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Verifying...' : 'VERIFY'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* 3. SIGNUP */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <div className="pb-1 border-b border-white/5">
              <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B] font-semibold">
                CREATE NEW ACCOUNT
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Director Name"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="director@studio.com"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#d98a08] text-black font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Creating Account...' : 'REGISTER & SEND CODE'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchTab('password_login')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Already have an account? <span className="text-[#F59E0B]">Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* 4. VERIFY EMAIL SIGNUP */}
        {activeTab === 'verify_email_signup' && (
          <form onSubmit={handleVerifyEmailCode} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
              <Mail className="w-7 h-7 text-[#F59E0B] mx-auto mb-1" />
              <h3 className="text-sm font-semibold text-white">Email Verification</h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter verification code sent to <strong className="text-slate-200">{maskedDestinationDisplay || email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">6-Digit Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-center font-mono text-base tracking-widest focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || verificationCodeInput.length < 6}
                className="flex-[2] py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs uppercase tracking-wider disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'VERIFY'}
              </button>
            </div>
          </form>
        )}

        {/* 5. FORGOT PASSWORD */}
        {activeTab === 'forgot_password' && (
          <div className="space-y-4">
            {forgotStep === 1 ? (
              <form onSubmit={handleForgotStep1} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Registered Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="director@studio.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !forgotEmail.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#d98a08] text-black font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : 'SEND VERIFICATION CODE'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => switchTab('password_login')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotStep2} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Verification Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={6}
                      value={verificationCodeInput}
                      onChange={(e) => setVerificationCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-center font-mono text-base tracking-widest focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F59E0B] text-white text-xs placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#d98a08] text-black font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Updating...' : 'SAVE NEW PASSWORD'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Security badge */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>User-Isolated Private Library</span>
        </div>

      </div>
    </div>
  );
};

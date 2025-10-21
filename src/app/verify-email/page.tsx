'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);

  // Check if there's a verification token in URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyToken(token);
    }
  }, [searchParams]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !canResend) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const verifyToken = async (token: string) => {
    setIsVerifying(true);

    // TODO: Implement actual token verification with backend
    console.log('Verifying token:', token);

    // Simulate API call
    setTimeout(() => {
      setIsVerifying(false);
      // Simulate success (change to 'error' to test error state)
      setVerificationStatus('success');
    }, 2000);
  };

  const handleResendEmail = async () => {
    setCanResend(false);
    setCountdown(60); // 60 second cooldown

    // TODO: Implement actual resend email logic
    console.log('Resending verification email to:', email);

    // Simulate API call
    setTimeout(() => {
      alert('Verification email sent! Please check your inbox.');
    }, 1000);
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-[var(--primary)] border-r-transparent mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
            Verifying your email...
          </h2>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700 text-center">
            {/* Success Icon */}
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
              Email Verified!
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Your email has been successfully verified. You can now sign in to your Genesis account.
            </p>
            <Link href="/login">
              <Button className="w-full" size="lg">
                Continue to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700 text-center">
            {/* Error Icon */}
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
              Verification Failed
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              The verification link is invalid or has expired. Please request a new verification email.
            </p>
            <Button
              onClick={handleResendEmail}
              disabled={!canResend}
              className="w-full"
              size="lg"
            >
              {canResend ? 'Resend Verification Email' : `Resend in ${countdown}s`}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Pending state (waiting for user to click link in email)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--primary)] mb-2">
            Genesis
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            NLP Annotation Platform
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700 text-center">
          {/* Email Icon */}
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-[var(--primary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
            Verify Your Email
          </h2>

          {email && (
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              We sent a verification link to:
              <br />
              <span className="font-semibold text-slate-800 dark:text-white">
                {email}
              </span>
            </p>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Click the link in the email to verify your account. If you don't see it, check your spam folder.
          </p>

          <Button
            onClick={handleResendEmail}
            disabled={!canResend}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {canResend ? 'Resend Email' : `Resend in ${countdown}s`}
          </Button>

          <div className="mt-6 text-sm">
            <Link
              href="/login"
              className="text-[var(--primary)] hover:text-[var(--primary-dark)] font-medium transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Need help? Contact{' '}
          <a href="mailto:support@genesis.com" className="text-[var(--primary)] hover:underline">
            support@genesis.com
          </a>
        </p>
      </div>
    </div>
  );
}

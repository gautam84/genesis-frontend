'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { signupAction } from '@/features/auth/auth.actions';
import { useAuth } from '@/features/auth/auth.provider';
import { FullScreenLoader, Spinner } from '@/components/Spinner';
import { signupSchema, SignupFormValues } from '@/features/auth/auth.schemas';

export default function SignUpPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [apiError, setApiError] = useState('');
  // Role field is collected for UX but not part of the SignupRequest yet.
  // Kept outside react-hook-form so it doesn't pollute the validated schema.
  const [role, setRole] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      organization: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/home');
    }
  }, [isAuthenticated, authLoading, router]);

  const onSubmit = async (values: SignupFormValues) => {
    setApiError('');
    try {
      const result = await signupAction({
        username: values.username,
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        organizationName: values.organization || undefined,
      });
      if (!result.ok) {
        setApiError(result.error);
        return;
      }
      router.push('/login?registered=true');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return <FullScreenLoader label="Loading..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 relative overflow-hidden py-12 px-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-40 w-96 h-96 bg-[var(--primary)] opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-40 w-96 h-96 bg-purple-500 opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Logo/Brand Section */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Image
              src="/genesis-logo.svg"
              alt="Genesis Logo"
              width={200}
              height={92}
              priority
              className="h-20 w-auto"
            />
          </div>
 
        </div>

        {/* Sign-up Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
            Get started with Genesis
          </h2>

          {/* API Error Message */}
          {apiError && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 font-medium">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                type="text"
                className={`h-11 rounded-xl ${errors.username ? 'border-red-500' : ''}`}
                placeholder="johndoe"
                aria-invalid={!!errors.username}
                {...register('username')}
              />
              {errors.username && (
                <p className="text-sm text-red-500 mt-1">{errors.username.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-slate-700 dark:text-slate-300 font-medium">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  className={`h-11 rounded-xl ${errors.firstName ? 'border-red-500' : ''}`}
                  placeholder="John"
                  aria-invalid={!!errors.firstName}
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName" className="text-slate-700 dark:text-slate-300 font-medium">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  className={`h-11 rounded-xl ${errors.lastName ? 'border-red-500' : ''}`}
                  placeholder="Doe"
                  aria-invalid={!!errors.lastName}
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">
                Email address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                className={`h-11 rounded-xl ${errors.email ? 'border-red-500' : ''}`}
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="organization" className="text-slate-700 dark:text-slate-300 font-medium">
                Organization / Team
              </Label>
              <Input
                id="organization"
                type="text"
                className="h-11 rounded-xl"
                placeholder="Your organization name (optional)"
                {...register('organization')}
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-slate-700 dark:text-slate-300 font-medium">
                Role
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select your role (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annotator">Annotator</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="curator">Curator</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="researcher">Researcher</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  className={`h-11 rounded-xl ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Min. 6 characters"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300 font-medium">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  className={`h-11 rounded-xl ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  placeholder="Re-enter password"
                  aria-invalid={!!errors.confirmPassword}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm pt-2">
              <Checkbox id="terms" required className="mt-0.5" />
              <label htmlFor="terms" className="text-slate-600 dark:text-slate-400 cursor-pointer">
                I agree to the{' '}
                <a href="#" className="text-[var(--primary)] hover:text-[var(--primary-dark)] font-semibold transition">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-[var(--primary)] hover:text-[var(--primary-dark)] font-semibold transition">
                  Privacy Policy
                </a>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-6"
              size="lg"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-5 w-5 text-current" />
                  Creating your account...
                </span>
              ) : (
                'Create your account'
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400">
                  Already have an account?
                </span>
              </div>
            </div>
            <Link
              href="/login"
              className="mt-4 inline-block text-[var(--primary)] hover:text-[var(--primary-dark)] font-semibold transition-colors"
            >
              Sign in to your account
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
          Join thousands of researchers using Genesis for NLP annotation
        </p>
      </div>
    </div>
  );
}

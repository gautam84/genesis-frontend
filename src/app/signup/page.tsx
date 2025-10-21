'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    role: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }));
    if (errors.role) {
      setErrors((prev) => ({ ...prev, role: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.organization.trim()) {
      newErrors.organization = 'Organization is required';
    }
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // TODO: Implement actual sign-up logic and email verification
    console.log('Sign-up attempt:', formData);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // TODO: Redirect to email verification page
      alert('Registration successful! Please check your email for verification.');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[var(--primary)] mb-2">
            Genesis
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Create your NLP Annotation account
          </p>
        </div>

        {/* Sign-up Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-6">
            Sign Up
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-slate-700 dark:text-slate-300">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={errors.firstName ? 'border-red-500' : ''}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName" className="text-slate-700 dark:text-slate-300">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={errors.lastName ? 'border-red-500' : ''}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'border-red-500' : ''}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Organization */}
            <div>
              <Label htmlFor="organization" className="text-slate-700 dark:text-slate-300">
                Organization / Team <span className="text-red-500">*</span>
              </Label>
              <Input
                id="organization"
                name="organization"
                type="text"
                value={formData.organization}
                onChange={handleInputChange}
                className={errors.organization ? 'border-red-500' : ''}
                placeholder="Your organization name"
              />
              {errors.organization && (
                <p className="text-sm text-red-500 mt-1">{errors.organization}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <Label htmlFor="role" className="text-slate-700 dark:text-slate-300">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annotator">Annotator</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="curator">Curator</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="researcher">Researcher</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-500 mt-1">{errors.role}</p>
              )}
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={errors.password ? 'border-red-500' : ''}
                  placeholder="Min. 8 characters"
                />
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                  placeholder="Re-enter password"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start space-x-2 text-sm">
              <input
                type="checkbox"
                id="terms"
                required
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
              />
              <label htmlFor="terms" className="text-slate-600 dark:text-slate-400 cursor-pointer">
                I agree to the{' '}
                <a href="#" className="text-[var(--primary)] hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-[var(--primary)] hover:underline">
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Already have an account?{' '}
            </span>
            <Link
              href="/login"
              className="text-[var(--primary)] hover:text-[var(--primary-dark)] font-medium transition-colors"
            >
              Sign in
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

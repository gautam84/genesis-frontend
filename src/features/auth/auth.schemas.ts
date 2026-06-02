import { z } from 'zod';

/**
 * Login form: backend accepts either a username or an email in the same
 * field, so we only enforce non-empty here.
 */
export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Signup form. Mirrors the prior hand-rolled validateForm() in
 * src/app/signup/page.tsx so behaviour stays identical, but now lives
 * in one place next to the API request types.
 */
export const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(64),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email format'),
    organization: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

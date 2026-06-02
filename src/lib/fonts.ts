import { Geist, Geist_Mono } from 'next/font/google';

/** Primary sans + monospace fonts, exposed as CSS variables on <body>. */
export const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

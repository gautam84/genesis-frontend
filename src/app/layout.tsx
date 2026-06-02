import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { geistSans, geistMono } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Genesis - NLP Annotation Tool",
  description: "A powerful annotation tool for Natural Language Processing tasks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning on <html>/<body>: browser extensions (Grammarly,
    // QuillBot, etc.) inject attributes onto these elements after SSR but before
    // React hydrates, producing a benign server/client attribute mismatch. The
    // prop suppresses the warning for these two elements only — not descendants.
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

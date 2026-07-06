import './globals.css';
import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter, Geist_Mono } from 'next/font/google';

// Self-hosted via next/font. Inter (variable) drives body/UI text; Cormorant
// Garamond (needs explicit weights — not a variable font) drives serif
// headings; Geist Mono stays for code blocks in generated prompts.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Genify — AI Video Prompt Generator',
  description:
    'Turn a short idea into a directed, production-ready AI-video prompt.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorant.variable} ${geistMono.variable}`}
    >
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}

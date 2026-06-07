import type { Metadata } from 'next';
import { Bricolage_Grotesque, Hanken_Grotesk } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from '@/components/ui/toaster';
import { InvitationChecker } from '@/components/InvitationChecker';
import './globals.css';

const fontDisplay = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const fontBody = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DealGuard - Escrow released on human approval',
  description:
    'DealGuard structures your transaction into evidence-backed milestones. We verify the proof, a person signs off, and only then does anything move. Three protection tiers from governance to full financial custody.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${fontDisplay.variable} ${fontBody.variable}`}
        suppressHydrationWarning
      >
        <head>
          {/* Mark JS available before paint so reveal animations have their
              hidden start-state; without JS, content renders fully visible. */}
          <script
            dangerouslySetInnerHTML={{
              __html: "document.documentElement.classList.add('js')",
            }}
          />
        </head>
        <body className="font-sans antialiased">
          <InvitationChecker />
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

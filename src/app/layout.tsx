import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/shared/AppShell';

export const metadata: Metadata = {
  title: 'PDSW | AI-Driven Privacy-Preserving IPFS Security Platform',
  description: 'AI-Driven Privacy-Preserving IPFS-Based Framework for Provenance-Driven Secure Welfare-distribution',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth bg-background text-foreground" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased overflow-x-hidden" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shared/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-primary",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PDSW | AI-Driven Privacy-Preserving IPFS Security Platform",
  description:
    "AI-Driven Privacy-Preserving IPFS-Based Framework for Provenance-Driven Secure Welfare-distribution",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`scroll-smooth bg-background text-foreground ${inter.variable}`}
      suppressHydrationWarning
    >
      <body
        className="bg-background text-foreground min-h-screen font-sans antialiased overflow-x-hidden"
        suppressHydrationWarning
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@repo/access/tokens.css";
import "@repo/kit/kit.css";
import "./globals.css";
import { SuiteNav } from "@repo/suite";
import { ACCESS_BOOT_SCRIPT } from "@repo/access/boot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Condensate Lab",
  description:
    "Watch proteins and RNA gather into droplets (phase separation), test whether they are liquid with FRAP, and see how disease mutations harden them. A simplified model for learning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ACCESS_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col"><SuiteNav />{children}</body>
    </html>
  );
}

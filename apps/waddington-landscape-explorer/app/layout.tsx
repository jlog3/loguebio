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
  title: {
    default: "Waddington Explorer",
    template: "%s · Waddington Explorer",
  },
  description:
    "Watch cells roll down a Waddington landscape into their fates, knock genes out and see new branches form, and check pseudotime against true age. A simplified model for learning.",
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

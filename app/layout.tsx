import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "ASHE TOKUN Admin",
  title: {
    default: "ASHE TOKUN",
    template: "%s | ASHE TOKUN",
  },
  description:
    "Premium religious articles, ceremonial tools, spiritual supplies, and authentic traditions.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ASHE Admin",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/ashe-admin-icon-192-v2.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/ashe-admin-icon-512-v2.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon-v2.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0b07",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

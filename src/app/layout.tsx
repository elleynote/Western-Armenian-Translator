import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/AppProviders";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import "./globals.css";
import "./responsive-polish.css";
import "./responsive-navigation.css";
import "./mobile-user-polish.css";

const siteUrl = "https://translatearmenian.com";
const appleIcon = "https://tunapp.com/wp-content/uploads/2020/09/cropped-Tun_Site-Icon-180x180.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Western Armenian Translator | English to Western Armenian Translation", template: "%s | Tun Translator" },
  description: "Accurate English to Western Armenian translation services. Get free, instant translations from our online Eastern and Western Armenian translator.",
  applicationName: "Western Armenian Translator",
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: appleIcon, sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    title: "Western Armenian Translator | English to Western Armenian Translation",
    description: "Accurate English to Western Armenian translation services. Get free, instant translations from our online Eastern and Western Armenian translator.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="/theme-init.js" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://tunapp.com" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Noto+Sans+Armenian:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
        <GoogleAnalytics />
      </body>
    </html>
  );
}

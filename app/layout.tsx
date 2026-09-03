import type { Metadata } from "next";
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
  metadataBase: new URL("https://skydda.ai"),
  title: "Skydda — Attack and Defend",
  description:
    "Skydda Attack discovers what could happen. Skydda Defend investigates what did. One deeply aware security context for your enterprise.",
  icons: {
    icon: "/skydda-mark.svg",
    shortcut: "/skydda-mark.svg",
  },
  openGraph: {
    title: "Skydda — Attack and Defend",
    description: "Deeply aware. Secure enterprises.",
    type: "website",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "Skydda Attack and Defend enterprise graph" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Skydda — Attack and Defend",
    description: "Deeply aware. Secure enterprises.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}

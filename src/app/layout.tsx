import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "India Travel Tax Tracker",
  description: "Track family travel days in India for tax purposes across Indian Financial Years",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}

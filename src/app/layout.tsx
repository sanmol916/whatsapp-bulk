import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WA Sender — WhatsApp Business Platform",
  description: "Send bulk WhatsApp campaigns, manage contacts and templates.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

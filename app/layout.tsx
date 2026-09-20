import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenChair Lite",
  description: "Offline-first workspace for Model United Nations chairs.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Open Patient Pay",
  description:
    "Open-source, self-hosted billing and installment engine for independent medical practices.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

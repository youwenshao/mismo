import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mismo Internal -- Dev Dashboard",
  description: "Internal development team dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="min-h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}

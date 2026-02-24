import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@mismo/db";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mismo Internal",
  description: "Internal development team dashboard",
};

const WEB_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${WEB_APP_URL}/auth`);
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: { role: true },
  });

  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "ENGINEER")) {
    redirect(`${WEB_APP_URL}/dashboard`);
  }

  return (
    <html lang="en" className="min-h-full">
      <body className="min-h-full flex text-black">
        <Sidebar />
        <main className="flex-1 ml-56 p-8">{children}</main>
      </body>
    </html>
  );
}

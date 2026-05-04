import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Motisha - Inspire · Impact · Transform",
  description: "Premium content platform for Kenyan teachers. Assembly speeches, newsletters, courses, and templates for CBC-aligned education.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><rect width='48' height='48' rx='12' fill='%230D1F3C'/><path d='M8 34 L8 18 L24 30 L40 18 L40 34' stroke='%230EA5E9' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/><circle cx='24' cy='30' r='2.5' fill='%23F5A623'/><rect x='12' y='38' width='24' height='3' rx='1.5' fill='%230EA5E9'/></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/auth-context";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Canyon — Project & task management",
  description: "Track projects, assignments, and task progress for your team.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased`}>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div className="grain-overlay" aria-hidden />
        <AuthProvider>
          {children}
          <Toaster theme="light" position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}

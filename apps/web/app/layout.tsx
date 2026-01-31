/**
 * Root layout for Next.js app
 */

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { Navbar } from "@/components/navigation/navbar";

export const metadata: Metadata = {
  title: "RelevX - AI-Powered Research Assistant",
  description:
    "Set-and-forget research assistant that delivers curated insights straight to your inbox",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen relative overflow-x-hidden">
        {/* Background gradient orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {/* Top-center purple glow */}
          <div 
            className="absolute -top-[40%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] bg-glow-orb bg-glow-orb-purple animate-pulse-glow"
            style={{ filter: 'blur(120px)' }}
          />
          {/* Left blue glow */}
          <div 
            className="absolute top-[20%] -left-[20%] w-[50%] h-[50%] bg-glow-orb bg-glow-orb-blue animate-gradient-shift"
            style={{ filter: 'blur(100px)', animationDelay: '-5s' }}
          />
          {/* Right purple glow */}
          <div 
            className="absolute top-[40%] -right-[15%] w-[45%] h-[45%] bg-glow-orb bg-glow-orb-purple animate-gradient-shift"
            style={{ filter: 'blur(100px)', animationDelay: '-10s' }}
          />
          {/* Bottom blue accent */}
          <div 
            className="absolute -bottom-[20%] left-1/4 w-[60%] h-[40%] bg-glow-orb bg-glow-orb-blue animate-pulse-glow"
            style={{ filter: 'blur(120px)', animationDelay: '-2s' }}
          />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <AuthProvider>
            <Navbar />
            {children}
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}

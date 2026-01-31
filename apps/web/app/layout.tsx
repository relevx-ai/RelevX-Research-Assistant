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
        {/* Subtle star field */}
        <div className="fixed inset-0 bg-stars opacity-40 pointer-events-none" />
        
        {/* Subtle vignette for depth */}
        <div className="fixed inset-0 bg-vignette pointer-events-none z-[1]" />
        
        {/* Background gradient orbs - OpenClaw inspired */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {/* Top-center warm coral/red glow - prominent hero accent */}
          <div 
            className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[90%] h-[70%] bg-glow-orb bg-glow-orb-warm animate-pulse-glow"
            style={{ filter: 'blur(100px)', opacity: 0.8 }}
          />
          {/* Top-right coral accent */}
          <div 
            className="absolute -top-[10%] right-[5%] w-[40%] h-[50%] bg-glow-orb bg-glow-orb-coral animate-gradient-shift"
            style={{ filter: 'blur(80px)', opacity: 0.5, animationDelay: '-3s' }}
          />
          {/* Left teal glow */}
          <div 
            className="absolute top-[25%] -left-[15%] w-[45%] h-[45%] bg-glow-orb bg-glow-orb-teal animate-gradient-shift"
            style={{ filter: 'blur(100px)', opacity: 0.4, animationDelay: '-5s' }}
          />
          {/* Center-right mixed purple/coral */}
          <div 
            className="absolute top-[45%] -right-[10%] w-[50%] h-[50%] bg-glow-orb bg-glow-orb-mixed animate-gradient-shift"
            style={{ filter: 'blur(120px)', opacity: 0.5, animationDelay: '-8s' }}
          />
          {/* Bottom teal accent */}
          <div 
            className="absolute -bottom-[15%] left-[10%] w-[50%] h-[40%] bg-glow-orb bg-glow-orb-teal animate-pulse-glow"
            style={{ filter: 'blur(100px)', opacity: 0.35, animationDelay: '-2s' }}
          />
          {/* Bottom-right warm glow */}
          <div 
            className="absolute -bottom-[20%] right-[5%] w-[40%] h-[35%] bg-glow-orb bg-glow-orb-coral animate-pulse-glow"
            style={{ filter: 'blur(90px)', opacity: 0.3, animationDelay: '-4s' }}
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

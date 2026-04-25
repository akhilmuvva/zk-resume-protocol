"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useChainId } from "wagmi";
import { SEPOLIA_CHAIN_ID } from "@/lib/wagmi";
import { motion } from "framer-motion";
import { Shield, Layout, FileText, Search, Activity, Database } from "lucide-react";

const NAV_LINKS = [
  { href: "/",            label: "Home",       icon: Layout },
  { href: "/issue",       label: "Issue",      icon: Shield },
  { href: "/verify",      label: "Verify",     icon: Search },
  { href: "/analyze",     label: "Analyze",    icon: Activity },
  { href: "/explorer",    label: "Explorer",   icon: Database },
];

export function Navigation() {
  const pathname = usePathname();
  const chainId = useChainId();
  const isWrongNetwork = chainId !== SEPOLIA_CHAIN_ID && chainId !== 31337;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
        {/* Wrong Network Banner */}
        {isWrongNetwork && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl shadow-2xl shadow-red-500/10"
          >
            ⚠️ Protocol Error: Switch to Sepolia Testnet
          </motion.div>
        )}

        <header className="pointer-events-auto w-full h-16 bg-[#0F121D]/60 backdrop-blur-2xl border border-white/5 rounded-2xl px-6 flex items-center justify-between shadow-2xl shadow-black/50">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-600 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center font-black text-white text-base shadow-xl border border-white/10 group-hover:scale-105 transition-transform">
                Z
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-lg tracking-tighter block leading-none">
                ZK RESUME
              </span>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                PROTOCOL
              </span>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden lg:flex items-center bg-black/20 rounded-xl border border-white/5 p-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`relative px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 group ${
                  pathname === href
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {pathname === href && (
                  <motion.div 
                    layoutId="nav-active"
                    className="absolute inset-0 bg-white/5 rounded-lg border border-white/10"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
                <Icon className={`w-3.5 h-3.5 transition-colors ${pathname === href ? "text-violet-400" : "group-hover:text-violet-400/50"}`} />
                <span className="relative z-10">{label}</span>
              </Link>
            ))}
          </nav>

          {/* Wallet & Mobile Trigger */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block scale-90 origin-right">
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                accountStatus="avatar"
              />
            </div>
            
            {/* Mobile Nav Button (Placeholder for simplicity, can be expanded) */}
            <button className="lg:hidden w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
              <div className="w-5 h-0.5 bg-slate-400 relative before:absolute before:w-5 before:h-0.5 before:bg-slate-400 before:-top-1.5 after:absolute after:w-5 after:h-0.5 after:bg-slate-400 after:top-1.5" />
            </button>
          </div>
        </header>
      </div>
    </div>
  );
}

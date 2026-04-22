"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useChainId } from "wagmi";
import { SEPOLIA_CHAIN_ID } from "@/lib/wagmi";

const NAV_LINKS = [
  { href: "/",            label: "Home"           },
  { href: "/issue",       label: "Issue"          },
  { href: "/credentials", label: "My Credentials" },
  { href: "/verify",      label: "Verify"         },
  { href: "/analyze",     label: "Analyze"        },
  { href: "/explorer",    label: "Explorer"       },
];

export function Navigation() {
  const pathname = usePathname();
  const chainId = useChainId();
  const isWrongNetwork = chainId !== SEPOLIA_CHAIN_ID && chainId !== 31337;

  return (
    <>
      {/* Wrong Network Banner */}
      {isWrongNetwork && (
        <div className="bg-red-500/10 border-b border-red-500/30 text-red-400 text-center py-2 text-sm font-medium">
          ⚠️ Please switch to Sepolia Testnet
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0E1A]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-shadow">
              Z
            </div>
            <span className="font-bold text-lg">
              ZK Resume{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Protocol
              </span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  pathname === href
                    ? "text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Wallet */}
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="avatar"
          />
        </div>
      </header>
    </>
  );
}

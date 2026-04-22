import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";
import { ToastProvider } from "@/components/ToastProvider";
import { Navigation } from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZK Resume Protocol | Prove Your Credentials. Reveal Nothing.",
  description:
    "Privacy-preserving academic verification powered by ZK-SNARKs and Ethereum Attestation Service (EAS).",
  openGraph: {
    title: "ZK Resume Protocol",
    description: "Verify academic credentials on-chain without revealing your CGPA.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-[#0A0E1A] text-white min-h-screen antialiased`}
      >
        <Web3Provider>
          <ToastProvider>
            <Navigation />
            <main>{children}</main>
          </ToastProvider>
        </Web3Provider>
      </body>
    </html>
  );
}

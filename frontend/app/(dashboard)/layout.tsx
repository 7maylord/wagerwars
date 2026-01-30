"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Wallet, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWalletStore, formatBalance } from "@/stores/useWalletStore";
import { truncateAddress } from "@/lib/contracts";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/markets", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isConnected, isConnecting, address, usdcxBalance, connect, disconnect } = useWalletStore();

  const handleWalletClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-gray-950/95 backdrop-blur supports-[backdrop-filter]:bg-gray-950/80">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/markets" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-primary animate-glow">
              WagerWars
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === link.href
                    ? "text-primary text-glow-cyan"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/create">
              <Button
                variant="outline"
                size="sm"
                className="border-primary/50 text-primary hover:bg-primary/10 hover:border-primary gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Market
              </Button>
            </Link>

            <Button
              onClick={handleWalletClick}
              disabled={isConnecting}
              className={cn(
                "gap-2 min-w-[140px]",
                isConnected
                  ? "bg-card border border-primary/30 text-foreground hover:bg-primary/10"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? (
                "Connecting..."
              ) : isConnected && address ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatBalance(usdcxBalance)}
                  </span>
                  <span className="text-xs font-mono">
                    {truncateAddress(address)}
                  </span>
                </span>
              ) : (
                "Connect Wallet"
              )}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-gray-950 px-4 py-4 animate-fade-in">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "text-sm font-medium py-2 transition-colors",
                    pathname === link.href
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/create"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium py-2 text-primary"
              >
                Create Market
              </Link>
              <Button
                onClick={() => {
                  handleWalletClick();
                  setMobileMenuOpen(false);
                }}
                disabled={isConnecting}
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Wallet className="h-4 w-4" />
                {isConnecting
                  ? "Connecting..."
                  : isConnected && address
                  ? truncateAddress(address)
                  : "Connect Wallet"}
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}

"use client"

import Link from "next/link"

export default function Footer() {
  return (
    <footer className="w-full py-8 px-4 sm:px-6 lg:px-8 bg-black border-t border-cyan-500/20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Links */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-6 text-sm">
            <Link href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
              Docs
            </Link>
            <Link href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
              Twitter
            </Link>
            <Link href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
              Discord
            </Link>
            <Link href="#" className="text-gray-400 hover:text-cyan-400 transition-colors">
              Privacy
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-sm text-gray-500">© 2025 Wagerwars – Built on Stacks</p>
        </div>
      </div>
    </footer>
  )
}

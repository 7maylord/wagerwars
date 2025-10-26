import type React from "react"
import type { Metadata } from "next"
import { Inter, Orbitron } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-display" })

export const metadata: Metadata = {
  title: "Wagerwars - Decentralized Prediction Markets on Bitcoin",
  description: "Bet on the Future. Settle on Bitcoin. Decentralized prediction markets powered by Stacks.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <style>{`
          :root {
            --font-sans: ${inter.variable};
            --font-display: ${orbitron.variable};
          }
        `}</style>
      </head>
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

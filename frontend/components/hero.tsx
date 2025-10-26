"use client"

import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Hero() {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([])

  useEffect(() => {
    // Generate random particles for background
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }))
    setParticles(newParticles)
  }, [])

  const scrollToWaitlist = () => {
    const element = document.getElementById("waitlist")
    element?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent" />
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="animate-grid-fade" />
        </svg>
      </div>

      {/* Animated particles */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              opacity: Math.random() * 0.5 + 0.3,
              animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 py-20">
        {/* Logo/Title */}
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 text-white animate-glow"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Wagerwars
        </h1>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl lg:text-3xl text-cyan-400 mb-6 font-semibold">
          Bet on the Future. Settle on Bitcoin.
        </p>

        {/* Subheadline */}
        <p className="max-w-2xl text-base sm:text-lg text-gray-300 mb-12 leading-relaxed">
          Decentralized prediction markets for events, elections, and crypto outcomes—powered by Stacks for secure,
          sBTC-backed wagers.
        </p>

        {/* CTA Button */}
        <Button
          onClick={scrollToWaitlist}
          className="mb-16 px-8 py-6 text-lg font-semibold bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,255,255,0.5)]"
        >
          Join the Waitlist
        </Button>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 animate-bounce">
          <ChevronDown className="w-8 h-8 text-cyan-400" />
        </div>
      </div>
    </section>
  )
}

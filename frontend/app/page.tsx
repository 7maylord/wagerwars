"use client"
import Hero from "@/components/hero"
import Features from "@/components/features"
import Waitlist from "@/components/waitlist"
import Footer from "@/components/footer"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Features />
      <Waitlist />
      <Footer />
      <Toaster />
    </main>
  )
}

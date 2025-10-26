"use client"

import { Zap, Shield, Globe } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: Zap,
    title: "Bitcoin-Secured Bets",
    description: "Wager with sBTC, settle with Bitcoin's finality. No bridges, no BS.",
  },
  {
    icon: Shield,
    title: "Clarity Smart Contracts",
    description: "Predict anything: Sports, politics, moon landings. Resolve via oracles.",
  },
  {
    icon: Globe,
    title: "Earn While You Wait",
    description: "Stack STX for yields while your markets load.",
  },
]

export default function Features() {
  return (
    <section className="w-full py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-black border-t border-cyan-500/20">
      <div className="max-w-7xl mx-auto">
        {/* Grid of feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={index}
                className="bg-card border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.2)] group"
              >
                <CardHeader>
                  <div className="mb-4 p-3 bg-cyan-500/10 rounded-lg w-fit group-hover:bg-cyan-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-400 text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

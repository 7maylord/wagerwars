"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Mail, CheckCircle } from "lucide-react"

interface WaitlistFormData {
  email: string
}

export default function Waitlist() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    formState: { errors, isLoading },
    reset,
  } = useForm<WaitlistFormData>({
    mode: "onBlur",
  })

  const onSubmit = async (data: WaitlistFormData) => {
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to join waitlist')
      }

      setIsSubmitted(true)
      
      // Show different toast based on whether they were already registered
      if (result.alreadyRegistered) {
        toast({
          title: "Already on the List! 🎯",
          description: "You're already on our waitlist! We'll keep you updated with the latest news.",
          duration: 5000,
        })
      } else {
        toast({
          title: "Welcome to the War! ⚔️",
          description: "You're in! Watch your inbox for exclusive details and early access.",
          duration: 5000,
        })
      }

      // Reset form after 5 seconds
      setTimeout(() => {
        reset()
        setIsSubmitted(false)
      }, 5000)
    } catch (error) {
      console.error('Waitlist submission error:', error)
      toast({
        title: "Oops! Something went wrong",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      })
    }
  }

  return (
    <section
      id="waitlist"
      className="w-full py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-black border-t border-cyan-500/20"
    >
      <div className="max-w-2xl mx-auto text-center">
        {/* Headline */}
        <h2
          className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Be the First to Wager
        </h2>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-gray-300 mb-12">
          Join our waitlist of early warriors. Get alpha on launch, airdrops, and exclusive markets.
        </p>

        {/* Form */}
        {!isSubmitted ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400 pointer-events-none" />
                <Input
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Valid email required",
                    },
                  })}
                  type="email"
                  placeholder="your@email.com"
                  className="pl-12 bg-input border-cyan-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400 focus:ring-cyan-400/50"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="px-8 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] disabled:opacity-50"
              >
                {isLoading ? "Claiming..." : "Claim Spot"}
              </Button>
            </div>
            {errors.email && <p className="text-red-400 text-sm">{errors.email.message}</p>}
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="w-16 h-16 text-cyan-400 mb-4 animate-bounce" />
            <p className="text-xl text-cyan-400 font-semibold">You're in the war!</p>
            <p className="text-gray-400 mt-2">Check your inbox for exclusive details.</p>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-cyan-500/20">
          <p className="text-sm text-gray-500">
            Powered by <span className="text-cyan-400 font-semibold">Stacks</span>
          </p>
        </div>
      </div>
    </section>
  )
}

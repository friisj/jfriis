'use client'

import { useState } from 'react'

export function SplashPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Connect to email list (Supabase, Resend, etc.)
    console.log('Email submitted:', email)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo / Name */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Jon Friis</h1>
          <p className="text-lg text-muted-foreground">Designer & Builder</p>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <p className="text-muted-foreground">
            New site coming soon. Currently building in public.
          </p>
        </div>

        {/* Email signup */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full px-4 py-3 rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Notify me
            </button>
          </form>
        ) : (
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">
              Thanks! I&apos;ll let you know when the site launches.
            </p>
          </div>
        )}

        {/* Social links */}
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <a
            href="https://twitter.com/jonfriis"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Twitter
          </a>
          <a
            href="https://linkedin.com/in/jonfriis"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/friisj"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  )
}

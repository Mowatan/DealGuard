'use client';

import { Shield } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"

export function LandingHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-foreground">DealGuard</span>
      </Link>
      <nav className="hidden items-center gap-8 md:flex">
        <Link href="#how-it-works" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
          How it works
        </Link>
        <Link href="#features" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
          Features
        </Link>
        <Link href="#faq" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
          FAQ
        </Link>
      </nav>
      <div className="flex items-center gap-4">
        {/* Show when signed out */}
        <SignedOut>
          <Link href="/sign-in" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Log In
          </Link>
          <Link href="/sign-up" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Sign Up
          </Link>
        </SignedOut>

        {/* Show when signed in */}
        <SignedIn>
          <Link href="/deals" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            My Deals
          </Link>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-9 w-9"
              }
            }}
          />
        </SignedIn>

        <Link
          href="/deals/new"
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Create Deal
        </Link>
      </div>
    </header>
  )
}

export function HeroSection() {
  return (
    <section className="mx-auto flex max-w-6xl items-center gap-12 px-6 py-20">
      <div className="flex-1 space-y-6">
        <h1 className="text-5xl font-bold leading-tight text-foreground text-balance">
          AI-Assisted Digital Escrow for{" "}
          <span className="text-primary">Secure Transactions</span>
        </h1>
        <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
          Create milestone-based deals, collect evidence via email, and enforce approvals before release. AI assists with structure and mapping—humans approve final decisions.
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-6">
            <Link
              href="/sign-up"
              className="rounded-xl bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/deals"
              className="rounded-xl border border-border bg-background px-8 py-3.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Browse Deals
            </Link>
          </div>
          <p className="text-sm text-muted-foreground italic">
            AI suggests. People approve. Full audit trail.
          </p>
        </div>
      </div>
      <div className="hidden flex-1 items-center justify-center lg:flex">
        <div className="relative">
          {/* Dashboard mockup */}
          <div className="relative mx-auto w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex flex-col">
              {/* Header */}
              <div className="border-b border-border bg-card px-6 py-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">DealGuard</span>
                </div>
              </div>
              {/* Content preview */}
              <div className="px-5 py-4 space-y-4">
                <div className="rounded-xl bg-primary p-5 text-primary-foreground">
                  <p className="text-xs opacity-80">Total in Escrow</p>
                  <p className="mt-1 text-2xl font-bold">$45,280.00</p>
                  <p className="mt-2 text-xs opacity-70">5 Active Deals</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground">Active Deals</p>
                  {[
                    { title: "Software Development Contract", status: "Milestone 2/5" },
                    { title: "Equipment Purchase Agreement", status: "Pending Verification" },
                  ].map((deal, i) => (
                    <div key={i} className="rounded-xl bg-muted p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-xs font-medium text-foreground">{deal.title}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">{deal.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Create a Deal",
      description: "Set up your transaction with parties, milestones, and evidence requirements",
    },
    {
      number: "02",
      title: "Governance Layer Activated",
      description: "Parties upload evidence, approve milestones, and track progress in real-time",
    },
    {
      number: "03",
      title: "Release Authorized",
      description: "Once conditions are met, admins authorize release and funds move safely",
    },
  ]

  return (
    <section id="how-it-works" className="bg-card py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-foreground">How it works</h2>
        <p className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">
          Three simple steps to secure your business transactions
        </p>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="rounded-2xl border border-border bg-background p-8 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FeaturesSection() {
  const features = [
    {
      icon: "📝",
      title: "Contract Management",
      description: "Physical contract primacy with structured digital twin. Version control with explicit party acceptance.",
      comingSoon: false,
    },
    {
      icon: "📧",
      title: "Evidence Intake",
      description: "Each deal gets a dedicated email inbox. Parties submit evidence naturally via email.",
      comingSoon: false,
    },
    {
      icon: "🤖",
      title: "AI-Assisted Workflows",
      description: "Frontier AI suggests structure, mapping, and risks. Humans always approve final decisions.",
      comingSoon: false,
    },
    {
      icon: "🏦",
      title: "Secure Custody Layer",
      description: "Manual fund movement with verified proof. Admin-controlled release and return authorization.",
      comingSoon: false,
    },
    {
      icon: "⛓️",
      title: "Blockchain Audit Trail",
      description: "Immutable on-chain proof of every transaction and milestone. Third-party verifiable audit trail with hash-only notarization.",
      comingSoon: true,
      launchDate: "Q2 2026",
    },
    {
      icon: "⚖️",
      title: "Dispute Resolution",
      description: "Structured workflow for disputes with evidence collection and admin-mediated resolution.",
      comingSoon: false,
    },
  ]

  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-foreground">Platform Features</h2>
        <p className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">
          Enterprise-grade escrow infrastructure for complex transactions
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-border bg-card p-6 space-y-3 relative">
              <div className="text-3xl">{feature.icon}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                {feature.comingSoon && (
                  <Badge variant="secondary" className="text-xs">
                    COMING SOON
                  </Badge>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              {feature.comingSoon && feature.launchDate && (
                <p className="text-xs text-muted-foreground italic">
                  Launching {feature.launchDate}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function RoadmapSection() {
  const currentFeatures = [
    { icon: "✅", text: "Secure deal governance" },
    { icon: "✅", text: "Evidence-based milestones" },
    { icon: "✅", text: "Email-native operations" },
    { icon: "✅", text: "Dispute resolution" },
  ]

  const upcomingFeatures = [
    { icon: "⏳", text: "Blockchain audit trail", date: "Q2 2026" },
    { icon: "⏳", text: "Advanced AI analytics", date: "Q2 2026" },
    { icon: "⏳", text: "Mobile applications", date: "Q2 2026" },
  ]

  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-foreground">Product Roadmap</h2>
        <p className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">
          Built with transparency. See what's live and what's coming next.
        </p>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Current Features */}
          <div className="rounded-2xl border border-border bg-card p-8">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              Live Now
            </h3>
            <div className="space-y-3">
              {currentFeatures.map((feature) => (
                <div key={feature.text} className="flex items-center gap-3">
                  <span className="text-lg">{feature.icon}</span>
                  <span className="text-sm text-foreground">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Features */}
          <div className="rounded-2xl border border-border bg-card p-8">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <span className="text-2xl">🔮</span>
              Coming Soon
            </h3>
            <div className="space-y-3">
              {upcomingFeatures.map((feature) => (
                <div key={feature.text} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{feature.icon}</span>
                    <span className="text-sm text-foreground">{feature.text}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {feature.date}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function FAQSection() {
  const faqs = [
    {
      question: "What is DealGuard?",
      answer: "DealGuard is an AI-assisted digital escrow governance platform for multi-party business transactions. We provide evidence-based milestones, structured dispute resolution, complete audit trails, and encryption with role-based access controls. AI helps structure deals and map evidence—humans approve all final decisions. Blockchain anchoring is planned for Q2 2026.",
    },
    {
      question: "How does escrow protect my transaction?",
      answer: "Funds are held in escrow until milestone evidence is submitted, reviewed, and approved by all required parties including admin. This protects both buyers and sellers from non-performance and fraud by ensuring conditions are met before any release.",
    },
    {
      question: "What types of deals can I create?",
      answer: "DealGuard supports any business transaction: software development contracts, equipment purchases, service agreements, real estate transactions, and more. Our platform adapts to your specific milestones and approval workflows.",
    },
    {
      question: "How long does fund release take?",
      answer: "Funds are released upon completion of required evidence review and all necessary approvals. If a dispute arises, our admin team investigates and resolves it, typically within 24-48 hours.",
    },
    {
      question: "Is my data secure?",
      answer: "Yes. We use encryption, role-based access controls (RBAC), and complete audit trails. Only authorized parties can access deal information. Blockchain anchoring (launching Q2 2026) will provide immutable verification using hash-only notarization—no personal information stored on-chain.",
    },
    {
      question: "What are the fees?",
      answer: "DealGuard charges a percentage-based fee per transaction. Enterprise plans with custom pricing are available for high-volume users. Contact us for detailed pricing information.",
    },
  ]

  return (
    <section id="faq" className="bg-card py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="mb-4 text-center text-3xl font-bold text-foreground">Frequently Asked Questions</h2>
        <p className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">
          Find answers to common questions about using DealGuard
        </p>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-border bg-background p-6"
            >
              <summary className="flex cursor-pointer items-center justify-between text-base font-medium text-foreground list-none">
                {faq.question}
                <svg
                  className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-8">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">DealGuard</span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Admin
              </Link>
              <Link href="/portal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Portal
              </Link>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1">
              <p className="text-sm text-muted-foreground">
                © 2024 DealGuard. All rights reserved.
              </p>
              <p className="text-sm text-muted-foreground">
                Contact: <a href="mailto:hello@dealguard.org" className="hover:text-foreground transition-colors">hello@dealguard.org</a>
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                <span>|</span>
                <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

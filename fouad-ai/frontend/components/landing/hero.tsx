'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  Menu,
  X,
  FilePlus2,
  Mail,
  CircleCheck,
  Banknote,
  FileText,
  Bot,
  Landmark,
  Link2,
  Scale,
  Clock,
  ArrowRight,
  Plus,
  Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Reveal } from './Reveal';

const NAV = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#tiers', label: 'Protection' },
  { href: '#features', label: 'Features' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            DealGuard
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <SignedOut>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-clay-foreground shadow-sm transition-colors hover:bg-clay/90"
            >
              Start a deal
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/deals"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              My deals
            </Link>
            <Link
              href="/deals/new"
              className="rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-clay-foreground shadow-sm transition-colors hover:bg-clay/90"
            >
              New deal
            </Link>
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: 'h-9 w-9' } }}
            />
          </SignedIn>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-6 py-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-3 text-base font-medium text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-3 border-t border-border/60 pt-4">
              <SignedOut>
                <Link
                  href="/sign-in"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border px-5 py-3 text-center text-sm font-semibold text-foreground"
                >
                  Log in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-clay px-5 py-3 text-center text-sm font-semibold text-clay-foreground"
                >
                  Start a deal
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/deals"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border px-5 py-3 text-center text-sm font-semibold text-foreground"
                >
                  My deals
                </Link>
                <Link
                  href="/deals/new"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-clay px-5 py-3 text-center text-sm font-semibold text-clay-foreground"
                >
                  New deal
                </Link>
              </SignedIn>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div className="space-y-7">
          <Reveal
            as="div"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            AI suggests. People approve. Full audit trail.
          </Reveal>

          <Reveal
            as="h1"
            delay={60}
            className="max-w-xl text-balance text-[clamp(2.5rem,6vw,4.25rem)] font-bold leading-[1.04] text-foreground"
          >
            Escrow that won&rsquo;t release until it&rsquo;s{' '}
            <span className="text-primary">earned</span>.
          </Reveal>

          <Reveal
            as="p"
            delay={120}
            className="max-w-md text-lg leading-relaxed text-muted-foreground"
          >
            DealGuard turns your transaction into evidence-backed milestones. We
            verify the proof, a person signs off, and only then does anything
            move.
          </Reveal>

          <Reveal delay={180} className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-clay px-7 py-3.5 text-sm font-semibold text-clay-foreground shadow-sm transition-colors hover:bg-clay/90"
            >
              Start a deal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              See how it works
            </Link>
          </Reveal>

          <Reveal
            delay={240}
            className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground"
          >
            <span className="inline-flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-primary" />
              Evidence-based release
            </span>
            <span className="inline-flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-primary" />
              Human approval gate
            </span>
            <span className="inline-flex items-center gap-2">
              <CircleCheck className="h-4 w-4 text-primary" />
              Pricing in EGP
            </span>
          </Reveal>
        </div>

        <Reveal delay={120} className="lg:pl-6">
          <DealFlowVisual />
        </Reveal>
      </div>
    </section>
  );
}

function DealFlowVisual() {
  const steps = [
    { label: 'Contract signed', state: 'done' as const },
    { label: 'Deposit verified', state: 'done' as const },
    { label: 'Title deed in custody', state: 'active' as const },
    { label: 'Final approval', state: 'locked' as const },
  ];

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden
        className="animate-float-slow absolute -right-6 -top-6 h-40 w-40 rounded-full bg-clay/15 blur-2xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-8 -left-8 h-44 w-44 rounded-full bg-primary/10 blur-2xl"
      />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-primary/5">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              DEAL-2026-0042
            </span>
          </div>
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary hover:bg-primary/10"
          >
            In progress
          </Badge>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="rounded-xl bg-primary p-5 text-primary-foreground">
            <p className="text-xs/relaxed opacity-80">Apartment sale, New Cairo</p>
            <p className="mt-1 font-display text-2xl font-bold">2,400,000 EGP</p>
            <p className="mt-1 text-xs opacity-75">Document custody</p>
          </div>

          <ol className="space-y-1">
            {steps.map((step, i) => (
              <li key={step.label} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={
                      step.state === 'done'
                        ? 'flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground'
                        : step.state === 'active'
                          ? 'flex h-6 w-6 items-center justify-center rounded-full bg-clay text-clay-foreground ring-4 ring-clay/15'
                          : 'flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground'
                    }
                  >
                    {step.state === 'done' ? (
                      <CircleCheck className="h-4 w-4" />
                    ) : step.state === 'locked' ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-current" />
                    )}
                  </span>
                  {i < steps.length - 1 && (
                    <span
                      className={
                        step.state === 'done'
                          ? 'my-1 h-6 w-px bg-primary/40'
                          : 'my-1 h-6 w-px bg-border'
                      }
                    />
                  )}
                </div>
                <div className="pt-0.5">
                  <p
                    className={
                      step.state === 'locked'
                        ? 'text-sm font-medium text-muted-foreground'
                        : 'text-sm font-medium text-foreground'
                    }
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.state === 'done'
                      ? 'Verified'
                      : step.state === 'active'
                        ? 'Awaiting admin approval'
                        : 'Locked until prior step clears'}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-secondary-foreground">
              Funds release only after a person authorizes it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HowItWorksSection() {
  const steps = [
    {
      icon: FilePlus2,
      title: 'Create the deal',
      description:
        'Set the parties, milestones, and what proof each one needs. AI drafts the structure; you confirm it.',
    },
    {
      icon: Mail,
      title: 'Collect evidence',
      description:
        'Every deal gets its own inbox. Parties just email documents and photos. They land against the right milestone.',
    },
    {
      icon: ShieldCheck,
      title: 'Verify and approve',
      description:
        'Evidence is checked against the milestone, then a person signs off. Nothing is automatic.',
    },
    {
      icon: Banknote,
      title: 'Authorize release',
      description:
        'Once conditions are met, an admin authorizes release and the asset or funds move, on record.',
    },
  ];

  return (
    <section id="how-it-works" className="bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-balance text-[clamp(1.85rem,4vw,2.75rem)] font-bold text-foreground">
            Four steps, one rule: proof before release
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            The whole process is built so money or deeds only move once the work
            is shown and a person agrees.
          </p>
        </Reveal>

        <div className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.title} delay={i * 90} className="relative">
                <div className="flex h-full flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-sm font-semibold text-muted-foreground">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  const features = [
    {
      icon: FileText,
      title: 'Contract management',
      description:
        'The signed PDF stays authoritative. A structured digital twin tracks versions and explicit party acceptance.',
      wide: true,
    },
    {
      icon: Mail,
      title: 'Evidence by email',
      description:
        'Each deal has a dedicated inbox. Parties submit proof the way they already work.',
    },
    {
      icon: Bot,
      title: 'AI-assisted, human-decided',
      description:
        'AI proposes structure, mapping, and risks. A person approves every final call.',
    },
    {
      icon: Landmark,
      title: 'Custody layer',
      description:
        'Documents and funds held with verified proof. Release and return are admin-authorized.',
    },
    {
      icon: Scale,
      title: 'Dispute resolution',
      description:
        'A structured path for disputes: evidence collection and admin-mediated outcomes.',
    },
    {
      icon: Link2,
      title: 'Blockchain audit trail',
      description:
        'Hash-only notarization for a third-party-verifiable history. No personal data on chain.',
      soon: 'Q2 2026',
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-balance text-[clamp(1.85rem,4vw,2.75rem)] font-bold text-foreground">
            What does the work behind the scenes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            The pieces that turn a risky handoff into a process you can both
            watch.
          </p>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Reveal
                key={feature.title}
                delay={(i % 3) * 80}
                className={feature.wide ? 'md:col-span-2' : ''}
              >
                <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    {feature.soon && (
                      <Badge
                        variant="outline"
                        className="border-clay/30 text-clay"
                      >
                        Coming {feature.soon}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function RoadmapSection() {
  const live = [
    'Secure deal governance',
    'Evidence-based milestones',
    'Email-native operations',
    'Dispute resolution',
  ];
  const upcoming = [
    { text: 'Blockchain audit trail', date: 'Q2 2026' },
    { text: 'Advanced AI analytics', date: 'Q2 2026' },
    { text: 'Mobile applications', date: 'Q2 2026' },
  ];

  return (
    <section className="bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-balance text-[clamp(1.85rem,4vw,2.75rem)] font-bold text-foreground">
            Built in the open
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            What is live today, and what is on the way.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          <Reveal className="rounded-2xl border border-border bg-background p-8">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-foreground">
              <CircleCheck className="h-5 w-5 text-primary" />
              Live now
            </h3>
            <ul className="space-y-3.5">
              {live.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm text-foreground"
                >
                  <CircleCheck className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={90} className="rounded-2xl border border-border bg-background p-8">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Clock className="h-5 w-5 text-clay" />
              Coming soon
            </h3>
            <ul className="space-y-3.5">
              {upcoming.map((item) => (
                <li
                  key={item.text}
                  className="flex items-center justify-between gap-3 text-sm text-foreground"
                >
                  <span className="flex items-center gap-3">
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {item.text}
                  </span>
                  <Badge variant="outline">{item.date}</Badge>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function FAQSection() {
  const faqs = [
    {
      question: 'What is DealGuard?',
      answer:
        'DealGuard is an AI-assisted digital escrow governance platform for multi-party transactions. It gives you evidence-based milestones, structured dispute resolution, complete audit trails, and role-based access. AI helps structure deals and map evidence; humans approve all final decisions. Blockchain anchoring is planned for Q2 2026.',
    },
    {
      question: 'How does escrow protect my transaction?',
      answer:
        'Money or documents are held until milestone evidence is submitted, reviewed, and approved by the required parties including an admin. That protects both sides from non-performance and fraud, because conditions must be met before anything releases.',
    },
    {
      question: 'What types of deals can I create?',
      answer:
        'Real estate, vehicles, equipment, share transfers, business acquisitions, freelance and service agreements, and more. The platform adapts to your own milestones and approval steps, whether the deal is a single step or staged over time.',
    },
    {
      question: 'How long does release take?',
      answer:
        'Release happens once the required evidence is reviewed and all necessary approvals are in. If a dispute arises, the admin team investigates and resolves it, typically within 24 to 48 hours.',
    },
    {
      question: 'Is my data secure?',
      answer:
        'Yes. We use encryption, role-based access controls, and complete audit trails, so only authorized parties can see a deal. Blockchain anchoring (launching Q2 2026) adds hash-only notarization for verification, with no personal information stored on chain.',
    },
    {
      question: 'What are the fees?',
      answer:
        'Fees are a percentage of the transaction and depend on the protection tier, starting from 0.5%. High-volume and custom arrangements are available. See the tiers above or contact us for detail.',
    },
  ];

  return (
    <section id="faq" className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal className="mb-12 text-center">
          <h2 className="text-balance text-[clamp(1.85rem,4vw,2.75rem)] font-bold text-foreground">
            Questions, answered
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            The things people ask before starting their first deal.
          </p>
        </Reveal>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <Reveal key={faq.question} delay={i * 50}>
              <details className="group rounded-2xl border border-border bg-card px-6 py-5 transition-colors open:border-primary/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-foreground">
                  {faq.question}
                  <Plus className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45" />
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </span>
              <span className="font-display text-lg font-bold text-foreground">
                DealGuard
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Evidence-based escrow governance. Proof in, approval signed, then
              release.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <FooterCol
              title="Product"
              links={[
                { href: '#how-it-works', label: 'How it works' },
                { href: '#tiers', label: 'Protection tiers' },
                { href: '#features', label: 'Features' },
                { href: '#faq', label: 'FAQ' },
              ]}
            />
            <FooterCol
              title="Platform"
              links={[
                { href: '/deals/new', label: 'Start a deal' },
                { href: '/portal', label: 'Client portal' },
                { href: '/admin', label: 'Admin' },
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                { href: 'mailto:hello@dealguard.org', label: 'Contact' },
                { href: '/privacy', label: 'Privacy' },
                { href: '/terms', label: 'Terms' },
              ]}
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 DealGuard. All rights reserved.</p>
          <a
            href="mailto:hello@dealguard.org"
            className="transition-colors hover:text-foreground"
          >
            hello@dealguard.org
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

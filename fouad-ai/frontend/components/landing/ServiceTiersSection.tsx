'use client';

import { Target, Lock, Banknote, Check, X, ArrowRight, Crown } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';

interface Tier {
  icon: typeof Target;
  name: string;
  tagline: string;
  price: string;
  priceNote: string;
  included: string[];
  excluded: string[];
  bestFor: string[];
  href: string;
  featured?: boolean;
}

const TIERS: Tier[] = [
  {
    icon: Target,
    name: 'Governance Advisory',
    tagline: 'You hold everything, we verify everything.',
    price: 'From 0.5%',
    priceNote: 'Minimum 5,000 EGP',
    included: [
      'AI-powered milestone tracking',
      'Evidence verification and classification',
      'Complete audit trail',
      'Email notifications',
      'Dispute mediation',
    ],
    excluded: ['No document custody', 'No financial custody', 'No fiduciary role'],
    bestFor: [
      'Established relationships',
      'Deals under 1M EGP',
      'Partners with existing trust',
      'Quick transactions',
    ],
    href: '/deals/new?tier=governance',
  },
  {
    icon: Lock,
    name: 'Document Custody',
    tagline: 'We hold your title deeds and critical documents.',
    price: 'From 0.75 to 1%',
    priceNote: 'plus storage fee',
    included: [
      'Everything in Governance Advisory',
      'Physical vault document storage',
      'Title deed and certificate custody',
      'Digital twin creation',
      'Blockchain-anchored proof',
      'Insurance coverage',
    ],
    excluded: ['No financial custody; parties move money themselves'],
    bestFor: [
      'Real estate transactions',
      'Share transfers',
      'High-value asset sales',
      'Deals needing document security',
    ],
    href: '/deals/new?tier=document',
    featured: true,
  },
  {
    icon: Banknote,
    name: 'Financial Escrow',
    tagline: 'Full financial custody and fiduciary responsibility.',
    price: 'From 1.5 to 3%',
    priceNote: 'Minimum 25,000 EGP',
    included: [
      'Everything in Document Custody',
      'Segregated escrow accounts',
      'Fund custody and disbursement',
      'Guarantor cheque holding',
      'Multi-signature approvals',
      'Full regulatory compliance',
      'Bonded and insured',
    ],
    excluded: [],
    bestFor: [
      'Deals over 5M EGP',
      'Cross-border transactions',
      'Government contracts',
      'Maximum risk mitigation',
    ],
    href: '/deals/new?tier=escrow',
  },
];

export default function ServiceTiersSection() {
  return (
    <section id="tiers" className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-balance text-[clamp(1.85rem,4vw,2.75rem)] font-bold text-foreground">
            Choose your level of protection
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From verifying the process to holding the funds. Pick the tier that
            matches the deal&rsquo;s size and the risk you want to hand off.
          </p>
        </Reveal>

        <div className="grid items-stretch gap-6 lg:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 90} className="flex">
              <TierCard tier={tier} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mx-auto mt-12 max-w-2xl rounded-2xl border border-border bg-card px-6 py-5 text-center">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              Not sure which fits?
            </span>{' '}
            Start a deal and we will recommend a tier from your transaction
            details, or{' '}
            <Link
              href="/contact"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              contact us
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  const Icon = tier.icon;
  return (
    <div
      className={cn(
        'flex w-full flex-col rounded-2xl border bg-card p-7',
        tier.featured
          ? 'border-clay/40 shadow-lg shadow-clay/5 ring-1 ring-clay/20'
          : 'border-border',
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            tier.featured ? 'bg-clay/10 text-clay' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-6 w-6" />
        </span>
        {tier.featured && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-clay px-3 py-1 text-xs font-semibold text-clay-foreground">
            <Crown className="h-3.5 w-3.5" />
            Most popular
          </span>
        )}
      </div>

      <h3 className="mt-5 text-xl font-semibold text-foreground">{tier.name}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{tier.tagline}</p>

      <div className="mt-5">
        <span className="font-display text-2xl font-bold text-foreground">
          {tier.price}
        </span>
        <span className="ml-2 text-xs text-muted-foreground">
          {tier.priceNote}
        </span>
      </div>

      <ul className="mt-6 space-y-2.5">
        {tier.included.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{item}</span>
          </li>
        ))}
        {tier.excluded.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-sm text-muted-foreground"
          >
            <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-border pt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Best for
        </p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {tier.bestFor.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-7">
        <Link
          href={tier.href}
          className={cn(
            'inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors active:translate-y-px',
            tier.featured
              ? 'bg-clay text-clay-foreground shadow-sm hover:bg-clay/90'
              : 'border border-border bg-background text-foreground hover:bg-muted',
          )}
        >
          Start a deal
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

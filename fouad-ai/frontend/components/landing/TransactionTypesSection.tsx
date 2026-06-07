'use client';

import { Zap, Target, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Reveal } from './Reveal';

const STRUCTURES = [
  {
    icon: Zap,
    name: 'Single-step',
    blurb: 'Payment and delivery happen together. Quick to set up, quick to close.',
    points: ['One payment, one delivery', 'Minimal complexity', 'Fast dispute resolution'],
    bestFor: 'Vehicle sales, used equipment, freelance and service agreements',
    href: '/single-step-guide',
  },
  {
    icon: Target,
    name: 'Milestone-based',
    blurb: 'Staged payments tied to performance, released as each obligation is met.',
    points: ['Staged payments over time', 'Performance-based releases', 'Custom trigger conditions'],
    bestFor: 'Real estate, share transfers, business acquisitions, construction',
    href: '/milestone-guide',
  },
];

export default function TransactionTypesSection() {
  return (
    <section className="bg-card py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-balance text-[clamp(1.85rem,4vw,2.75rem)] font-bold text-foreground">
            Two shapes for any deal
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Most transactions are one of these. Not sure which? Start a deal and
            we will help you choose.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          {STRUCTURES.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.name} delay={i * 90}>
                <div className="flex h-full flex-col rounded-2xl border border-border bg-background p-7 transition-colors hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </span>
                    <h3 className="text-xl font-semibold text-foreground">
                      {s.name}
                    </h3>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {s.blurb}
                  </p>

                  <ul className="mt-5 space-y-2.5">
                    {s.points.map((p) => (
                      <li
                        key={p}
                        className="flex items-start gap-2.5 text-sm text-foreground"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {p}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-5 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Best for: </span>
                    {s.bestFor}
                  </p>

                  <Link
                    href={s.href}
                    className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                  >
                    Learn more
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

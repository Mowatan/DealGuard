'use client';

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

interface RevealProps {
  as?: ElementType;
  className?: string;
  /** Stagger delay in milliseconds. */
  delay?: number;
  children: ReactNode;
  id?: string;
}

/**
 * Fades and lifts its children into view once, when scrolled near.
 * The visible state is the default (see globals.css); the hidden start-state is
 * gated behind `.js`, so no-JS / headless renders never ship blank.
 */
export function Reveal({
  as: Tag = 'div',
  className,
  delay = 0,
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;

    // Safety: never trap content invisible. If the platform can't observe
    // intersections, or the page is rendered without ever becoming visible
    // (background tab, some headless crawlers), reveal immediately.
    if (
      typeof IntersectionObserver === 'undefined' ||
      document.visibilityState === 'hidden'
    ) {
      setSeen(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  return (
    <Tag
      ref={ref}
      className={cn('reveal', seen && 'is-visible', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

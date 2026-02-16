import { LandingHeader } from '@/components/landing/hero';

export default function DealsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="bg-card shadow-sm">
        <LandingHeader />
      </div>
      <div className="container mx-auto">
        {children}
      </div>
    </div>
  );
}

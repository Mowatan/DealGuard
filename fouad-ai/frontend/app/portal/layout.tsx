import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import Link from 'next/link';
import { Home, FileText, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  const navigation = [
    {
      name: 'My Deals',
      href: '/portal',
      icon: Home,
    },
    {
      name: 'My Evidence',
      href: '/portal/evidence',
      icon: FileText,
    },
    {
      name: 'Submit Evidence',
      href: '/portal/evidence/submit',
      icon: Upload,
    },
  ];

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      {/* Decorative lavender background accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-primary/5" />
        <div className="absolute -right-32 top-0 h-[500px] w-[500px] rotate-12 bg-primary/[0.04]" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }} />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-primary/[0.06]" />
      </div>
      <div className="relative z-10 flex h-full flex-col">
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          {/* Portal Sidebar */}
          <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card py-6">
            <nav className="flex flex-1 flex-col gap-1 px-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground">Party Portal</div>
            </div>
          </aside>
          <main className="flex-1 overflow-y-auto p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

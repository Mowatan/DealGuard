import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

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
          <AppSidebar />
          <main className="flex-1 overflow-y-auto p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

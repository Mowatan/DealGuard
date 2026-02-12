import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Home, FileText, Upload } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50">
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-blue-600">fouad.ai</h1>
            <span className="ml-2 px-2 py-1 text-xs font-semibold text-purple-600 bg-purple-100 rounded">
              Portal
            </span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">Party Portal</div>
          </div>
        </div>
      </div>

      <div className="pl-64">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}

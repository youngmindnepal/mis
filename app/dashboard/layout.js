// app/dashboard/layout.js
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';

export default async function DashboardLayout({ children }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar session={session} />

      <div className="flex flex-col flex-1">
        <main className="p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

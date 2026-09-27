import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSession,
} from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const session = verifyAdminSession(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );

  if (!session) {
    redirect('/admin-access');
  }

  return <>{children}</>;
}

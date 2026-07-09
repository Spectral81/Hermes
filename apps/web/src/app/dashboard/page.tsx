import { redirect } from 'next/navigation';
import { RoleDashboardContent } from '@/components/RoleDashboardContent';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <RoleDashboardContent />;
}

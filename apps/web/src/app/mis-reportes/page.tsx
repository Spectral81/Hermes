import { redirect } from 'next/navigation';
import { MyReportsContent } from '@/components/MyReportsContent';
import { createClient } from '@/lib/supabase/server';

export default async function MisReportesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <MyReportsContent />;
}

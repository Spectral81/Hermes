import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { IncidentsMap } from '@/components/IncidentsMap';

export default async function MapaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <IncidentsMap />;
}

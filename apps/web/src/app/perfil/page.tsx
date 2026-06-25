import { redirect } from 'next/navigation';
import { ProfileContent } from '@/components/ProfileContent';
import { createClient } from '@/lib/supabase/server';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  return <ProfileContent />;
}

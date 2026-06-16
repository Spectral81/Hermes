export function validateSupabaseConfig(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return 'Faltan variables en Railway: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.';
  }
  if (!url.includes('supabase.co')) {
    return 'NEXT_PUBLIC_SUPABASE_URL incorrecta. Debe ser https://xxxxx.supabase.co (no la publishable key sb_publishable_...).';
  }
  if (!key.startsWith('eyJ')) {
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY incorrecta. Usa el anon JWT (empieza con eyJ...).';
  }
  return null;
}

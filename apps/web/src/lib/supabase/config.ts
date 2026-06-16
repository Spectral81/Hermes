export function validateSupabaseConfig(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return 'Faltan variables en Railway: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.';
  }
  try {
    if (!new URL(url).hostname.endsWith('.supabase.co')) {
      return `URL incorrecta: "${url}". Debe terminar en .supabase.co (NO .com).`;
    }
  } catch {
    return 'NEXT_PUBLIC_SUPABASE_URL no es una URL válida.';
  }
  if (!key.startsWith('eyJ')) {
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY incorrecta. Usa el anon JWT (empieza con eyJ...).';
  }
  return null;
}

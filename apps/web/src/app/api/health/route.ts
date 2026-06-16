import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    host = 'invalid';
  }

  return NextResponse.json({
    ok: true,
    supabaseHost: host,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
  });
}

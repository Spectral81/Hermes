import { NextResponse } from 'next/server';
import { confirmUserEmail } from '@/lib/auth/confirm-user';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const userId = (body as { userId?: string }).userId?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'Falta userId.' }, { status: 400 });
  }

  const result = await confirmUserEmail(userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'No se pudo confirmar.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

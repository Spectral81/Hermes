import { NextResponse } from 'next/server';
import { checkRegistrationAvailability } from '@/lib/auth/registration-slots';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  const input = body as Record<string, string>;
  const email = (input.email ?? '').trim().toLowerCase();
  const matricula = (input.matricula ?? '').trim();

  if (!email && !matricula) {
    return NextResponse.json({ error: 'Indica correo o matrícula.' }, { status: 400 });
  }

  const availability = await checkRegistrationAvailability(email, matricula);
  return NextResponse.json(availability);
}

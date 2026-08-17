import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { obtenerContextoReportes } from '@/lib/chat/reports-context';
import { getRequestUser } from '@/lib/supabase/request-auth';

const SYSTEM_INSTRUCTION = [
  'Eres HERMES, el asistente de seguridad del campus UTEQ.',
  'Hablas en español de México, como un compañero claro y cercano: frases cortas, tono natural, sin sonar a reporte oficial.',
  'Usa solo los datos de reportes que te pasan. Si no hay información suficiente, dilo con naturalidad.',
  'No inventes incidentes ni inventes detalles.',
  'No te presentes otra vez si el usuario ya te saludó o ya conversaron.',
  'No uses formato de ficha (Tipo:/Fecha:/Descripción:), ni markdown con asteriscos, ni listas rígidas, ni horas en UTC.',
  'Nunca digas coordenadas, latitud, longitud ni números decimales de ubicación. Habla solo con puntos de referencia (por ejemplo: cerca del estacionamiento, zona norte del campus).',
  'Si el usuario pregunta por un lugar, usa el punto de referencia del contexto y menciona que puede abrir el mapa en la app para verlo.',
  'Traduce fechas a lenguaje cotidiano (hoy, ayer, hace 2 días, el 5 de agosto) y estados a palabras simples (activo, en proceso, cerrado).',
  'Cuando resumas un reporte, intégralo en 1 o 2 oraciones.',
  'Si preguntan por varios, resume en prosa; solo enumera si son muchos y hazlo con bullets cortos y en lenguaje natural.',
].join(' ');

const DEFAULT_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash',
];

function wantsMapPin(message: string) {
  return /dónde|donde|ubic|mapa|zona|cerca|último|ultimo|reporte|robo|accidente|incidente|alerta|hoy|semana/i.test(
    message,
  );
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function isQuotaError(msg: string) {
  return /\b429\b|RESOURCE_EXHAUSTED|exceeded your current quota|rate[- ]?limits?/i.test(msg);
}

function isBusyError(msg: string) {
  return /\b503\b|UNAVAILABLE|high demand|try again later|overloaded|unavailable/i.test(msg);
}

function isRetryable(msg: string) {
  return isBusyError(msg) || isQuotaError(msg) || /\b500\b|\b502\b|\b504\b|fetch failed|ECONNRESET|ETIMEDOUT/i.test(msg);
}

function modelList(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim();
  const extra = (process.env.GEMINI_FALLBACK_MODELS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const ordered = [...(primary ? [primary] : []), ...extra, ...DEFAULT_MODELS];
  return [...new Set(ordered)];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithFallback(apiKey: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = modelList();
  let lastError = 'No se pudo generar una respuesta.';

  for (const modelName of models) {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text()?.trim();
        if (text) return text;
        lastError = 'El modelo no devolvió texto.';
      } catch (e) {
        lastError = errorText(e);
        if (attempt === 0 && isRetryable(lastError)) {
          await sleep(700);
          continue;
        }
        break;
      }
    }
  }

  throw new Error(lastError);
}

function friendlyGeminiError(msg: string): string {
  if (isQuotaError(msg)) {
    return 'El asistente llegó al límite de uso por ahora. Intenta de nuevo en unos minutos.';
  }
  if (isBusyError(msg)) {
    return 'El asistente está saturado en este momento. Espera un momento e inténtalo otra vez.';
  }
  return 'No pude responder ahora. Intenta de nuevo en un momento.';
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Falta GEMINI_API_KEY en el servidor.' },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { message?: string };
    const message = body.message?.trim() ?? '';
    if (!message) {
      return NextResponse.json({ error: 'Escribe una pregunta.' }, { status: 400 });
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: 'Mensaje demasiado largo.' }, { status: 400 });
    }

    const infoDB = await obtenerContextoReportes();

    const prompt = [
      'Contexto de reportes del campus (últimos 7 días):',
      `Resumen por tipo: ${infoDB.semanal}.`,
      `Cantidad activos o en proceso: ${infoDB.totalActivos}.`,
      `Zonas con más actividad (puntos de referencia, sin coords): ${infoDB.zonas}.`,
      'Detalle reciente (usa el lugar como referencia humana; no copies el formato):',
      infoDB.recientes,
      '',
      `Pregunta del usuario: ${message}`,
      '',
      'Responde solo con la respuesta natural al usuario, sin encabezados ni meta-comentarios.',
    ].join('\n');

    const reply = await generateWithFallback(apiKey, prompt);
    const map = wantsMapPin(message) && infoDB.latestPin ? infoDB.latestPin : null;

    return NextResponse.json({ reply, map });
  } catch (e) {
    const msg = errorText(e);
    const friendly = friendlyGeminiError(msg);
    return NextResponse.json({ error: friendly, reply: friendly }, { status: 503 });
  }
}

import { NextResponse } from 'next/server';

export function apiHandler(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  return fn().catch((err) => {
    console.error('[API]', err);
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  });
}

export function parseId(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function parsePositiveFloat(value: unknown): number | null {
  const n = parseFloat(String(value));
  return isNaN(n) || n < 0 ? null : n;
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

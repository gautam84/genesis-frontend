import { cookies } from 'next/headers';
import { ACCESS_COOKIE } from '@/server/http';

/**
 * Proxies the export blob from Spring to the browser. Server actions can't
 * stream binary, so the download path lives as a route handler instead.
 * Middleware refreshes the access cookie before this handler runs (path is
 * in the protected prefix list).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const ALLOWED_TYPES = new Set(['workspaces', 'documents']);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type, id } = await params;
  if (!ALLOWED_TYPES.has(type)) {
    return new Response('Not found', { status: 404 });
  }

  const jar = await cookies();
  const accessToken = jar.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.text();
  const upstream = await fetch(`${API_BASE_URL}/api/export/${type}/${id}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!upstream.ok) {
    return new Response(`Export failed (${upstream.status})`, { status: upstream.status });
  }

  // Stream the blob through; preserve Content-Disposition so the client
  // can read the filename Spring chose.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Disposition': upstream.headers.get('Content-Disposition') ?? '',
    },
  });
}

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  // Security check: Only allow this proxy route during development
  if (!import.meta.env.DEV) {
    return new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const badgeUrl = url.searchParams.get('url');

  if (!badgeUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(badgeUrl);
    if (!response.ok) {
      return new Response(`Failed to fetch badge: ${response.statusText}`, { status: response.status });
    }
    const blob = await response.blob();
    return new Response(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(`Error proxying badge: ${err}`, { status: 500 });
  }
};

// Cloudflare Worker API proxy for GitHub Pages frontend.
//
// Deploy (replaces static-asset hosting that causes 405 on POST):
//   npx wrangler deploy
//
// Set the API key secret once:
//   npx wrangler secret put ANTHROPIC_API_KEY
//
// Dashboard alternative:
// 1. Workers & Pages → custom-api-tools-v2 → Quick edit
// 2. Replace ALL code with this file, remove any static-asset bindings
// 3. Deploy
// 4. Settings → Variables → Secret → ANTHROPIC_API_KEY

const ALLOWED_ORIGINS = new Set([
  'https://lindsayctweir.github.io',
]);

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders(origin),
      });
    }

    if (!env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const body = await request.text();
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body,
    });

    return new Response(resp.body, {
      status: resp.status,
      headers: {
        'Content-Type': resp.headers.get('Content-Type') || 'application/json',
        ...corsHeaders(origin),
      },
    });
  },
};

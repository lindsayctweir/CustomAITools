// Cloudflare Worker — inclusive language scan via Workers AI.
//
// Deploy (dashboard, no Wrangler required):
// 1. Workers & Pages → custom-api-tools-v2 → Settings → Bindings → Add → Workers AI
//    Binding name: AI
// 2. Edit code → paste this file → Deploy
//
// Deploy (Wrangler):
//   npx wrangler deploy

const MODEL = '@cf/meta/llama-3.1-8b-instruct';

const ALLOWED_ORIGINS = new Set([
  'https://lindsayctweir.github.io',
]);

const SYSTEM = `You are an inclusive language expert. Analyze text for non-inclusive, biased, or exclusionary language across ALL of these categories:

1. GENDER - gendered terms when neutral alternatives exist (e.g. "manpower", "chairman", "guys" when addressing a mixed group, "he/she" as default pronoun, "mankind", gendered job titles like "fireman", "stewardess")
2. ABILITY / ABLEISM - language that uses disability or mental health as metaphor or insult (e.g. "crazy", "blind spot", "lame", "crippled", "dumb", "falls on deaf ears", "tone-deaf", "sanity check", "turning a blind eye")
3. RACE / ETHNICITY - terms with racist roots or that center whiteness, including from Intuit's anti-racist word list: blacklist/whitelist, master/slave, black hat/white hat, black box, grandfathered, peanut gallery, sold down the river, spirit animal, tribe (casual use), powwow, brown bag, cakewalk, hold down the fort, circle the wagons, bounty, open the kimono, tiger team, conquer, denigrate, redline, stakeholder (metaphorical), white label, white glove
4. AGE - ageist assumptions (e.g. "digital natives", "seasoned professional", assumptions that young = tech-savvy, old = resistant to change)
5. SOCIOECONOMIC - terms that assume wealth or resources (e.g. "just grab a flight", phrases assuming home ownership or leisure)
6. GENERAL EXCLUSION - othering language, cultural appropriation, jargon that excludes, or terms that imply a narrow "normal"

For EACH flagged item return a JSON array. Each item:
- "term": exact word/phrase as it appears in text
- "category": one of: gender, ability, race/ethnicity, age, socioeconomic, general
- "why": 1-2 sentences on WHY it's problematic and its historical/cultural context
- "suggestions": array of 2-4 specific replacement words/phrases
- "learn_more": 2-3 sentences of practical education — broader writing practice advice, not just about this one word

If the text is already inclusive, return [].

Respond ONLY with a valid JSON array. No preamble, no markdown fences.`;

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

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function parseFlags(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) {
    throw new Error('Model did not return a JSON array');
  }
  const flags = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(flags)) {
    throw new Error('Model response was not a JSON array');
  }
  return flags;
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

    if (!env.AI) {
      return jsonResponse(
        { error: 'Workers AI binding is not configured. Add a Workers AI binding named "AI" in the dashboard.' },
        500,
        origin,
      );
    }

    let text;
    try {
      ({ text } = await request.json());
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      return jsonResponse({ error: 'Missing "text" field' }, 400, origin);
    }

    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: 'Scan this text:\n\n' + text.trim() },
        ],
        max_tokens: 2048,
        temperature: 0.1,
      });

      const flags = parseFlags(result.response || '');
      return jsonResponse({ flags }, 200, origin);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      return jsonResponse({ error: message }, 502, origin);
    }
  },
};

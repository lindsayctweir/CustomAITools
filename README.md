# Inclusive Language Scanner

A lightweight web tool that scans professional writing for language that may exclude or marginalize people — with explanations, replacement suggestions, and educational guidance to help you write more inclusively.

Paste an email, job posting, presentation slide, policy doc, or any other text and get structured feedback across six categories: gender, ability, race/ethnicity, age, socioeconomic status, and general exclusion.

## Features

- **One-click scanning** — paste text and receive flagged terms with context
- **Category breakdown** — issues grouped by type with color-coded badges
- **Inclusivity score** — a quick at-a-glance summary of how inclusive your text is
- **Actionable suggestions** — 2–4 replacement phrases for each flagged term
- **Learn more panels** — expandable guidance on broader inclusive writing practices
- **Evidence-based** — analysis grounded in established style guides and standards (see [Sources](#sources))

## How it works

The project is split into two parts:

| Component | File | Hosting |
|-----------|------|---------|
| **Frontend** | `index.html` | GitHub Pages (or any static host) |
| **API** | `worker.js` | Cloudflare Workers + Workers AI |

1. The user pastes text into the browser UI.
2. The frontend sends a `POST` request to the Cloudflare Worker with the text.
3. The Worker calls [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) (`@cf/zai-org/glm-4.7-flash`) with a detailed system prompt covering inclusive language guidelines.
4. The model returns a JSON array of flagged terms; the Worker parses and returns them to the frontend.
5. The UI renders score, category pills, and expandable cards for each flag.

```
Browser (index.html)
       │  POST { "text": "..." }
       ▼
Cloudflare Worker (worker.js)
       │  Workers AI — GLM 4.7 Flash
       ▼
JSON { "flags": [ { term, category, why, suggestions, learn_more }, ... ] }
```

## Project structure

```
CustomAITools/
├── index.html      # Single-page frontend (HTML, CSS, JS)
├── worker.js       # Cloudflare Worker API handler
├── wrangler.jsonc  # Wrangler deploy config
└── README.md
```

## Deployment

### Frontend (GitHub Pages)

1. Push this repo to GitHub.
2. Go to **Settings → Pages** and set the source to the `main` branch (root).
3. Update the `SCAN_API` constant in `index.html` to point at your deployed Worker URL:

```javascript
const SCAN_API = 'https://your-worker.your-subdomain.workers.dev';
```

### Backend (Cloudflare Worker)

**Option A — Wrangler CLI**

```bash
npm install -g wrangler   # or: npx wrangler
wrangler login
wrangler deploy
```

The `wrangler.jsonc` config already includes the Workers AI binding:

```jsonc
"ai": {
  "binding": "AI"
}
```

**Option B — Cloudflare Dashboard**

1. Go to **Workers & Pages** and create or open your Worker.
2. Under **Settings → Bindings**, add a **Workers AI** binding named `AI`.
3. Paste the contents of `worker.js` into the editor and deploy.

### CORS

The Worker only allows requests from origins listed in `ALLOWED_ORIGINS` inside `worker.js`. Add your GitHub Pages URL (or local dev origin) before deploying:

```javascript
const ALLOWED_ORIGINS = new Set([
  'https://lindsayctweir.github.io',
  'http://localhost:8080',  // optional, for local testing
]);
```

## API reference

**Endpoint:** `POST /`

**Request body:**

```json
{
  "text": "The string to scan for inclusive language issues."
}
```

**Success response (`200`):**

```json
{
  "flags": [
    {
      "term": "manpower",
      "category": "gender",
      "why": "Uses a gendered compound when neutral alternatives exist.",
      "suggestions": ["workforce", "staff", "personnel", "human resources"],
      "learn_more": "When describing roles or capacity, prefer gender-neutral terms that include all genders."
    }
  ]
}
```

**Error responses:**

| Status | Meaning |
|--------|---------|
| `400` | Invalid or missing JSON / `text` field |
| `405` | Method not allowed (use POST) |
| `500` | Workers AI binding not configured |
| `502` | Model response could not be parsed |

## Local development

**Frontend:** open `index.html` in a browser, or serve it locally:

```bash
npx serve .
# or: python3 -m http.server 8080
```

If testing against a deployed Worker, add your local origin to `ALLOWED_ORIGINS` in `worker.js`.

**Worker:**

```bash
wrangler dev
```

## Sources

This scanner draws guidance from the following references:

- [Intuit Content Design word list](https://contentdesign.intuit.com/word-list/)
- [Intuit anti-racist language guide](https://contentdesign.intuit.com/accessibility-and-inclusion/anti-racist-language/)
- [Intuit inclusive content guidelines](https://contentdesign.intuit.com/accessibility-and-inclusion/inclusive-content/)
- [ISO/IEC non-inclusive terminology list](https://share.google/eZDfg1q8O4n1sLagk)
- [Metaverse Standards Forum — inclusive language](https://metaverse-standards.org/diversity-and-inclusion/inclusive-language/)
- [GOV.UK — inclusive language about disability](https://www.gov.uk/government/publications/inclusive-communication/inclusive-language-words-to-use-and-avoid-when-writing-about-disability)
- AP Stylebook inclusive language guidance
- WCAG accessibility standards

## Disclaimer

This tool uses AI to assist with inclusive language review. It is intended for **professional and educational use** — not as a definitive or legal standard. Results may vary; always apply human judgment and consult your organization's style guide where applicable.

## License

See [LICENSE](LICENSE) if present, or contact the repository owner for usage terms.

# AI Poster Maker

AI music-album poster generator and editor.

## Run locally

```bash
pnpm install
pnpm start
```

Open `http://localhost:5177`.

## Production

The app listens on `PORT` or `5177` by default.

Required for Gemini generation:

```env
GOOGLE_GENAI_VERTEX=true
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SECRETS_ENCRYPTION_KEY=
```

The server reads the Gemini key from the classroom institute secrets.

## Redesign planning

The full Canva-style redesign plan is in:

```text
docs/CANVA_STYLE_REDESIGN_PLAN.md
```

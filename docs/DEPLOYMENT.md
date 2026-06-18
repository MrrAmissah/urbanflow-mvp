# Deployment

## Production URL

```txt
https://urbanflow-mvp.vercel.app
```

## Deploying

From the project root:

```bash
npm run lint
npm run build
vercel --prod
```

## Vercel Project

This local project is linked to the Vercel project:

```txt
urbanflow-mvp
```

The local `.vercel/` folder is intentionally ignored by git.

## Static Assets

Model files are served from:

```txt
/model/model.json
/model/metadata.json
/model/weights.bin
```

The social preview image is served from:

```txt
/social-preview.png
```

## Cache Headers

`next.config.ts` sets long-lived cache headers for model files:

```txt
Cache-Control: public, max-age=31536000, immutable
```

This helps repeat visits load the model faster.

## Share Preview

The home page includes Open Graph and Twitter card metadata:

```txt
og:image -> https://urbanflow-mvp.vercel.app/social-preview.png
twitter:card -> summary_large_image
```

Messaging apps may cache link previews. If an old preview image appears, test in a new chat or wait for the platform cache to refresh.

## Environment Variables

The app can run without Supabase env vars, but persistence requires:

```txt
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_INSPECTION_BUCKET=inspection-images
ADMIN_DELETE_TOKEN=
```

Add these locally in `.env.local` and in Vercel Project Settings.

`ADMIN_DELETE_TOKEN` protects the destructive inspection-record delete action. Keep it server-side only.

See [SUPABASE.md](SUPABASE.md) for table and storage setup.

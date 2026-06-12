# Supabase Setup

This project can persist inspection records and uploaded images with Supabase.

## Environment Variables

Create `.env.local` locally:

```txt
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_INSPECTION_BUCKET=inspection-images
```

Also add the same variables in Vercel project settings.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client code.

## Storage Bucket

Create a public Supabase Storage bucket:

```txt
inspection-images
```

The current MVP uses public image URLs for easier review/demo sharing. For production property inspections, consider private buckets and signed URLs.

## Database Table

Run this SQL in the Supabase SQL editor:

```sql
create table if not exists public.inspection_records (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  file_name text not null,
  verdict text not null check (verdict in ('clean', 'choked', 'out-of-context', 'manual-review', 'ready')),
  label text not null,
  confidence integer not null check (confidence >= 0 and confidence <= 100),
  status text not null check (status in ('Needs review', 'Approved', 'Corrected')),
  correction text,
  quality jsonb,
  created_at timestamptz not null default now()
);

create index if not exists inspection_records_created_at_idx
  on public.inspection_records (created_at desc);

create index if not exists inspection_records_status_idx
  on public.inspection_records (status);
```

## API Routes

The app uses server-side API routes:

```txt
GET    /api/inspections
POST   /api/inspections
PATCH  /api/inspections/:id
```

If Supabase is not configured, the app falls back to the browser-only queue.

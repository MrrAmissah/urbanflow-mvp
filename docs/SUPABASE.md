# Supabase Setup

This project can persist inspection jobs, analyzed inspection records, and uploaded images with Supabase.

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
create table if not exists public.inspection_jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location_name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_records (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.inspection_jobs (id) on delete set null,
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

create index if not exists inspection_records_job_id_idx
  on public.inspection_records (job_id);

create index if not exists inspection_jobs_created_at_idx
  on public.inspection_jobs (created_at desc);
```

For an existing database that already has `inspection_records`, run:

```sql
create table if not exists public.inspection_jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location_name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inspection_records
  add column if not exists job_id uuid references public.inspection_jobs (id) on delete set null;

create index if not exists inspection_records_job_id_idx
  on public.inspection_records (job_id);
```

## API Routes

The app uses server-side API routes:

```txt
GET    /api/inspections
POST   /api/inspections
PATCH  /api/inspections/:id
GET    /api/inspection-jobs
POST   /api/inspection-jobs
GET    /api/inspection-jobs/:id
```

`GET /api/inspections` powers the persistent inspection records dashboard. `POST /api/inspections` is called after browser-based single-image or batch analysis and can include `jobId`. `PATCH /api/inspections/:id` saves reviewer corrections.

`GET /api/inspection-jobs` loads job summary data for the UI. `POST /api/inspection-jobs` creates a drone inspection session. `GET /api/inspection-jobs/:id` returns one job with its image records.

Inspection jobs improve batch drone workflows by grouping many image records under one survey session, such as one road, market, estate, or post-rainfall inspection.

If Supabase is not configured, the app falls back to the browser-only queue for the current session.

The Supabase service role key must stay server-side. Do not add it to browser code or expose it with a `NEXT_PUBLIC_` prefix.

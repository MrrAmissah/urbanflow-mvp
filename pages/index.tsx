import GutterClassifier from '@/components/GutterClassifier';
import Head from 'next/head';

export default function Home() {
  const siteUrl = 'https://urbanflow-mvp.vercel.app';
  const title = 'Team Urbanflow - Drone Gutter Detection MVP';
  const description = 'AI-powered drone gutter inspection system for choked, clean, unclear, and out-of-context images.';
  const previewImage = `${siteUrl}/social-preview.png`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={previewImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Team Urbanflow drone gutter inspection preview" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={previewImage} />
        <link rel="preload" href="/model/model.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/model/metadata.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/model/weights.bin" as="fetch" crossOrigin="anonymous" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
        <GutterClassifier />
      </main>
    </>
  );
}

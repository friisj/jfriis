import type { StockPhotoResult } from '@/lib/types/cog';

interface UnsplashPhoto {
  id: string;
  description: string | null;
  alt_description: string | null;
  urls: { regular: string; small: string; full: string };
  width: number;
  height: number;
  user: { name: string; links: { html: string } };
}

interface PexelsPhoto {
  id: number;
  alt: string;
  src: { original: string; medium: string; large: string };
  width: number;
  height: number;
  photographer: string;
  photographer_url: string;
}

export interface UnsplashSearchOptions {
  query: string;
  perPage?: number;
  color?: 'black_and_white' | 'black' | 'white' | 'yellow' | 'orange' | 'red' | 'purple' | 'magenta' | 'green' | 'teal' | 'blue';
  orientation?: 'landscape' | 'portrait' | 'squarish';
  orderBy?: 'latest' | 'relevant';
}

export async function searchUnsplash(queryOrOptions: string | UnsplashSearchOptions, perPage = 8): Promise<StockPhotoResult[]> {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) {
    console.warn('[StockSearch] UNSPLASH_ACCESS_KEY not set, skipping Unsplash');
    return [];
  }

  // Support both string and options object for backwards compatibility
  const opts: UnsplashSearchOptions = typeof queryOrOptions === 'string'
    ? { query: queryOrOptions, perPage }
    : queryOrOptions;

  const params = new URLSearchParams({
    query: opts.query,
    per_page: String(opts.perPage ?? perPage),
  });
  if (opts.color) params.set('color', opts.color);
  if (opts.orientation) params.set('orientation', opts.orientation);
  if (opts.orderBy) params.set('order_by', opts.orderBy);

  const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${apiKey}` },
  });

  if (!res.ok) {
    console.warn(`[StockSearch] Unsplash API error: ${res.status}`);
    return [];
  }

  const data = await res.json() as { results: UnsplashPhoto[] };
  return data.results.map((photo): StockPhotoResult => ({
    id: photo.id,
    url: photo.urls.regular,
    thumbnailUrl: photo.urls.small,
    source: 'unsplash',
    title: photo.description || photo.alt_description || '',
    photographer: photo.user.name,
    photographerUrl: photo.user.links.html,
    width: photo.width,
    height: photo.height,
  }));
}

export async function searchPexels(query: string, perPage = 8): Promise<StockPhotoResult[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn('[StockSearch] PEXELS_API_KEY not set, skipping Pexels');
    return [];
  }

  const params = new URLSearchParams({ query, per_page: String(perPage) });
  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    console.warn(`[StockSearch] Pexels API error: ${res.status}`);
    return [];
  }

  const data = await res.json() as { photos: PexelsPhoto[] };
  return data.photos.map((photo): StockPhotoResult => ({
    id: String(photo.id),
    url: photo.src.large,
    thumbnailUrl: photo.src.medium,
    source: 'pexels',
    title: photo.alt || '',
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    width: photo.width,
    height: photo.height,
  }));
}

export async function searchAllSources(queries: string[]): Promise<StockPhotoResult[]> {
  const allPromises = queries.flatMap((query) => [
    searchUnsplash(query),
    searchPexels(query),
  ]);

  const results = await Promise.all(allPromises);
  const combined = results.flat();

  // Deduplicate by source+id
  const seen = new Set<string>();
  return combined.filter((result) => {
    const key = `${result.source}:${result.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

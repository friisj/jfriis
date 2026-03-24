import type { CogSeries } from '@/lib/types/cog';

export interface SeriesToolLink {
  sourceType: string;
  sourceId: string;
}

export interface SeriesWithImage extends CogSeries {
  imageCount: number;
  primaryImage: {
    id: string;
    storage_path: string;
    thumbnail_256: string | null;
  } | null;
  toolLinks?: SeriesToolLink[];
}

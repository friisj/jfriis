import { notFound } from 'next/navigation';
import { getSeriesByIdServer } from '@/lib/cog/server/series';
import { getImageByIdServer, getSeriesImagesServer } from '@/lib/cog/server/images';
import { LuvImageViewer } from './image-viewer';

interface Props {
  params: Promise<{ seriesId: string; imageId: string }>;
}

export default async function LuvImageDetailPage({ params }: Props) {
  const { seriesId, imageId } = await params;

  let series;
  try {
    series = await getSeriesByIdServer(seriesId);
  } catch {
    notFound();
  }

  if (!series.tags?.includes('luv')) notFound();

  let image;
  try {
    image = await getImageByIdServer(imageId);
  } catch {
    notFound();
  }

  if (image.series_id !== seriesId) {
    notFound();
  }

  const allImages = await getSeriesImagesServer(seriesId);

  return (
    <LuvImageViewer
      seriesId={seriesId}
      imageId={imageId}
      images={allImages}
      seriesTitle={series.title.replace(/^Luv — /, '')}
    />
  );
}

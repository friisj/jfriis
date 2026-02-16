import { notFound } from 'next/navigation';
import { getImageByIdServer, getGroupPrimaryImagesServer } from '@/lib/cog-server';
import { ImageEditor } from './image-editor';

interface EditorPageProps {
  params: Promise<{
    id: string
    imageId: string
  }>
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { id: seriesId, imageId } = await params;

  const image = await getImageByIdServer(imageId);
  if (!image || image.series_id !== seriesId) {
    notFound();
  }

  const images = await getGroupPrimaryImagesServer(seriesId, null);

  return <ImageEditor seriesId={seriesId} imageId={imageId} initialImages={images} />;
}

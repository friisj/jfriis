import { notFound } from 'next/navigation'
import { getImageById } from '@/lib/cog'
import { ImageEditor } from './image-editor'

interface EditorPageProps {
  params: Promise<{
    id: string
    imageId: string
  }>
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { id: seriesId, imageId } = await params

  // Fetch the image
  const image = await getImageById(imageId)

  if (!image || image.series_id !== seriesId) {
    notFound()
  }

  return <ImageEditor seriesId={seriesId} imageId={imageId} />
}

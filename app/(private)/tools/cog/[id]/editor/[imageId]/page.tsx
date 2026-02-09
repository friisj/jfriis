import { notFound } from 'next/navigation'
import { getImageByIdServer } from '@/lib/cog-server'
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
  const image = await getImageByIdServer(imageId)

  if (!image || image.series_id !== seriesId) {
    notFound()
  }

  return <ImageEditor seriesId={seriesId} imageId={imageId} />
}

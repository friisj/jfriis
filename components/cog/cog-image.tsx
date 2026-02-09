'use client'

import Image, { type ImageProps } from 'next/image'
import { getCogImageUrl, getCogThumbnailUrl } from '@/lib/cog'

type CogImageSize = 256 | 128 | 64 | 'original'

interface CogImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  storagePath: string
  alt: string
  // Optional thumbnail paths from database
  thumbnail256?: string | null
  thumbnail128?: string | null
  thumbnail64?: string | null
  // Which size to prefer (falls back to original if not available)
  preferredSize?: CogImageSize
  // Priority for LCP images
  priority?: boolean
}

/**
 * Optimized image component for Cog images
 * Uses Next.js Image with automatic format optimization (AVIF/WebP)
 * Leverages thumbnails when available for smaller downloads
 */
export function CogImage({
  storagePath,
  alt,
  thumbnail256,
  thumbnail128,
  thumbnail64,
  preferredSize = 'original',
  priority = false,
  className,
  ...imageProps
}: CogImageProps) {
  // Select the appropriate thumbnail based on preferred size
  let src: string

  if (preferredSize === 256 && thumbnail256) {
    src = getCogThumbnailUrl(storagePath, thumbnail256, 256)
  } else if (preferredSize === 128 && thumbnail128) {
    src = getCogThumbnailUrl(storagePath, thumbnail128, 128)
  } else if (preferredSize === 64 && thumbnail64) {
    src = getCogThumbnailUrl(storagePath, thumbnail64, 64)
  } else {
    // Fall back to original or best available thumbnail
    if (thumbnail256) {
      src = getCogThumbnailUrl(storagePath, thumbnail256, 256)
    } else if (thumbnail128) {
      src = getCogThumbnailUrl(storagePath, thumbnail128, 128)
    } else {
      src = getCogImageUrl(storagePath)
    }
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      priority={priority}
      {...imageProps}
    />
  )
}

/**
 * CogImage optimized for grid thumbnails (256px)
 */
export function CogGridImage({
  storagePath,
  alt,
  thumbnail256,
  thumbnail128,
  className,
  ...props
}: Omit<CogImageProps, 'preferredSize'>) {
  return (
    <CogImage
      storagePath={storagePath}
      alt={alt}
      thumbnail256={thumbnail256}
      thumbnail128={thumbnail128}
      preferredSize={256}
      className={className}
      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      {...props}
    />
  )
}

/**
 * CogImage optimized for group drawer thumbnails (128px)
 */
export function CogDrawerImage({
  storagePath,
  alt,
  thumbnail128,
  thumbnail64,
  className,
  ...props
}: Omit<CogImageProps, 'preferredSize'>) {
  return (
    <CogImage
      storagePath={storagePath}
      alt={alt}
      thumbnail128={thumbnail128}
      thumbnail64={thumbnail64}
      preferredSize={128}
      className={className}
      sizes="128px"
      {...props}
    />
  )
}

/**
 * CogImage optimized for tiny previews (64px)
 */
export function CogTinyImage({
  storagePath,
  alt,
  thumbnail64,
  className,
  ...props
}: Omit<CogImageProps, 'preferredSize'>) {
  return (
    <CogImage
      storagePath={storagePath}
      alt={alt}
      thumbnail64={thumbnail64}
      preferredSize={64}
      className={className}
      sizes="64px"
      {...props}
    />
  )
}

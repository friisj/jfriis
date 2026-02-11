'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePrivacyMode, filterPrivateRecords } from '@/lib/privacy-mode'
import { getCogThumbnailUrl } from '@/lib/cog'
import { ConfigLibrary } from './config-library'
import type { CogSeries } from '@/lib/types/cog'
import type { CogImage } from '@/lib/types/cog'

interface SeriesWithImage extends CogSeries {
  primaryImage?: CogImage | null
  imageCount?: number
}

export default function CogPage() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') || 'series'
  const [allSeries, setAllSeries] = useState<SeriesWithImage[]>([])
  const [loading, setLoading] = useState(true)
  const { isPrivacyMode } = usePrivacyMode()

  // Load series with their primary images
  useEffect(() => {
    async function loadSeries() {
      // Fetch series
      const { data: seriesData, error: seriesError } = await (supabase as any)
        .from('cog_series')
        .select('*')
        .is('parent_id', null)
        .order('updated_at', { ascending: false })

      if (seriesError || !seriesData) {
        setLoading(false)
        return
      }

      // For each series, fetch its primary image and count
      const seriesWithImages = await Promise.all(
        (seriesData as CogSeries[]).map(async (s) => {
          // Get image count
          const { count } = await (supabase as any)
            .from('cog_images')
            .select('*', { count: 'exact', head: true })
            .eq('series_id', s.id)

          // Get primary image if set, otherwise get the newest image
          let primaryImage = null
          if (s.primary_image_id) {
            const { data: img } = await (supabase as any)
              .from('cog_images')
              .select('*')
              .eq('id', s.primary_image_id)
              .single()
            primaryImage = img
          } else {
            const { data: img } = await (supabase as any)
              .from('cog_images')
              .select('*')
              .eq('series_id', s.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
            primaryImage = img
          }

          return {
            ...s,
            primaryImage,
            imageCount: count || 0,
          } as SeriesWithImage
        })
      )

      setAllSeries(seriesWithImages)
      setLoading(false)
    }
    loadSeries()
  }, [])

  // Filter based on privacy mode
  const series = filterPrivateRecords(allSeries, isPrivacyMode)

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Tabs defaultValue={defaultTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="series">Series</TabsTrigger>
            <TabsTrigger value="library">Config Library</TabsTrigger>
          </TabsList>
          <Button asChild>
            <Link href="/tools/cog/new">New Series</Link>
          </Button>
        </div>

        <TabsContent value="series" className="mt-6">
          {series.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-muted-foreground mb-4">
                  No series yet. Create your first series to get started.
                </p>
                <Button asChild variant="outline">
                  <Link href="/tools/cog/new">Create Series</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {series.map((s) => (
                <Link key={s.id} href={`/tools/cog/${s.id}`} className="block">
                  <Card className="overflow-hidden transition-colors hover:bg-accent py-0 space-y-0 gap-0">
                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                      {s.primaryImage ? (
                        <img
                          src={getCogThumbnailUrl(
                            s.primaryImage.storage_path,
                            s.primaryImage.thumbnail_256,
                            256
                          )}
                          alt={s.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <CardContent className="px-4 pt-3 pb-5">
                      <h2 className="font-semibold mb-1">{s.title}</h2>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{s.imageCount || 0} images</span>
                        {s.tags.length > 0 && (
                          <>
                            <span>·</span>
                            <span>{s.tags.length} tags</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          <ConfigLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}

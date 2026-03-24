import { notFound } from 'next/navigation';
import {
  getChassisModuleBySlugServer,
  getChassisModulesServer,
  getStudiesForModuleServer,
} from '@/lib/luv-chassis-server';
import { getLuvSeriesServer, getModuleTagIdServer } from '@/lib/luv/cog-integration-server';
import { getImagesWithTagsServer } from '@/lib/cog/server/tags';
import { ChassisModulePageClient } from '../../components/chassis-module-page-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ChassisModulePage({ params }: Props) {
  const { slug } = await params;
  const [chassisModule, allModules] = await Promise.all([
    getChassisModuleBySlugServer(slug),
    getChassisModulesServer(),
  ]);

  if (!chassisModule) {
    notFound();
  }

  // Fetch module media from chassis series, filtered by module tag
  const seriesId = await getLuvSeriesServer('chassis');
  const moduleTagId = await getModuleTagIdServer(slug);
  const [allImages, studies] = await Promise.all([
    getImagesWithTagsServer(seriesId),
    getStudiesForModuleServer(chassisModule.id),
  ]);
  // Filter to images tagged with this module
  const media = allImages.filter((img) =>
    img.tags.some((t) => t.id === moduleTagId)
  );

  // Build study locks from completed studies with constraints
  const studyLocks = studies
    .filter((s) => Object.keys(s.parameter_constraints).length > 0)
    .map((s) => ({
      studySlug: s.slug,
      studyTitle: s.title,
      constraints: s.parameter_constraints,
    }));

  return (
    <div className="h-full">
      <ChassisModulePageClient
        module={chassisModule}
        allModules={allModules}
        studyLocks={studyLocks}
        initialMedia={media}
      />
    </div>
  );
}

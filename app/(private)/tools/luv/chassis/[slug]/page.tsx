import { notFound } from 'next/navigation';
import {
  getChassisModuleBySlugServer,
  getChassisModulesServer,
  getStudiesForModuleServer,
} from '@/lib/luv-chassis-server';
import { getLuvSeriesServer } from '@/lib/luv/cog-integration-server';
import { getSeriesImagesServer } from '@/lib/cog/server/images';
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

  // Fetch module media from cog_images series
  const seriesId = await getLuvSeriesServer(`module:${slug}`);
  const [media, studies] = await Promise.all([
    getSeriesImagesServer(seriesId),
    getStudiesForModuleServer(chassisModule.id),
  ]);

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

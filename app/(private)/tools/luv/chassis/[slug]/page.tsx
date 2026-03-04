import { notFound } from 'next/navigation';
import {
  getChassisModuleBySlugServer,
  getChassisModuleMediaServer,
  getChassisModulesServer,
  getStudiesForModuleServer,
} from '@/lib/luv-chassis-server';
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

  const [media, studies] = await Promise.all([
    getChassisModuleMediaServer(chassisModule.id),
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
    <div className="container px-4 py-8 max-w-xl">
      <ChassisModulePageClient
        module={chassisModule}
        allModules={allModules}
        studyLocks={studyLocks}
        initialMedia={media}
      />
    </div>
  );
}

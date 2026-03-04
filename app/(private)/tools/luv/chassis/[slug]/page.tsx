import { notFound } from 'next/navigation';
import { getChassisModuleBySlugServer, getChassisModuleMediaServer } from '@/lib/luv-chassis-server';
import { ChassisModulePageClient } from '../../components/chassis-module-page-client';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ChassisModulePage({ params }: Props) {
  const { slug } = await params;
  const chassisModule = await getChassisModuleBySlugServer(slug);

  if (!chassisModule) {
    notFound();
  }

  const media = await getChassisModuleMediaServer(chassisModule.id);

  return (
    <div className="container px-4 py-8 max-w-xl">
      <ChassisModulePageClient module={chassisModule} initialMedia={media} />
    </div>
  );
}

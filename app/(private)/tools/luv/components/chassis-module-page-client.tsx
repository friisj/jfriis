'use client';

import { ModuleEditor } from './module-editor';
import { ModuleMediaGallery } from './module-media-gallery';
import { ModuleVersionHistory } from './module-version-history';
import { Separator } from '@/components/ui/separator';
import { getSchema } from '@/lib/luv/chassis-schemas';
import type { LuvChassisModule, LuvChassisModuleMedia } from '@/lib/types/luv-chassis';

interface Props {
  module: LuvChassisModule;
  initialMedia?: LuvChassisModuleMedia[];
}

export function ChassisModulePageClient({ module, initialMedia = [] }: Props) {
  const schema = getSchema(module.schema_key);
  const parameterKeys = schema?.parameters.map((p) => p.key) ?? [];

  return (
    <>
      <ModuleEditor
        key={module.id}
        module={module}
        onSaved={() => window.location.reload()}
      />
      {parameterKeys.length > 0 && (
        <>
          <Separator className="my-8" />
          <ModuleMediaGallery
            moduleId={module.id}
            moduleSlug={module.slug}
            initialMedia={initialMedia}
            parameterKeys={parameterKeys}
          />
        </>
      )}
      <Separator className="my-8" />
      <ModuleVersionHistory
        moduleId={module.id}
        moduleSchemaKey={module.schema_key}
        currentVersion={module.current_version}
        onRestored={() => window.location.reload()}
      />
    </>
  );
}

'use client';

import { ModuleEditor } from './module-editor';
import type { LuvChassisModule } from '@/lib/types/luv-chassis';

interface Props {
  module: LuvChassisModule;
}

export function ChassisModulePageClient({ module }: Props) {
  return (
    <ModuleEditor
      key={module.id}
      module={module}
      onSaved={() => window.location.reload()}
    />
  );
}

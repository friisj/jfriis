'use client';

import { ModuleEditor } from './module-editor';
import { ModuleMediaGallery } from './module-media-gallery';
import { ModuleVersionHistory } from './module-version-history';
import { ContextPackComposer } from './context-pack-composer';
import { Separator } from '@/components/ui/separator';
import type { LuvChassisModule, LuvChassisModuleMedia, ParameterConstraint } from '@/lib/types/luv-chassis';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface StudyLock {
  studySlug: string;
  studyTitle: string;
  constraints: Record<string, ParameterConstraint>;
}

interface Props {
  module: LuvChassisModule;
  allModules?: LuvChassisModule[];
  studyLocks?: StudyLock[];
  initialMedia?: LuvChassisModuleMedia[];
}

export function ChassisModulePageClient({ module, allModules = [], studyLocks = [], initialMedia = [] }: Props) {
  const parameterKeys = (module.parameter_schema ?? []).map((p) => p.key);

  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value="parameters">Parameters</TabsTrigger>
        <TabsTrigger value="media">Media</TabsTrigger>
        <TabsTrigger value="schema">Schema</TabsTrigger>
        <TabsTrigger value="context">Context</TabsTrigger>
        <TabsTrigger value="versions">Versions</TabsTrigger>
      </TabsList>
      <ModuleEditor
        key={module.id}
        module={module}
        allModules={allModules}
        studyLocks={studyLocks}
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
      <ContextPackComposer
        module={module}
        allModules={allModules}
      />
      <Separator className="my-8" />
      <ModuleVersionHistory
        moduleId={module.id}
        parameterSchema={module.parameter_schema}
        currentVersion={module.current_version}
        onRestored={() => window.location.reload()}
      />
    </Tabs>
  );
}

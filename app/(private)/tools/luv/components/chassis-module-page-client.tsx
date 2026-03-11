'use client';

import { ModuleEditor } from './module-editor';
import { ModuleMediaGallery } from './module-media-gallery';
import { ModuleVersionHistory } from './module-version-history';
import { ContextPackComposer } from './context-pack-composer';
import type { LuvChassisModule, LuvChassisModuleMedia, ParameterConstraint } from '@/lib/types/luv-chassis';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

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
    <div>

      {/* Tabs */}
      <Tabs defaultValue="parameters">
        <TabsList className="mb-0 pb-0">
          <TabsTrigger value="parameters">Parameters</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="context">Context</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>


        {/* Header */}
        <div className="pt-6 px-6 pb-6 border-t">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <h3 className="text-5xl font-semibold">{module.name}</h3>
              <div className="flex items-baseline gap-2">
                <Badge variant="outline" className="text-xs">
                  v{module.current_version}
                </Badge>
                {module.description && (
                  <p className="text-sm text-foreground">{module.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <TabsContent value="parameters">
          <ModuleEditor
            key={module.id}
            module={module}
            allModules={allModules}
            studyLocks={studyLocks}
            onSaved={() => window.location.reload()}
          />
        </TabsContent>

        <TabsContent value="media">
          {parameterKeys.length > 0 ? (
            <ModuleMediaGallery
              moduleId={module.id}
              moduleSlug={module.slug}
              initialMedia={initialMedia}
              parameterKeys={parameterKeys}
            />
          ) : (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              No parameters defined — add parameters first to attach media.
            </p>
          )}
        </TabsContent>

        <TabsContent value="context">
          <ContextPackComposer
            module={module}
            allModules={allModules}
          />
        </TabsContent>

        <TabsContent value="versions">
          <ModuleVersionHistory
            moduleId={module.id}
            parameterSchema={module.parameter_schema}
            currentVersion={module.current_version}
            onRestored={() => window.location.reload()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

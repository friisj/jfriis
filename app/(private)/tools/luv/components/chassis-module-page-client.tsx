'use client';

import { ModuleEditor } from './module-editor';
import { ModuleVersionHistory } from './module-version-history';
import { ContextPackComposer } from './context-pack-composer';
import { StagePlayer } from '../stage/components/stage-player';
import { SeriesImageGrid } from '../media/[seriesId]/series-image-grid';
import type { LuvChassisModule, ParameterConstraint } from '@/lib/types/luv-chassis';
import type { CogImage, CogTagWithGroup } from '@/lib/types/cog';
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
  initialMedia?: CogImage[];
  seriesId?: string;
  enabledTags?: CogTagWithGroup[];
  defaultTagId?: string;
}

export function ChassisModulePageClient({ module, allModules = [], studyLocks = [], initialMedia = [], seriesId, enabledTags = [], defaultTagId }: Props) {
  const parameterKeys = (module.parameter_schema ?? []).map((p) => p.key);

  return (
    <Tabs defaultValue="parameters" className="h-full overflow-hidden">
      <TabsList className="mb-0 pb-0">
        <TabsTrigger className="px-6" value="parameters">Parameters</TabsTrigger>
        <TabsTrigger className="px-6" value="media">Media</TabsTrigger>
        <TabsTrigger className="px-6" value="stage">Stage</TabsTrigger>
        <TabsTrigger className="px-6" value="context">Context</TabsTrigger>
        <TabsTrigger className="px-6" value="versions">Versions</TabsTrigger>
      </TabsList>


      {/* Header */}
      <div className="pt-5 px-6 pb-6 min-h-60 flex flex-col justify-between border-b">
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
      <TabsContent value="parameters" className="flex-1 overflow-y-scroll">
        <ModuleEditor
          key={module.id}
          module={module}
          allModules={allModules}
          studyLocks={studyLocks}
          onSaved={() => window.location.reload()}
        />
      </TabsContent>

      <TabsContent value="media">
        {seriesId ? (
          <div className="p-6">
            <SeriesImageGrid
              seriesId={seriesId}
              initialImages={initialMedia}
              seriesTitle={module.name}
              enabledTags={enabledTags}
              defaultActiveTagId={defaultTagId}
            />
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-muted-foreground">
            Chassis series not yet provisioned. Upload an image to get started.
          </p>
        )}
      </TabsContent>

      <TabsContent value="stage" className="h-[500px]">
        <StagePlayer constrainToModule={module.slug} compact />
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
  );
}

import { getTagGroupsWithTagsServer, getUngroupedTagsServer } from '@/lib/cog-server';
import { TagManager } from './tag-manager';
import type { CogTagGroupWithTags, CogTag } from '@/lib/types/cog';

export default async function TagsPage() {
  let groups: CogTagGroupWithTags[] = [];
  let ungroupedTags: CogTag[] = [];

  try {
    [groups, ungroupedTags] = await Promise.all([
      getTagGroupsWithTagsServer(),
      getUngroupedTagsServer(),
    ]);
  } catch (error) {
    // Tables may not exist yet
    console.warn('Tags tables not available:', error);
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Image Tags</h1>
        <p className="text-muted-foreground mt-2">
          Manage tag groups and global tags for organizing images across all series
        </p>
      </div>

      <TagManager initialGroups={groups} initialUngroupedTags={ungroupedTags} />
    </div>
  );
}

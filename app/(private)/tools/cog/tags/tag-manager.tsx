'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createTagGroup,
  updateTagGroup,
  deleteTagGroup,
  createTag,
  updateTag,
  deleteTag,
} from '@/lib/cog';
import type { CogTagGroup, CogTag, CogTagGroupWithTags } from '@/lib/types/cog';

const PRESET_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
];

interface TagManagerProps {
  initialGroups: CogTagGroupWithTags[];
  initialUngroupedTags: CogTag[];
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`w-6 h-6 rounded border-2 ${
          value === null ? 'border-primary' : 'border-transparent'
        } bg-muted flex items-center justify-center text-xs`}
        title="No color"
      >
        -
      </button>
      {PRESET_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={`w-6 h-6 rounded border-2 ${
            value === color.value ? 'border-primary' : 'border-transparent'
          }`}
          style={{ backgroundColor: color.value }}
          title={color.name}
        />
      ))}
    </div>
  );
}

function TagGroupForm({
  group,
  onSave,
  onCancel,
}: {
  group?: CogTagGroup;
  onSave: (data: { name: string; color: string | null }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(group?.name || '');
  const [color, setColor] = useState<string | null>(group?.color || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), color });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="group-name">Name</Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Quality, Subject, Mood"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : group ? 'Update' : 'Create'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function TagForm({
  tag,
  groups,
  onSave,
  onCancel,
}: {
  tag?: CogTag;
  groups: CogTagGroup[];
  onSave: (data: { name: string; shortcut: string | null; color: string | null; group_id: string | null }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(tag?.name || '');
  const [shortcut, setShortcut] = useState(tag?.shortcut || '');
  const [color, setColor] = useState<string | null>(tag?.color || null);
  const [groupId, setGroupId] = useState<string | null>(tag?.group_id || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate shortcut (should be single character)
    const shortcutVal = shortcut.trim();
    if (shortcutVal && shortcutVal.length > 1) {
      setError('Shortcut must be a single character');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        shortcut: shortcutVal || null,
        color,
        group_id: groupId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="tag-name">Name</Label>
        <Input
          id="tag-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Best, Portrait, Moody"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tag-group">Group</Label>
        <Select value={groupId || '_none'} onValueChange={(v) => setGroupId(v === '_none' ? null : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">No group</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                <span className="flex items-center gap-2">
                  {g.color && (
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: g.color }}
                    />
                  )}
                  {g.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tag-shortcut">Keyboard Shortcut</Label>
        <Input
          id="tag-shortcut"
          value={shortcut}
          onChange={(e) => setShortcut(e.target.value.slice(-1))}
          placeholder="e.g., 1, a, b"
          maxLength={1}
          className="w-20"
        />
        <p className="text-xs text-muted-foreground">
          Single key to quickly apply this tag in the lightbox
        </p>
      </div>

      <div className="space-y-2">
        <Label>Color (overrides group color)</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : tag ? 'Update' : 'Create'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function TagBadge({
  tag,
  groupColor,
  onClick,
}: {
  tag: CogTag;
  groupColor?: string | null;
  onClick?: () => void;
}) {
  const color = tag.color || groupColor;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm border hover:bg-muted/50 transition-colors"
      style={{
        borderColor: color || undefined,
        backgroundColor: color ? `${color}20` : undefined,
      }}
    >
      {tag.shortcut && (
        <kbd className="text-xs px-1 py-0.5 bg-muted rounded font-mono">
          {tag.shortcut}
        </kbd>
      )}
      <span>{tag.name}</span>
    </button>
  );
}

export function TagManager({ initialGroups, initialUngroupedTags }: TagManagerProps) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [ungroupedTags, setUngroupedTags] = useState(initialUngroupedTags);

  // Dialog state
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CogTagGroup | null>(null);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<CogTag | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<CogTagGroup | null>(null);
  const [deletingTag, setDeletingTag] = useState<CogTag | null>(null);

  // Group CRUD handlers
  async function handleSaveGroup(data: { name: string; color: string | null }) {
    if (editingGroup) {
      const updated = await updateTagGroup(editingGroup.id, data);
      setGroups((prev) =>
        prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g))
      );
    } else {
      const created = await createTagGroup(data);
      setGroups((prev) => [...prev, { ...created, tags: [] }]);
    }
    setShowGroupDialog(false);
    setEditingGroup(null);
    router.refresh();
  }

  async function handleDeleteGroup() {
    if (!deletingGroup) return;
    await deleteTagGroup(deletingGroup.id);
    // Move tags from this group to ungrouped
    const tagsInGroup = groups.find((g) => g.id === deletingGroup.id)?.tags || [];
    setUngroupedTags((prev) => [...prev, ...tagsInGroup.map((t) => ({ ...t, group_id: null }))]);
    setGroups((prev) => prev.filter((g) => g.id !== deletingGroup.id));
    setDeletingGroup(null);
    router.refresh();
  }

  // Tag CRUD handlers
  async function handleSaveTag(data: { name: string; shortcut: string | null; color: string | null; group_id: string | null }) {
    if (editingTag) {
      const updated = await updateTag(editingTag.id, data);
      // Update in correct location
      if (data.group_id) {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id === data.group_id) {
              // Add/update in this group
              const existingIndex = g.tags.findIndex((t) => t.id === updated.id);
              if (existingIndex >= 0) {
                return { ...g, tags: g.tags.map((t) => (t.id === updated.id ? updated : t)) };
              } else {
                return { ...g, tags: [...g.tags, updated] };
              }
            } else if (g.id === editingTag.group_id) {
              // Remove from old group
              return { ...g, tags: g.tags.filter((t) => t.id !== updated.id) };
            }
            return g;
          })
        );
        setUngroupedTags((prev) => prev.filter((t) => t.id !== updated.id));
      } else {
        // Move to ungrouped
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            tags: g.tags.filter((t) => t.id !== updated.id),
          }))
        );
        setUngroupedTags((prev) => {
          const existingIndex = prev.findIndex((t) => t.id === updated.id);
          if (existingIndex >= 0) {
            return prev.map((t) => (t.id === updated.id ? updated : t));
          } else {
            return [...prev, updated];
          }
        });
      }
    } else {
      const created = await createTag(data);
      if (data.group_id) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === data.group_id ? { ...g, tags: [...g.tags, created] } : g
          )
        );
      } else {
        setUngroupedTags((prev) => [...prev, created]);
      }
    }
    setShowTagDialog(false);
    setEditingTag(null);
    router.refresh();
  }

  async function handleDeleteTag() {
    if (!deletingTag) return;
    await deleteTag(deletingTag.id);
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        tags: g.tags.filter((t) => t.id !== deletingTag.id),
      }))
    );
    setUngroupedTags((prev) => prev.filter((t) => t.id !== deletingTag.id));
    setDeletingTag(null);
    router.refresh();
  }

  const allGroups = groups.map((g) => ({ id: g.id, name: g.name, color: g.color, position: g.position, created_at: g.created_at }));

  return (
    <div className="space-y-8">
      {/* Header actions */}
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href="/tools/cog">Back to Series</Link>
        </Button>
        <div className="flex-1" />
        <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              onClick={() => {
                setEditingGroup(null);
                setShowGroupDialog(true);
              }}
            >
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGroup ? 'Edit Group' : 'New Group'}</DialogTitle>
            </DialogHeader>
            <TagGroupForm
              group={editingGroup || undefined}
              onSave={handleSaveGroup}
              onCancel={() => {
                setShowGroupDialog(false);
                setEditingGroup(null);
              }}
            />
          </DialogContent>
        </Dialog>
        <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingTag(null);
                setShowTagDialog(true);
              }}
            >
              New Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTag ? 'Edit Tag' : 'New Tag'}</DialogTitle>
            </DialogHeader>
            <TagForm
              tag={editingTag || undefined}
              groups={allGroups}
              onSave={handleSaveTag}
              onCancel={() => {
                setShowTagDialog(false);
                setEditingTag(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tag groups */}
      {groups.length === 0 && ungroupedTags.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">
            No tags yet. Create tag groups to organize your tags.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="border rounded-lg p-4"
              style={{
                borderLeftWidth: 4,
                borderLeftColor: group.color || undefined,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  {group.color && (
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  {group.name}
                  <span className="text-sm text-muted-foreground font-normal">
                    ({group.tags.length} tags)
                  </span>
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingGroup(group);
                      setShowGroupDialog(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeletingGroup(group)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.tags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    groupColor={group.color}
                    onClick={() => {
                      setEditingTag(tag);
                      setShowTagDialog(true);
                    }}
                  />
                ))}
                {group.tags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags in this group</p>
                )}
              </div>
            </div>
          ))}

          {/* Ungrouped tags */}
          {ungroupedTags.length > 0 && (
            <div className="border rounded-lg p-4 border-dashed">
              <h3 className="font-semibold mb-3">
                Ungrouped
                <span className="text-sm text-muted-foreground font-normal ml-2">
                  ({ungroupedTags.length} tags)
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {ungroupedTags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    onClick={() => {
                      setEditingTag(tag);
                      setShowTagDialog(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete group confirmation dialog */}
      <Dialog open={!!deletingGroup} onOpenChange={() => setDeletingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the group "{deletingGroup?.name}"?
          </p>
          <p className="text-sm text-muted-foreground">
            Tags in this group will become ungrouped (not deleted).
          </p>
          <div className="flex gap-2 pt-4">
            <Button variant="destructive" onClick={handleDeleteGroup}>
              Delete Group
            </Button>
            <Button variant="outline" onClick={() => setDeletingGroup(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete tag confirmation dialog */}
      <Dialog open={!!deletingTag} onOpenChange={() => setDeletingTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the tag "{deletingTag?.name}"?
          </p>
          <p className="text-sm text-muted-foreground">
            This will remove the tag from all images that have it.
          </p>
          <div className="flex gap-2 pt-4">
            <Button variant="destructive" onClick={handleDeleteTag}>
              Delete Tag
            </Button>
            <Button variant="outline" onClick={() => setDeletingTag(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// @ts-nocheck
'use client';

/**
 * Sound Collections Page - /sound/effects/collections
 *
 * Manage sound collections and assign sounds to gameplay events.
 *
 * Features:
 * - View all collections (system, public, user)
 * - See 17 gameplay event slots per collection
 * - Assign sounds from library to events
 * - Set active collection
 * - Create, duplicate, rename, delete collections
 * - Preview sounds in context
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
// TODO: adapt to jfriis auth
// import { useAuthStore } from '@/lib/auth/store';
const useAuthStore = () => ({ isAuthenticated: false, userId: null as string | null, initialize: () => {} });
import {
  loadSystemSoundCollections,
  loadPublicSoundCollections,
  loadUserSoundCollections,
  loadActiveCollection,
  setActiveCollection,
  saveSoundCollection,
  deleteSoundCollection,
  duplicateSoundCollection,
} from '@/lib/studio/ludo/supabase/sound-collections';
import {
  loadCollectionAssignments,
  assignSound,
  removeAssignment,
} from '@/lib/studio/ludo/supabase/sound-assignments';
import {
  SoundCollectionRow,
  SoundAssignmentRow,
  GameplayEventType,
} from '@/lib/studio/ludo/supabase/types';
import { soundLibrary, SoundEntry, initializeSoundLibrary } from '@/lib/studio/ludo/audio/sound-library';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { gameSoundHooks } from '@/lib/studio/ludo/audio/GameSoundHooks';
import Link from 'next/link';

// All 17 gameplay events
const GAMEPLAY_EVENTS: { event: GameplayEventType; label: string; description: string; category: string }[] = [
  { event: 'dice_roll', label: 'Dice Roll', description: 'Initial dice throw', category: 'Dice' },
  { event: 'dice_bounce', label: 'Dice Bounce', description: 'Bounce on board', category: 'Dice' },
  { event: 'dice_settle', label: 'Dice Settle', description: 'Final resting sound', category: 'Dice' },
  { event: 'checker_pickup', label: 'Checker Pickup', description: 'Picking up a checker', category: 'Checker' },
  { event: 'checker_slide', label: 'Checker Slide', description: 'Movement across board', category: 'Checker' },
  { event: 'checker_place', label: 'Checker Place', description: 'Landing on point', category: 'Checker' },
  { event: 'checker_select', label: 'Checker Select', description: 'Selecting a checker', category: 'Checker' },
  { event: 'hit_impact', label: 'Hit Impact', description: 'Capturing opponent', category: 'Hit' },
  { event: 'bear_off', label: 'Bear Off', description: 'Removing from board', category: 'Bear Off' },
  { event: 'game_win', label: 'Game Win', description: 'Single game victory', category: 'Victory' },
  { event: 'game_loss', label: 'Game Loss', description: 'Single game defeat', category: 'Victory' },
  { event: 'match_win', label: 'Match Win', description: 'Match victory', category: 'Victory' },
  { event: 'button_click', label: 'Button Click', description: 'UI button press', category: 'UI' },
  { event: 'panel_open', label: 'Panel Open', description: 'Panel opening', category: 'UI' },
  { event: 'panel_close', label: 'Panel Close', description: 'Panel closing', category: 'UI' },
  { event: 'invalid_wrong_player', label: 'Invalid: Wrong Player', description: 'Not your turn', category: 'Invalid' },
  { event: 'invalid_cannot_move', label: 'Invalid: Cannot Move', description: 'Illegal move', category: 'Invalid' },
];

export default function CollectionsPage() {
  const searchParams = useSearchParams();
  const selectedCollectionId = searchParams.get('id');

  // State
  const [collections, setCollections] = useState<SoundCollectionRow[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<SoundCollectionRow[]>([]);
  const [activeCollection, setActiveCollectionState] = useState<SoundCollectionRow | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<SoundCollectionRow | null>(null);
  const [assignments, setAssignments] = useState<SoundAssignmentRow[]>([]);
  const [availableSounds, setAvailableSounds] = useState<SoundEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  // UI State
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [assigningEvent, setAssigningEvent] = useState<GameplayEventType | null>(null);
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const { user } = useAuthStore();

  // Initialize audio and sound library
  useEffect(() => {
    const initAudio = async () => {
      if (!gameSoundHooks.isReady()) {
        try {
          await gameSoundHooks.initialize();
          await gameSoundHooks.loadSounds();
          await initializeSoundLibrary();
          setIsInitialized(true);

          // Load available sounds from code library
          setAvailableSounds(Object.values(soundLibrary));
        } catch (err) {
          console.error('Failed to initialize audio:', err);
        }
      } else {
        setIsInitialized(true);
        // Load available sounds from code library
        setAvailableSounds(Object.values(soundLibrary));
      }
    };
    initAudio();
  }, []);

  // Load all collections and sounds
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load collections from database
      const [systemResult, publicResult, userResult, activeResult] = await Promise.all([
        loadSystemSoundCollections(),
        loadPublicSoundCollections(),
        loadUserSoundCollections(),
        loadActiveCollection(),
      ]);

      const allCollections: SoundCollectionRow[] = [];

      if (systemResult.success) {
        allCollections.push(...systemResult.data);
      }

      if (publicResult.success) {
        const publicOnly = publicResult.data.filter(
          p => !allCollections.some(c => c.id === p.id)
        );
        allCollections.push(...publicOnly);
      }

      if (userResult.success) {
        const userOnly = userResult.data.filter(
          u => !allCollections.some(c => c.id === u.id)
        );
        allCollections.push(...userOnly);
      }

      setCollections(allCollections);

      if (activeResult.success && activeResult.data) {
        setActiveCollectionState(activeResult.data);
      }

      // Available sounds are loaded from code library in init (no database query needed)

      // Auto-select collection from URL or active collection
      if (selectedCollectionId) {
        const found = allCollections.find(c => c.id === selectedCollectionId);
        if (found) {
          setSelectedCollection(found);
        }
      } else if (activeResult.success && activeResult.data) {
        setSelectedCollection(activeResult.data);
      } else if (allCollections.length > 0) {
        setSelectedCollection(allCollections[0]);
      }

    } catch (err) {
      setError('Failed to load collections');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCollectionId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Load assignments when collection is selected
  useEffect(() => {
    if (!selectedCollection) {
      setAssignments([]);
      return;
    }

    const loadAssignments = async () => {
      setIsLoadingAssignments(true);
      try {
        const result = await loadCollectionAssignments(selectedCollection.id);
        if (result.success) {
          setAssignments(result.data);
        }
      } catch (err) {
        console.error('Failed to load assignments:', err);
      } finally {
        setIsLoadingAssignments(false);
      }
    };

    loadAssignments();
  }, [selectedCollection]);

  // Show all collections (no filtering)
  useEffect(() => {
    setFilteredCollections(collections);
  }, [collections]);

  // Play sound preview (from code-based sound library)
  const handlePlaySound = (sound: SoundEntry) => {
    setPlayingSound(sound.metadata.id);
    sound.play();
    setTimeout(() => setPlayingSound(null), 1000);
  };

  // Assign sound to event
  const handleAssignSound = async (gameplayEvent: GameplayEventType, soundLibraryId: string) => {
    if (!selectedCollection) return;

    const result = await assignSound({
      collection_id: selectedCollection.id,
      sound_library_id: soundLibraryId,
      gameplay_event: gameplayEvent,
      playback_config: {},
    });

    if (result.success) {
      // Reload assignments
      const assignmentsResult = await loadCollectionAssignments(selectedCollection.id);
      if (assignmentsResult.success) {
        setAssignments(assignmentsResult.data);
      }

      // If this collection is active, reload it in the audio system
      if (selectedCollection.is_active) {
        try {
          await gameSoundHooks.switchToActiveCollection();
          console.log('[Collections] Audio system reloaded after assignment');
        } catch (err) {
          console.error('[Collections] Failed to reload audio system:', err);
        }
      }

      setAssigningEvent(null);
    } else {
      alert(`Failed to assign sound: ${result.error.message}`);
    }
  };

  // Remove assignment
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this override and use Primitive sound?')) return;

    const result = await removeAssignment(assignmentId);
    if (result.success && selectedCollection) {
      const assignmentsResult = await loadCollectionAssignments(selectedCollection.id);
      if (assignmentsResult.success) {
        setAssignments(assignmentsResult.data);
      }

      // If this collection is active, reload it in the audio system
      if (selectedCollection.is_active) {
        try {
          await gameSoundHooks.switchToActiveCollection();
          console.log('[Collections] Audio system reloaded after removal');
        } catch (err) {
          console.error('[Collections] Failed to reload audio system:', err);
        }
      }
    } else if (!result.success) {
      alert(`Failed to remove assignment: ${result.error.message}`);
    }
  };

  // Set as active collection
  const handleSetActive = async (collection: SoundCollectionRow) => {
    const result = await setActiveCollection(collection.id);
    if (result.success) {
      await loadAllData();

      // Notify the audio system to switch to the new active collection
      try {
        await gameSoundHooks.switchToActiveCollection();
        console.log(`[Collections] Audio system switched to: ${collection.name}`);
      } catch (err) {
        console.error('[Collections] Failed to switch audio collection:', err);
      }
    } else {
      alert(`Failed to set active: ${result.error.message}`);
    }
  };

  // Create new collection
  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      alert('Please enter a collection name');
      return;
    }

    const result = await saveSoundCollection({
      name: newCollectionName,
      is_active: false,
      is_public: false,
    });

    if (result.success) {
      setCreatingNew(false);
      setNewCollectionName('');
      await loadAllData();
      setSelectedCollection(result.data);
    } else {
      alert(`Failed to create collection: ${result.error.message}`);
    }
  };

  // Duplicate collection
  const handleDuplicate = async (collection: SoundCollectionRow) => {
    const result = await duplicateSoundCollection(collection.id, `${collection.name} (Copy)`);
    if (result.success) {
      await loadAllData();
      setSelectedCollection(result.data);
    } else {
      alert(`Failed to duplicate: ${result.error.message}`);
    }
  };

  // Delete collection
  const handleDelete = async (collection: SoundCollectionRow) => {
    if (!confirm(`Delete "${collection.name}"? This will remove all sound assignments.`)) {
      return;
    }

    const result = await deleteSoundCollection(collection.id);
    if (result.success) {
      if (selectedCollection?.id === collection.id) {
        setSelectedCollection(null);
      }
      await loadAllData();
    } else {
      alert(`Failed to delete: ${result.error.message}`);
    }
  };

  // Rename collection
  const handleStartEdit = (collection: SoundCollectionRow) => {
    setEditingCollection(collection.id);
    setEditName(collection.name);
  };

  const handleSaveEdit = async (collection: SoundCollectionRow) => {
    if (!editName.trim() || editName === collection.name) {
      setEditingCollection(null);
      return;
    }

    const result = await saveSoundCollection(
      {
        name: editName,
        description: collection.description,
        is_active: collection.is_active,
        is_public: collection.is_public,
      },
      collection.id
    );

    if (result.success) {
      await loadAllData();
      setEditingCollection(null);
    } else {
      alert(`Failed to rename: ${result.error.message}`);
    }
  };

  // Get assignment for event
  const getAssignment = (event: GameplayEventType) => {
    return assignments.find(a => a.gameplay_event === event);
  };

  // Show audio init prompt if needed
  if (!isInitialized) {
    return (
      <div
        className="flex items-center justify-center py-24 cursor-pointer hover:bg-slate-900/50 rounded-lg transition-colors"
        onClick={async () => {
          await gameSoundHooks.initialize();
          await gameSoundHooks.loadSounds();
          setIsInitialized(true);
        }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">🔊</div>
          <p className="text-xl font-semibold mb-2">Click to Enable Audio</p>
          <p className="text-sm text-slate-400">
            Browser autoplay policy requires user interaction
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sound Collections</h1>
          <p className="text-slate-400">
            Assign sounds to gameplay events and manage collections
          </p>
        </div>
        <Button
          variant="default"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setCreatingNew(true)}
        >
          + Create Collection
        </Button>
      </div>

      {/* Create New Collection Modal */}
      {creatingNew && (
        <Card className="bg-blue-900/20 border-blue-800">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2 text-white">Create New Collection</h3>
                <p className="text-sm text-slate-400">
                  Create a custom sound collection to organize your sounds
                </p>
              </div>
              <input
                type="text"
                placeholder="Collection name..."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCollection();
                  if (e.key === 'Escape') {
                    setCreatingNew(false);
                    setNewCollectionName('');
                  }
                }}
              />
              <div className="flex gap-2">
                <Button variant="default" onClick={handleCreateCollection}>
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreatingNew(false);
                    setNewCollectionName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collections List (Left Sidebar) */}
        <div className="lg:col-span-1">
          {/* Collections List */}
          <div className="space-y-2">
            {isLoading ? (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-8 text-center">
                  <p className="text-slate-400">Loading collections...</p>
                </CardContent>
              </Card>
            ) : filteredCollections.length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-8 text-center">
                  <div className="text-3xl mb-2">📂</div>
                  <p className="text-slate-400">No collections yet</p>
                </CardContent>
              </Card>
            ) : (
              filteredCollections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  isSelected={selectedCollection?.id === collection.id}
                  isActive={activeCollection?.id === collection.id}
                  isEditing={editingCollection === collection.id}
                  editName={editName}
                  onSelect={() => setSelectedCollection(collection)}
                  onSetActive={() => handleSetActive(collection)}
                  onStartEdit={() => handleStartEdit(collection)}
                  onSaveEdit={() => handleSaveEdit(collection)}
                  onCancelEdit={() => setEditingCollection(null)}
                  onSetEditName={setEditName}
                  onDuplicate={() => handleDuplicate(collection)}
                  onDelete={() => handleDelete(collection)}
                  canEdit={collection.user_id === user?.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Event Assignments (Main Area) */}
        <div className="lg:col-span-2">
          {!selectedCollection ? (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="py-24 text-center">
                <div className="text-6xl mb-4">🎼</div>
                <h2 className="text-2xl font-bold mb-2">Select a Collection</h2>
                <p className="text-slate-400">
                  Choose a collection from the list to view and edit sound assignments
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Collection Info Header */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedCollection.name}</h2>
                      <div className="flex items-center gap-2 mt-2">
                        {selectedCollection.is_active && (
                          <span
                            className="px-2 py-0.5 text-xs bg-green-900/50 text-green-300 border border-green-800 rounded"
                            title="Currently used in game"
                          >
                            ✓ Active
                          </span>
                        )}
                      </div>
                    </div>
                    {!selectedCollection.is_active && (
                      <Button
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleSetActive(selectedCollection)}
                      >
                        Set as Active
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Event Assignments by Category */}
              {isLoadingAssignments ? (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="py-12 text-center">
                    <p className="text-slate-400">Loading assignments...</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Group events by category */}
                  {['Dice', 'Checker', 'Hit', 'Bear Off', 'Victory', 'UI', 'Invalid'].map(category => {
                    const categoryEvents = GAMEPLAY_EVENTS.filter(e => e.category === category);
                    return (
                      <Card key={category} className="bg-slate-900/50 border-slate-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg text-white">{category} Sounds</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {categoryEvents.map((eventData) => {
                            const assignment = getAssignment(eventData.event);
                            const canEdit = true; // All collections are editable

                            return (
                              <EventAssignmentRow
                                key={eventData.event}
                                eventData={eventData}
                                assignment={assignment}
                                isAssigning={assigningEvent === eventData.event}
                                availableSounds={availableSounds}
                                playingSound={playingSound}
                                canEdit={canEdit}
                                onStartAssign={() => setAssigningEvent(eventData.event)}
                                onCancelAssign={() => setAssigningEvent(null)}
                                onAssignSound={(soundId) => handleAssignSound(eventData.event, soundId)}
                                onRemove={() => assignment && handleRemoveAssignment(assignment.id)}
                                onPlaySound={handlePlaySound}
                                onPlayPrimitive={() => {
                                  // Play Primitive fallback sound for this event
                                  const event = eventData.event;
                                  if (event === 'dice_roll') gameSoundHooks.playDiceRoll();
                                  else if (event === 'dice_bounce') gameSoundHooks.playDiceBounce();
                                  else if (event === 'dice_settle') gameSoundHooks.playDiceSettle(6);
                                  else if (event === 'checker_pickup') gameSoundHooks.playCheckerPickup(5);
                                  else if (event === 'checker_slide') gameSoundHooks.playCheckerSlide(5, 10);
                                  else if (event === 'checker_place') gameSoundHooks.playCheckerPlace(10, 3);
                                  else if (event === 'checker_select') gameSoundHooks.playCheckerSelect();
                                  else if (event === 'hit_impact') gameSoundHooks.playHit(8);
                                  else if (event === 'bear_off') gameSoundHooks.playBearOff();
                                  else if (event === 'button_click') gameSoundHooks.playButtonClick();
                                  else if (event === 'panel_open') gameSoundHooks.playPanelOpen();
                                  else if (event === 'panel_close') gameSoundHooks.playPanelClose();
                                  else if (event === 'game_win') gameSoundHooks.playGameWin();
                                  else if (event === 'game_loss') gameSoundHooks.playGameLoss();
                                  else if (event === 'match_win') gameSoundHooks.playMatchWin();
                                  else if (event === 'invalid_wrong_player') gameSoundHooks.playInvalidSelectionWrongPlayer();
                                  else if (event === 'invalid_cannot_move') gameSoundHooks.playInvalidSelectionCannotMove();
                                }}
                              />
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}

              {/* Stats */}
              <Card className="bg-slate-900/30 border-slate-800">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>
                      {assignments.length} of {GAMEPLAY_EVENTS.length} events have sounds assigned
                    </span>
                    <Link
                      href="/sound/effects/library"
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Browse Sound Library →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Collection Card Component
function CollectionCard({
  collection,
  isSelected,
  isActive,
  isEditing,
  editName,
  onSelect,
  onSetActive,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onSetEditName,
  onDuplicate,
  onDelete,
  canEdit,
}: {
  collection: SoundCollectionRow;
  isSelected: boolean;
  isActive: boolean;
  isEditing: boolean;
  editName: string;
  onSelect: () => void;
  onSetActive: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onSetEditName: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canEdit: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected
          ? 'bg-blue-900/30 border-blue-600'
          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
      }`}
      onClick={!isEditing ? onSelect : undefined}
    >
      <CardContent className="py-3">
        {isEditing ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editName}
              onChange={(e) => onSetEditName(e.target.value)}
              className="w-full px-3 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
            />
            <div className="flex gap-1">
              <Button size="sm" variant="default" onClick={onSaveEdit}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-white">{collection.name}</h3>
              {isActive && <span className="text-xs text-green-400">✓</span>}
            </div>
            {collection.is_public && (
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 text-xs bg-green-900/50 text-green-300 border border-green-800 rounded">
                  Public
                </span>
              </div>
            )}
            {isSelected && (
              <div className="flex flex-wrap gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                {!isActive && (
                  <Button size="sm" variant="outline" onClick={onSetActive}>
                    Set Active
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={onDuplicate}>
                  Duplicate
                </Button>
                {canEdit && !collection.is_system && (
                  <>
                    <Button size="sm" variant="outline" onClick={onStartEdit}>
                      Rename
                    </Button>
                    <Button size="sm" variant="destructive" onClick={onDelete}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Event Assignment Row Component
function EventAssignmentRow({
  eventData,
  assignment,
  isAssigning,
  availableSounds,
  playingSound: _playingSound,
  canEdit,
  onStartAssign,
  onCancelAssign,
  onAssignSound,
  onRemove,
  onPlaySound,
  onPlayPrimitive,
}: {
  eventData: { event: GameplayEventType; label: string; description: string };
  assignment?: SoundAssignmentRow;
  isAssigning: boolean;
  availableSounds: SoundEntry[];
  playingSound: string | null;
  canEdit: boolean;
  onStartAssign: () => void;
  onCancelAssign: () => void;
  onAssignSound: (soundId: string) => void;
  onRemove: () => void;
  onPlaySound: (sound: SoundEntry) => void;
  onPlayPrimitive: () => void;
}) {
  // Resolve assignment's sound_library_id to actual sound object
  const assignedSound = assignment ? soundLibrary[assignment.sound_library_id] : undefined;

  return (
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
      {!isAssigning ? (
        <div className="flex items-center gap-3">
          {/* Play Button */}
          <button
            onClick={() => {
              if (assignedSound) {
                onPlaySound(assignedSound);
              } else {
                onPlayPrimitive();
              }
            }}
            className="px-3 py-1.5 rounded text-sm font-medium transition-colors bg-slate-700 text-slate-300 hover:bg-slate-600"
            title={assignedSound ? `Play ${assignedSound.metadata.name}` : 'Play Primitive sound'}
          >
            ▶
          </button>

          {/* Event Title */}
          <div className="flex-1">
            <div className="font-medium text-white">{eventData.label}</div>
            <div className="text-xs text-slate-400">
              {assignedSound ? assignedSound.metadata.name : 'Primitive (default)'}
            </div>
          </div>

          {/* Select/Change Button */}
          {canEdit && (
            <Button size="sm" variant="outline" onClick={onStartAssign}>
              {assignment ? 'Change' : 'Select'}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-white">Select sound for {eventData.label}</p>
            <Button size="sm" variant="outline" onClick={onCancelAssign}>
              Cancel
            </Button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {/* Option to revert to default - always show at top when there's an assignment */}
            {assignment && (
              <>
                <button
                  onClick={onRemove}
                  className="w-full text-left px-3 py-2 bg-purple-900/30 hover:bg-purple-900/40 border-2 border-purple-700 rounded text-sm font-medium text-purple-200 transition-colors"
                >
                  ← Revert to Primitive (default)
                </button>
                <div className="border-t border-slate-700 my-2"></div>
              </>
            )}
            {/* Available sounds from code library */}
            {availableSounds.map((sound) => (
              <button
                key={sound.metadata.id}
                onClick={() => onAssignSound(sound.metadata.id)}
                className="w-full text-left px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-white transition-colors"
              >
                {sound.metadata.name}
                <span className="text-xs text-slate-400 ml-2 capitalize">({sound.metadata.category})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

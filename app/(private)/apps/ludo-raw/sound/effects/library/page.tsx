'use client';

/**
 * Sound Effects Library Page - /sound/effects/library
 *
 * Browse and preview sounds from the code-based library.
 * Features:
 * - Category filtering (impact, wooden, musical, ui, feedback)
 * - Search by name/description/tags
 * - Play/preview functionality
 * - Collection usage badges (shows which collections use each sound)
 *
 * New Architecture:
 * - Sounds are defined in code (src/lib/audio/sound-library.ts)
 * - No database CRUD operations needed
 * - Collections reference sounds by ID
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { gameSoundHooks } from '@/lib/studio/ludo/audio/GameSoundHooks';
import { soundLibrary, SoundEntry, SoundMetadata, initializeSoundLibrary } from '@/lib/studio/ludo/audio/sound-library';
import Link from 'next/link';

type CategoryFilter = SoundMetadata['category'] | 'all';

export default function LibraryPage() {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingSound, setPlayingSound] = useState<string | null>(null);

  // Get all sounds from library
  const allSounds = useMemo(() => Object.values(soundLibrary), []);

  // Apply filters
  const filteredSounds = useMemo(() => {
    let filtered = allSounds;

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(s => s.metadata.category === categoryFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.metadata.name.toLowerCase().includes(query) ||
        s.metadata.description.toLowerCase().includes(query) ||
        s.metadata.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [allSounds, categoryFilter, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      all: allSounds.length,
      impact: allSounds.filter(s => s.metadata.category === 'impact').length,
      wooden: allSounds.filter(s => s.metadata.category === 'wooden').length,
      musical: allSounds.filter(s => s.metadata.category === 'musical').length,
      ui: allSounds.filter(s => s.metadata.category === 'ui').length,
      feedback: allSounds.filter(s => s.metadata.category === 'feedback').length,
    };
  }, [allSounds]);

  // Initialize audio on mount
  useEffect(() => {
    const initAudio = async () => {
      if (!gameSoundHooks.isReady()) {
        try {
          await gameSoundHooks.initialize();
          await gameSoundHooks.loadSounds();
          await initializeSoundLibrary();
          setIsInitialized(true);
        } catch (err) {
          console.error('Failed to initialize audio:', err);
        }
      } else {
        setIsInitialized(true);
      }
    };
    initAudio();
  }, []);

  // Play sound preview
  const handlePlaySound = async (sound: SoundEntry) => {
    setPlayingSound(sound.metadata.id);
    sound.play();
    setTimeout(() => setPlayingSound(null), 1000);
  };

  // Show audio init prompt if needed
  if (!isInitialized) {
    return (
      <div
        className="flex items-center justify-center py-24 cursor-pointer hover:bg-slate-900/50 rounded-lg transition-colors"
        onClick={async () => {
          await gameSoundHooks.initialize();
          await gameSoundHooks.loadSounds();
          await initializeSoundLibrary();
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
          <h1 className="text-3xl font-bold mb-2">Sound Effects Library</h1>
          <p className="text-slate-400">
            Browse and preview sounds from the code-based library
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Category Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <FilterButton
                active={categoryFilter === 'all'}
                onClick={() => setCategoryFilter('all')}
              >
                All ({categoryCounts.all})
              </FilterButton>
              <FilterButton
                active={categoryFilter === 'impact'}
                onClick={() => setCategoryFilter('impact')}
              >
                Impact ({categoryCounts.impact})
              </FilterButton>
              <FilterButton
                active={categoryFilter === 'wooden'}
                onClick={() => setCategoryFilter('wooden')}
              >
                Wooden ({categoryCounts.wooden})
              </FilterButton>
              <FilterButton
                active={categoryFilter === 'musical'}
                onClick={() => setCategoryFilter('musical')}
              >
                Musical ({categoryCounts.musical})
              </FilterButton>
              <FilterButton
                active={categoryFilter === 'ui'}
                onClick={() => setCategoryFilter('ui')}
              >
                UI ({categoryCounts.ui})
              </FilterButton>
              <FilterButton
                active={categoryFilter === 'feedback'}
                onClick={() => setCategoryFilter('feedback')}
              >
                Feedback ({categoryCounts.feedback})
              </FilterButton>
            </div>

            {/* Search Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search sounds by name, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sound Effects Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredSounds.length === 0 ? (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-slate-400">No sounds found</p>
              <p className="text-sm text-slate-500 mt-2">
                Try adjusting your filters or search query
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSounds.map((sound) => (
            <SoundCard
              key={sound.metadata.id}
              sound={sound}
              isPlaying={playingSound === sound.metadata.id}
              onPlay={handlePlaySound}
            />
          ))
        )}
      </div>

      {/* Stats Footer */}
      <Card className="bg-slate-900/30 border-slate-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              Showing {filteredSounds.length} of {allSounds.length} sounds
            </span>
            <Link
              href="/sound/effects/collections"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Manage Collections →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Filter Button Component
function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// Sound Card Component
function SoundCard({
  sound,
  isPlaying,
  onPlay,
}: {
  sound: SoundEntry;
  isPlaying: boolean;
  onPlay: (sound: SoundEntry) => void;
}) {
  const { metadata } = sound;

  return (
    <Card
      className={`transition-all ${
        isPlaying
          ? 'bg-blue-900/30 border-blue-600'
          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
      }`}
    >
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          {/* Play Button */}
          <button
            onClick={() => onPlay(sound)}
            className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              isPlaying
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            ▶
          </button>

          {/* Sound Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">{metadata.name}</h3>
              <span className="px-2 py-0.5 text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded capitalize">
                {metadata.category}
              </span>
            </div>

            <p className="text-sm text-slate-400 mt-1 truncate">{metadata.description}</p>

            {/* Tags */}
            {metadata.tags.length > 0 && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {metadata.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-slate-800/50 text-slate-400 rounded"
                  >
                    {tag}
                  </span>
                ))}
                {metadata.tags.length > 5 && (
                  <span className="text-xs text-slate-500">
                    +{metadata.tags.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Sound ID (for copying) */}
          <div className="flex-shrink-0 text-right">
            <code className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
              {metadata.id}
            </code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

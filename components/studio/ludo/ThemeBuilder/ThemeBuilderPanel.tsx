import React, { useState, useEffect } from 'react';
import { useThemeBuilderStoreV2 } from '@/lib/studio/ludo/theme-builder/store-v2';
import { useThemeStore } from '@/lib/studio/ludo/theme/store';
import { useAuthStore } from '@/lib/studio/ludo/auth/store';
// TODO: SignInModal not needed in jfriis (auth handled at route level)
// import { SignInModal } from '../Auth/SignInModal';
import { BoardSection } from './sections/BoardSection';
import { LightingSection } from './sections/LightingSection';
import { PointsSection } from './sections/PointsSection';
import { CheckersSection } from './sections/CheckersSection';
import { DiceSection } from './sections/DiceSection';
import { LayoutSection } from './sections/LayoutSection';
import { ProportionsSection } from './sections/ProportionsSection';
import { PerformanceSection } from './sections/PerformanceSection';
import { ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher';

/**
 * ThemeBuilderPanel - Main theme builder interface.
 *
 * Features:
 * - Collapsible panel positioned on right side
 * - Base theme selector (Classic/Modern/Luxury)
 * - Accordion sections for theme properties
 * - Export/Import/Reset functionality
 * - Real-time preview integration
 * - localStorage persistence via Zustand store
 *
 * Keyboard Shortcut: Shift+T to toggle
 *
 * Sections:
 * - Board (size, colors, material)
 * - Lighting (ambient, directional, shadows)
 * - Points (colors, shape, dimensions)
 * - Checkers (radius, height, segments, colors)
 * - Dice (size, colors, dots)
 * - Layout (spacing, positions)
 * - Proportions (position calculations)
 * - Performance (LOD settings)
 */
export function ThemeBuilderPanel() {
  const {
    workingTheme,
    editingThemeId,
    isDirty,
    isPanelOpen,
    activeSection,
    isSaving,
    saveError,
    updateProperty,
    saveTheme: saveThemeV2,
    discardChanges,
    loadThemeForEditing,
    createNewTheme,
    togglePanel,
    setActiveSection,
  } = useThemeBuilderStoreV2();

  const { activeThemeId } = useThemeStore();
  const { isAuthenticated, user } = useAuthStore();

  // Sign-in modal state
  const [showSignInModal, setShowSignInModal] = useState(false);

  // Load theme for editing when panel opens or when theme selection changes
  useEffect(() => {
    if (!isPanelOpen || !activeThemeId) return;

    // If no working theme, load the active theme
    if (!workingTheme) {
      loadThemeForEditing(activeThemeId);
      return;
    }

    // If working theme differs from active theme, check for unsaved changes
    if (editingThemeId !== activeThemeId) {
      if (isDirty) {
        // Ask user if they want to discard unsaved changes
        const shouldSwitch = window.confirm(
          'You have unsaved changes. Do you want to discard them and switch themes?'
        );
        if (shouldSwitch) {
          loadThemeForEditing(activeThemeId);
        }
      } else {
        // No unsaved changes, safe to switch
        loadThemeForEditing(activeThemeId);
      }
    }
  }, [isPanelOpen, activeThemeId, workingTheme, editingThemeId, isDirty, loadThemeForEditing]);

  // Cloud storage state
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeDescription, setNewThemeDescription] = useState('');

  // Trigger render when working theme changes
  useEffect(() => {
    if (workingTheme) {
      const timer = setTimeout(() => {
        // Signal to parent that theme has changed
        window.dispatchEvent(new CustomEvent('theme-changed'));
      }, 200); // 200ms debounce

      return () => clearTimeout(timer);
    }
  }, [workingTheme]);

  // Handle section-specific updates
  const handleUpdate = (
    section: 'board' | 'lighting' | 'points' | 'checkers' | 'dice' | 'layout' | 'proportions' | 'performance',
    path: string,
    value: unknown
  ) => {
    if (!workingTheme) return;
    updateProperty(section, path, value);
  };

  // Handle save (update existing theme)
  const handleSave = async () => {
    if (!workingTheme) return;

    // Check authentication
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    const success = await saveThemeV2();
    if (success) {
      alert(`Theme "${workingTheme.name}" saved successfully!`);
      // Trigger event to refresh theme list
      window.dispatchEvent(new CustomEvent('theme-saved'));
    }
  };

  // Handle save as (create duplicate with new name)
  const handleSaveAs = async () => {
    if (!newThemeName.trim()) {
      alert('Please enter a name for the new theme');
      return;
    }

    // Check authentication
    if (!isAuthenticated) {
      setShowSaveAsDialog(false);
      setShowSignInModal(true);
      return;
    }

    const success = await saveThemeV2(newThemeName.trim(), newThemeDescription.trim() || undefined);

    if (success) {
      alert(`New theme "${newThemeName}" created successfully!`);
      setShowSaveAsDialog(false);
      setNewThemeName('');
      setNewThemeDescription('');
      // Trigger event to refresh theme list
      window.dispatchEvent(new CustomEvent('theme-saved'));
    }
  };

  // Handle creating new theme
  const handleNewTheme = async () => {
    const themeName = prompt('Enter a name for the new theme:', 'New Theme');
    if (!themeName) return;

    await createNewTheme(activeThemeId); // Create based on current theme
    alert(`New theme "${themeName}" created! Make your changes and save.`);
  };

  // Handle reset/discard changes
  const handleReset = () => {
    if (!isDirty) return;

    if (confirm('Discard all unsaved changes?')) {
      discardChanges();
    }
  };

  if (!isPanelOpen) {
    return null;
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-gray-800 border-l border-gray-700 shadow-2xl z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 p-4 border-b border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-white">Theme Builder</h2>
          <button
            onClick={togglePanel}
            className="text-gray-400 hover:text-white transition-colors"
            title="Close (Shift+T)"
          >
            ✕
          </button>
        </div>

        {/* User Status */}
        {isAuthenticated ? (
          <div className="mb-3 pb-3 border-b border-gray-700 text-xs text-gray-400">
            Signed in as: <span className="text-white">{user?.email}</span>
          </div>
        ) : (
          <div className="mb-3 pb-3 border-b border-gray-700">
            <button
              onClick={() => setShowSignInModal(true)}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              🔐 Sign In to Save Themes
            </button>
          </div>
        )}

        {/* Theme Switcher - Select theme to edit */}
        <div className="mb-3 pb-3 border-b border-gray-700">
          <ThemeSwitcher />
          {workingTheme && (
            <div className="mt-2 text-xs text-gray-400">
              Editing: <span className="text-white font-medium">{workingTheme.name}</span>
              {isDirty && <span className="ml-2 text-yellow-400">● Unsaved changes</span>}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
            title="Save changes to current theme"
          >
            {isSaving ? '⏳ Saving...' : '💾 Save'}
          </button>
          <button
            onClick={() => setShowSaveAsDialog(true)}
            disabled={!workingTheme}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
            title="Save as new theme"
          >
            📋 Save As...
          </button>
          <button
            onClick={handleNewTheme}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors col-span-2"
            title="Create new theme from current"
          >
            ✨ New Theme
          </button>
          <button
            onClick={handleReset}
            disabled={!isDirty}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded transition-colors col-span-2"
            title="Discard all unsaved changes"
          >
            ↺ Reset Changes
          </button>
        </div>

        {/* Error Display */}
        {saveError && (
          <div className="mt-3 text-xs text-red-400 bg-red-900 bg-opacity-20 border border-red-800 rounded p-2">
            {saveError}
          </div>
        )}
      </div>

      {/* Sections (Accordion) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Board Section */}
        {workingTheme && (
          <div className="border border-gray-700 rounded">
            <button
              onClick={() => setActiveSection(activeSection === 'board' ? null : 'board')}
              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-left text-sm font-medium text-white flex justify-between items-center transition-colors"
            >
              <span>Board</span>
              <span className="text-gray-400">{activeSection === 'board' ? '▼' : '▶'}</span>
            </button>
            {activeSection === 'board' && (
              <div className="p-4 bg-gray-850">
                <BoardSection
                  theme={workingTheme}
                  onUpdate={(path, value) => handleUpdate('board', path, value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Lighting Section */}
        {workingTheme && (
          <div className="border border-gray-700 rounded">
            <button
              onClick={() => setActiveSection(activeSection === 'lighting' ? null : 'lighting')}
              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-left text-sm font-medium text-white flex justify-between items-center transition-colors"
            >
              <span>Lighting</span>
              <span className="text-gray-400">{activeSection === 'lighting' ? '▼' : '▶'}</span>
            </button>
            {activeSection === 'lighting' && (
              <div className="p-4 bg-gray-850">
                <LightingSection
                  theme={workingTheme}
                  onUpdate={(path, value) => handleUpdate('lighting', path, value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Points Section */}
        {workingTheme && (
          <div className="border border-gray-700 rounded">
            <button
              onClick={() => setActiveSection(activeSection === 'points' ? null : 'points')}
              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-left text-sm font-medium text-white flex justify-between items-center transition-colors"
            >
              <span>Points</span>
              <span className="text-gray-400">{activeSection === 'points' ? '▼' : '▶'}</span>
            </button>
            {activeSection === 'points' && (
              <div className="p-4 bg-gray-850">
                <PointsSection
                  theme={workingTheme}
                  onUpdate={(path, value) => handleUpdate('points', path, value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Checkers Section */}
        {workingTheme && (
          <div className="border border-gray-700 rounded">
            <button
              onClick={() => setActiveSection(activeSection === 'checkers' ? null : 'checkers')}
              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-left text-sm font-medium text-white flex justify-between items-center transition-colors"
            >
              <span>Checkers</span>
              <span className="text-gray-400">{activeSection === 'checkers' ? '▼' : '▶'}</span>
            </button>
            {activeSection === 'checkers' && (
              <div className="p-4 bg-gray-850">
                <CheckersSection
                  theme={workingTheme}
                  onUpdate={(path, value) => handleUpdate('checkers', path, value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Dice Section */}
        {workingTheme && (
          <div className="border border-gray-700 rounded">
            <button
              onClick={() => setActiveSection(activeSection === 'dice' ? null : 'dice')}
              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-left text-sm font-medium text-white flex justify-between items-center transition-colors"
            >
              <span>Dice</span>
              <span className="text-gray-400">{activeSection === 'dice' ? '▼' : '▶'}</span>
            </button>
            {activeSection === 'dice' && (
              <div className="p-4 bg-gray-850">
                <DiceSection
                  theme={workingTheme}
                  onUpdate={(path, value) => handleUpdate('dice', path, value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Layout Section */}
        {workingTheme && (
          <div className="border border-gray-700 rounded">
            <button
              onClick={() => setActiveSection(activeSection === 'layout' ? null : 'layout')}
              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-left text-sm font-medium text-white flex justify-between items-center transition-colors"
            >
              <span>Layout</span>
              <span className="text-gray-400">{activeSection === 'layout' ? '▼' : '▶'}</span>
            </button>
            {activeSection === 'layout' && (
              <div className="p-4 bg-gray-850">
                <LayoutSection
                  theme={workingTheme}
                  onUpdate={(path, value) => handleUpdate('layout', path, value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Proportions Section */}
        {workingTheme && (
          <div className="border border-gray-700 rounded">
            <button
              onClick={() => setActiveSection(activeSection === 'proportions' ? null : 'proportions')}
              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-left text-sm font-medium text-white flex justify-between items-center transition-colors"
            >
              <span>Proportions</span>
              <span className="text-gray-400">{activeSection === 'proportions' ? '▼' : '▶'}</span>
            </button>
            {activeSection === 'proportions' && (
              <div className="p-4 bg-gray-850">
                <ProportionsSection
                  theme={workingTheme}
                  onUpdate={(path, value) => handleUpdate('proportions', path, value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Performance Section */}
        {workingTheme && (
          <div className="border border-gray-700 rounded">
            <button
              onClick={() => setActiveSection(activeSection === 'performance' ? null : 'performance')}
              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-left text-sm font-medium text-white flex justify-between items-center transition-colors"
            >
              <span>Performance</span>
              <span className="text-gray-400">{activeSection === 'performance' ? '▼' : '▶'}</span>
            </button>
            {activeSection === 'performance' && (
              <div className="p-4 bg-gray-850">
                <PerformanceSection
                  theme={workingTheme}
                  onUpdate={(path, value) => handleUpdate('performance', path, value)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Help */}
      <div className="bg-gray-900 p-3 border-t border-gray-700 text-xs text-gray-400">
        <p>💡 <strong>Tip:</strong> Press <kbd className="px-2 py-1 bg-gray-800 rounded">Shift+T</kbd> to toggle</p>
        <p className="mt-1">Changes persist across sessions via localStorage</p>
      </div>

      {/* Save As Dialog */}
      {showSaveAsDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">Save As New Theme</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Theme Name *
                </label>
                <input
                  type="text"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="My Custom Theme"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  maxLength={100}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newThemeDescription}
                  onChange={(e) => setNewThemeDescription(e.target.value)}
                  placeholder="Describe your theme..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  rows={3}
                  maxLength={500}
                />
              </div>

              {saveError && (
                <div className="text-sm text-red-400 bg-red-900 bg-opacity-20 border border-red-800 rounded p-2">
                  {saveError}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveAs}
                disabled={isSaving || !newThemeName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save As New'}
              </button>
              <button
                onClick={() => {
                  setShowSaveAsDialog(false);
                  setNewThemeName('');
                  setNewThemeDescription('');
                }}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white text-sm rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TODO: SignInModal not needed in jfriis (auth handled at route level) */}
    </div>
  );
}

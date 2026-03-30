/**
 * Tool hints — user-selectable favourites for explicit tool routing.
 *
 * When selected, the hint is sent to the server which sets tool_choice
 * to force that specific tool. Removes agent routing ambiguity entirely.
 *
 * To add a new favourite: add an entry here. That's it — the toolbar,
 * transport, and server routing all key off this list.
 */

export interface ToolHint {
  /** Tool name as registered in streamText tools */
  toolName: string;
  /** Short label shown in the toolbar */
  label: string;
  /** Keyboard shortcut hint (displayed in tooltip) */
  shortcut?: string;
  /** Icon name from @tabler/icons-react (rendered by toolbar) */
  icon: 'photo' | 'pencil' | 'microscope' | 'search' | 'brain';
}

export const TOOL_HINTS: ToolHint[] = [
  {
    toolName: 'generate_image',
    label: 'Image',
    icon: 'photo',
  },
  {
    toolName: 'run_sketch_study',
    label: 'Sketch',
    icon: 'pencil',
  },
  {
    toolName: 'run_chassis_study',
    label: 'Study',
    icon: 'microscope',
  },
  {
    toolName: 'web_search',
    label: 'Search',
    icon: 'search',
  },
];

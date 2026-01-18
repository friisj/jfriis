# Stable

Character design repository and asset management tool.

## Overview

Stable is a comprehensive character bible and asset management system for **synthetic character design**. It provides a rich repository for building, maintaining, and iterating on detailed representations of AI-generated characters that may be used across multiple media and contexts.

This is a **personal creative tool** designed for deep, focused work with a small roster of characters (typically fewer than 10), each developed with extraordinary depth and complexity.

### Core Capabilities

- **Parametric Character Definitions**: Rich, structured data objects representing anatomy, personality, voice, behavior, and style
- **Asset Management**: Organize prompts, reference media, generative outputs, and other character-related files
- **Relationship Tracking**: Define and manage connections between characters
- **Media Viewing**: Specialized components for displaying character assets

## Philosophy & Approach

### The Parametric Nucleus

Each character is defined by a **parametric data object** that serves as the nucleus around which all other assets, relationships, and representations orbit. This core data structure contains objective, structured information that enables:

- Consistent character representation across different contexts
- Integration with external tools and workflows
- Systematic iteration and refinement
- Clear separation between objective parameters and subjective interpretations

### Small Roster, Deep Complexity

Stable is optimized for **depth over breadth**:

- **Small roster**: Fewer than 10 characters to start
- **Rich detail**: Each character may become extraordinarily complex
- **Iterative refinement**: Primary use case is viewing and iterating on existing characters
- **Multiple facets**: Characters have anatomy, personality, voice, behavior, style variants, and more

### Generative Workflow

Designed specifically for **synthetic character creation** using AI/generative tools:

- Store generation prompts and exclusions (negative prompts)
- Organize generative outputs from various models
- Track what works and what doesn't
- Build exemplar libraries for consistent generation
- Maintain qualitative guidelines alongside objective data

### Future Vision

While **characters are the top-level entities** in the current implementation, the system is designed to eventually support secondary entities:

- **Garments & Outfits**: Clothing, costumes, accessories
- **Scenes**: Environments, settings, locations
- **Actions**: Poses, movements, interactions
- Other character-related concepts

These will be explored in future iterations as the character foundation matures.

## Workflow

### Typical Use Cases

1. **Character Creation**: Define a new synthetic character with initial parametric data
2. **Prompt Management**: Store and refine generation prompts that produce consistent results
3. **Asset Organization**: Collect and categorize reference images, generative outputs, concept art
4. **Iteration**: View existing character data and assets while making refinements
5. **Relationship Mapping**: Define how characters relate to each other
6. **Reference**: Quick access to character sheets during creative work in other tools

### Primary Activities

- **Adding/updating parametric data**: Refining the core character definition
- **Uploading and organizing assets**: Building the asset library
- **Viewing character sheets for reference**: Using stable as source of truth during creation
- **Iterating on prompts and outputs**: Evolving the character through experimentation

## Routes

- `/tools/stable` - Character list view
- `/tools/stable/[id]` - Character detail view
- `/tools/stable/new` - Create new character (TODO)
- `/tools/stable/[id]/edit` - Edit character (TODO)
- `/tools/stable/[id]/relationships/new` - Add relationship (TODO)
- `/tools/stable/[id]/assets/new` - Upload asset (TODO)

## Database Schema

### Tables

- **stable_characters**: Core character entities with parametric data (JSONB)
- **stable_character_relationships**: Simple relationships between characters
- **stable_assets**: Flexible asset storage for files and metadata

See `/supabase/migrations/20260118000000_stable_character_management.sql` for full schema.

## Components

### Placeholder Components (for future development)

- `MediaGallery`: Display character asset images
- `ModelViewer`: 3D model viewing (placeholder for Three.js integration)
- `ParametricEditor`: JSON editor for character parameters (will be replaced with structured form)
- `RelationshipGraph`: Relationship visualization (placeholder for graph rendering)

## Data Structure

### Parametric Data

Characters have a flexible `parametric_data` JSONB field that can contain:

- `anatomy`: Physical structure details
- `physical_attributes`: Height, build, species, distinctive features
- `personality`: Traits, archetypes, motivations
- `voice_tone`: Speaking patterns, verbal characteristics
- `behavior`: Mannerisms, habits, reactions
- `style_variants`: Different appearances, costumes, contexts
- `visual_parameters`: Color schemes, style descriptors
- `narrative`: Backstory, role, relationships context

### Asset Types

Supported asset types:
- `prompt`: Generation prompts
- `exclusion`: Negative prompts, things to avoid
- `reference_media`: Reference photos, artwork, mood boards
- `generative_output`: AI-generated images, 3D models
- `concept_art`: Hand-drawn or designed concept pieces
- `turnaround`: Character rotation sheets
- `expression_sheet`: Facial expressions reference
- `color_palette`: Color schemes and swatches
- `3d_model`: 3D character models
- `animation`: Motion references, clips
- `audio`: Voice samples, music themes
- `document`: Notes, backstory docs

## Development Roadmap

### Phase 1: Core Data Entry (Next Priority)

1. **Create/Edit Forms**: Build forms for creating and editing characters
   - Simple name/description input
   - Parametric data editor (initially JSON, later structured form)
2. **Basic CRUD UI**: Complete create, update, delete flows
3. **Validation**: Ensure data integrity for core fields

### Phase 2: Asset Management

1. **File Upload**: Implement Supabase Storage integration
2. **Asset Forms**: UI for adding/editing assets with metadata
3. **Basic Media Display**: Simple image/file viewing
4. **Tag System**: Organize assets with tags and search

### Phase 3: Rich Media & Visualization

1. **Media Viewers**: Replace placeholder components with real viewers
   - Image galleries with zoom/pan
   - 3D model viewer (Three.js integration)
   - Audio players for voice samples
   - Video players for animation references
2. **Relationship Graph**: Visual network of character connections
3. **Asset Previews**: Thumbnails and quick preview modals

### Phase 4: Advanced Features

1. **Structured Parametric Form**: Replace JSON editor with purpose-built UI
2. **Prompt Versioning**: Track iteration history on generation prompts
3. **Export/Integration**: Generate data for use in external tools
4. **Batch Operations**: Bulk asset management
5. **Secondary Entities**: Explore garments, scenes, actions as separate entities

### Future Considerations

- API for external tool integration
- Character comparison views
- Generation workflow automation
- Collaborative features (if scope expands beyond personal use)

## Status

✅ Database schema created
✅ TypeScript types defined
✅ CRUD operations implemented
✅ List and detail views scaffolded
✅ Placeholder components created
🚧 Create/edit forms (next priority)
🚧 Asset upload integration
🚧 Advanced media viewers

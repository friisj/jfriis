# Stable

Character design repository and asset management tool.

## Overview

Stable is a comprehensive character bible and asset management system for synthetic character design. It provides:

- **Parametric Character Definitions**: Rich, structured data objects representing anatomy, personality, voice, behavior, and style
- **Asset Management**: Organize prompts, reference media, generative outputs, and other character-related files
- **Relationship Tracking**: Define and manage connections between characters
- **Media Viewing**: Specialized components for displaying character assets

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

## Next Steps

1. **Create/Edit Forms**: Build forms for creating and editing characters
2. **Asset Upload**: Implement file upload to Supabase Storage
3. **Media Viewers**: Replace placeholder components with real viewers (image galleries, 3D, audio players)
4. **Parametric Form**: Replace JSON editor with structured form based on defined schema
5. **Relationship UI**: Build interface for managing character relationships
6. **Export/Integration**: Add export functionality for use in other tools

## Status

✅ Database schema created
✅ TypeScript types defined
✅ CRUD operations implemented
✅ List and detail views scaffolded
✅ Placeholder components created
🚧 Create/edit forms (next priority)
🚧 Asset upload integration
🚧 Advanced media viewers

# Twin

> Digital twin for residential buildings

## Status

- **Phase:** Planning
- **Temperature:** Warm
- **Parent:** Hando

## Overview

Twin creates a digital representation of a residential dwelling - capturing the structure, systems, components, and their relationships. This digital twin serves as the foundation for understanding a home's current state, tracking maintenance needs, and planning improvements.

## Core Concepts

- **Building Model**: Physical structure (rooms, floors, exterior)
- **Systems**: HVAC, electrical, plumbing, etc.
- **Components**: Individual items that can be maintained/replaced
- **Relationships**: How components connect to systems and spaces

## Potential Features

- 3D or schematic visualization of the home
- Component inventory with age, condition, maintenance history
- System diagrams showing connections
- Integration points for other Hando sub-projects

## Structure

```
twin/
├── components/     # UI components
├── lib/            # Utilities, types, models
└── README.md
```

## Database Tables

When needed, use prefix: `studio_hando_twin_`

Likely tables:
- `studio_hando_twin_buildings` - Building/property records
- `studio_hando_twin_spaces` - Rooms, floors, zones
- `studio_hando_twin_systems` - HVAC, electrical, plumbing, etc.
- `studio_hando_twin_components` - Individual maintainable items

## Related

- Parent project: `app/components/studio/hando/`
- Shared resources: `app/components/studio/hando/shared/`

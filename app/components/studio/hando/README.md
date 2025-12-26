# Hando

> Home maintenance and management platform

## Status

- **Phase:** Planning
- **Temperature:** Warm

## Overview

Hando is a platform for home maintenance and management. It aims to help homeowners understand, track, and maintain their residential properties through digital tools and intelligent assistance.

Sub-projects explore different aspects of home management, with shared infrastructure for property data, maintenance scheduling, and home systems.

## Structure

```
hando/
├── projects/           # Individual sub-projects
│   └── {sub-project}/
├── shared/             # Shared across sub-projects
│   ├── components/     # Reusable UI components
│   └── lib/            # Shared utilities
├── config/             # Configuration files
└── README.md
```

## Sub-Projects

| Project | Status | Description |
|---------|--------|-------------|
| [twin](./projects/twin/) | Planning | Digital twin of residential buildings |

## Shared Resources

- `shared/components/` - UI components used across sub-projects
- `shared/lib/` - Utilities, types, helpers

## Adding a Sub-Project

1. Create directory: `projects/{name}/`
2. Add README with status and description
3. Update the sub-projects table above
4. If needed: create database tables with prefix `studio_hando_{subproject}_`

## Related

- Studio Project Protocol: `app/docs/infrastructure/STUDIO_PROJECT_PROTOCOL.md`

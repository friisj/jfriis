# MakeHuman to Three.js GLB Workflow

> Step-by-step instructions for exporting a rigged humanoid with morph targets from MakeHuman to a GLB file usable in Armature's Three.js pipeline.

---

## Overview

MakeHuman does **not** export GLB/glTF natively. The pipeline is:

```
MakeHuman → MHX2/MPFB2 → Blender → glTF/GLB export
```

MPFB2 (MakeHuman Plugin For Blender 2) is the current recommended path. It integrates MakeHuman's parametric human generation directly into Blender and handles rig + shape key transfer cleanly.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Blender** | 4.x+ | Free, open source. Download from blender.org |
| **MPFB2** | Latest | MakeHuman Plugin For Blender. Install as Blender addon |
| **MakeHuman** (optional) | 1.2.0+ | Only needed if you want to use the standalone app for figure design. MPFB2 can generate figures directly in Blender |

---

## Path A: MPFB2 Only (Recommended)

MPFB2 can generate MakeHuman figures directly inside Blender, skipping the standalone app entirely. This is the cleanest pipeline.

### Step 1: Install MPFB2

1. Download MPFB2 from [makehumancommunity.org](http://www.makehumancommunity.org/mpfb2.html)
2. In Blender: **Edit > Preferences > Add-ons > Install**
3. Select the downloaded `.zip` file
4. Enable the "MPFB" addon in the list
5. You should see a new **MPFB** tab in the N-panel (press `N` in the 3D viewport)

### Step 2: Generate a Base Figure

1. Open Blender, start a new scene (delete default cube)
2. In the **MPFB** panel > **Create Human**
3. Configure the base figure:
   - **Skeleton**: Select "Default" or "Game engine" rig
     - "Game engine" is lighter (fewer bones) and better suited for Three.js
   - **Topology**: "Base mesh" is fine for prototype fidelity
4. Click **Create Human**
5. A rigged mesh appears in the scene

### Step 3: Add Shape Keys (Morph Targets)

This is the critical step for Armature's Shape mode.

1. Select the generated mesh
2. In MPFB panel > **Shape Keys** section, add the parametric targets you want:
   - **Macro targets** (broad body type): `gender`, `age`, `muscle`, `weight`, `height`, `proportions`
   - **Detail targets** (specific anatomy): torso width, leg length, shoulder width, hip width, etc.
3. Each target becomes a Blender Shape Key on the mesh
4. Verify in **Properties > Object Data > Shape Keys** that the keys appear with sliders (0.0–1.0)

**If MPFB2 doesn't expose all the shape keys you need:**
- Use the standalone MakeHuman app to design the figure with desired targets (see Path B below)
- Import via MPFB2's import function

### Step 4: Configure the Rig for Export

1. Select the Armature (skeleton)
2. Ensure bone names are clean and consistent (MPFB2 usually handles this)
3. Check that the mesh has an **Armature modifier** pointing to the skeleton
4. Verify vertex groups exist and match bone names (select mesh > Properties > Object Data > Vertex Groups)

### Step 5: Test Deformation

Before exporting, verify everything works:

1. Select the Armature, enter **Pose Mode** (`Ctrl+Tab`)
2. Rotate a few bones — mesh should deform smoothly
3. Exit Pose Mode, select the mesh
4. Adjust shape key sliders in Properties > Shape Keys — mesh should reshape
5. Confirm both work simultaneously: shape keys modify the mesh, posing deforms the shaped mesh

### Step 6: Export as GLB

1. **File > Export > glTF 2.0 (.glb/.gltf)**
2. Configure export settings:
   - **Format**: `glTF Binary (.glb)` — single file, best for web delivery
   - **Include**:
     - Check **Selected Objects** (select both mesh and armature first)
   - **Transform**:
     - **+Y Up**: Enable (Three.js uses Y-up)
   - **Data > Mesh**:
     - **Apply Modifiers**: Enable
     - **Shape Keys**: **Enable** (critical — this exports morph targets)
     - **Shape Key Normals**: Enable (better lighting on morphed shapes)
   - **Data > Armature**:
     - **Export Deformation Bones Only**: Consider enabling for a cleaner skeleton in Three.js (removes helper/control bones)
   - **Data > Skinning**:
     - **Include All Bone Influences**: Enable
   - **Animation**: Disable (we don't need baked animations; Armature poses at runtime)
3. Click **Export glTF 2.0**

### Step 7: Validate the GLB

1. Open [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/) or use the Khronos glTF Sample Viewer
2. Drop the `.glb` file in
3. Verify:
   - Mesh renders correctly
   - Skeleton is visible (if viewer supports it)
   - Morph targets appear in the viewer's morph target panel
   - Sliding morph weights changes the mesh shape
4. Check file size — target under 5MB for fast web loading (under 2MB ideal)

---

## Path B: MakeHuman Standalone + Blender

Use this if you want MakeHuman's full slider UI for figure design, or need shape keys that MPFB2 doesn't expose directly.

### Step 1: Install MakeHuman

1. Download from [makehumancommunity.org](http://www.makehumancommunity.org/content/downloads.html)
2. Install for your platform (Windows, macOS, Linux)
3. Launch MakeHuman

### Step 2: Design the Figure

1. Use MakeHuman's slider panels to design your base figure:
   - **Main**: Gender, age, muscle, weight
   - **Torso/Limbs/Head**: Detailed proportions
2. **Important**: Set all sliders to their **default/neutral position** (0.5 or centered) for the base mesh. The morph targets will represent deviations from this neutral.
3. Optionally add a simple skeleton: **Pose/Animate > Skeleton > Game Engine**

### Step 3: Export from MakeHuman

1. **File > Export**
2. Choose format: **MHX2** (MakeHuman Exchange 2)
   - This preserves the rig and shape key data best for Blender import
3. Export options:
   - Enable shape keys / expressions if available
   - Use "Game Engine" skeleton if offered
4. Save the `.mhx2` file

### Step 4: Import into Blender via MPFB2

1. In Blender, use **MPFB > Import Human** (or File > Import > MHX2 if using the MHX2 addon instead)
2. The figure imports with rig and shape keys intact
3. **Continue from Path A, Step 4** (configure rig, test, export GLB)

---

## Gotchas and Tips

### Shape Keys
- **Shape keys and Armature modifier order matters**: Shape keys must be listed before the Armature modifier in Blender's modifier stack (this is the default and matches glTF spec: morphs before skinning)
- **Rest pose shape keys**: Author shape keys with the armature in rest pose (T-pose or A-pose). Editing shapes while posed produces incorrect deltas
- **Naming**: Give shape keys descriptive names (`height`, `muscle`, `torso_width`) — these names carry through to the GLB and become the morph target names in Three.js

### Rig / Skeleton
- **Bone count**: Keep it reasonable for web. 20–50 deformation bones is typical for a game-engine rig. MPFB2's "Game engine" skeleton is a good starting point
- **Root bone**: Ensure there's a single root bone. Three.js `SkinnedMesh` expects a clean hierarchy
- **Bone orientation**: MPFB2/MakeHuman rigs generally export cleanly. If custom bones are added, ensure consistent orientation

### GLB Export
- **Apply transforms**: Before export, apply all transforms on both mesh and armature (`Ctrl+A > All Transforms`)
- **Single mesh**: If the figure has multiple mesh objects, join them (`Ctrl+J`) before export for simplest Three.js loading, or handle multiple meshes sharing a skeleton in code
- **Compression**: Enable Draco compression in the glTF export settings if file size is a concern (Three.js supports Draco via `DRACOLoader`)

### Three.js Loading
```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const gltf = await loader.loadAsync('/models/armature-base.glb');

const mesh = gltf.scene.getObjectByProperty('type', 'SkinnedMesh');

// Access morph targets
console.log(mesh.morphTargetDictionary);
// e.g., { height: 0, muscle: 1, torso_width: 2, ... }

// Set morph weights
mesh.morphTargetInfluences[mesh.morphTargetDictionary['muscle']] = 0.7;

// Access skeleton for posing
const skeleton = mesh.skeleton;
const bones = skeleton.bones;
```

---

## Checklist Before Starting Prototype

- [ ] Blender installed (4.x+)
- [ ] MPFB2 addon installed and enabled
- [ ] Base figure generated with game-engine rig
- [ ] Shape keys added for target shape controls (macro + detail)
- [ ] Deformation tested (pose + shape keys work together)
- [ ] Exported as `.glb` with shape keys enabled and +Y up
- [ ] Validated in online glTF viewer (mesh, skeleton, morph targets all present)
- [ ] File size acceptable (< 5MB, ideally < 2MB)
- [ ] Loaded in Three.js test: `SkinnedMesh` renders, `morphTargetDictionary` populated, bones accessible

---

*Created 2026-02-14. Update as pipeline is validated during prototyping.*

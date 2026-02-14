# Armature - Definitions

> Glossary of terms specific to this project. Maintain as concepts evolve.

---

## Core Terms

| Term | Definition | Example |
|------|-----------|---------|
| Armature | A posable skeletal framework used as a reference for drawing figures. Traditionally a wooden/wire mannequin; here, a digital equivalent. | The jointed wooden figures found in art supply stores |
| Rig | The skeletal hierarchy (bones + joints) that drives mesh deformation when posing a character. | A humanoid skeleton with ~20 bones controlling a mesh |
| Anatomy modification | Changing the physical proportions or body type of the figure (e.g., limb length, torso width, body mass). | Making the figure taller, broader, or more muscular |
| Pose manipulation | Rotating joints and positioning limbs to place the figure in a specific stance or gesture. | Raising an arm, bending a knee, turning the head |
| Mesh deformation | How the visible surface (mesh) stretches and bends in response to bone/joint movement. | Skin stretching around an elbow as the arm bends |
| Inverse kinematics (IK) | A posing method where you move an end effector (e.g., a hand) and the system calculates intermediate joint angles automatically. | Dragging a hand to a position and having the elbow/shoulder follow naturally |
| Forward kinematics (FK) | A posing method where you rotate each joint individually in the chain from root to tip. | Rotating the shoulder, then the elbow, then the wrist separately |
| Blend shapes / Morph targets | Pre-defined mesh deformations that can be blended together to modify anatomy. | A "muscular" shape blended with a "tall" shape to create a muscular tall figure |

---

## Related Concepts

| Concept | Relationship to This Project |
|---------|------------------------------|
| Three.js SkinnedMesh | The Three.js primitive for rendering a mesh controlled by a skeleton — core rendering approach |
| glTF / GLB | Standard 3D file format for the base character model and rig |
| Bone constraints | Rules limiting joint rotation ranges to anatomically plausible values |
| Transform gizmo | UI control for rotating/translating bones — key interaction element for pose manipulation |

---

*Add terms as they emerge during exploration. Precise definitions prevent confusion in later phases.*

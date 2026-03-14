# Iris - Definitions

> Glossary of ocular anatomy and rendering terms specific to this project. Maintain as concepts evolve.

---

## Ocular Anatomy

| Term | Definition | Relevance |
|------|-----------|-----------|
| **Iris** | The colored, ring-shaped membrane behind the cornea that controls pupil size | Primary rendering target |
| **Pupil** | The central aperture of the iris that regulates light entry | Dynamic element — dilation/constriction |
| **Sclera** | The white, opaque outer coat of the eyeball | Surrounding context for iris rendering |
| **Cornea** | Transparent front surface of the eye covering iris and pupil | Refraction, specular highlights, moisture |
| **Limbus** | The border between the cornea and sclera | Limbal ring — key aesthetic feature |
| **Limbal ring** | Dark ring at the boundary of the iris and sclera | Varies by age; strong aesthetic signal |
| **Collarette** | Zigzag boundary dividing the iris into pupillary and ciliary zones | Key structural feature of iris pattern |
| **Crypts** | Diamond-shaped openings in the iris stroma | Visible in light-colored irises; depth cue |
| **Furrows** | Concentric and radial grooves on the iris surface | Contribute to texture and aging appearance |
| **Stroma** | The connective tissue layer of the iris containing pigment | Determines color via scattering + melanin |
| **Trabeculae** | Interlacing fibers visible in the iris stroma | Create the radial fiber appearance |
| **Pupillary ruff** | The pigmented border at the pupil margin | Dark fringe visible at pupil edge |
| **Anterior chamber** | Fluid-filled space between cornea and iris | Affects refraction and depth perception |

## Pigmentation & Color

| Term | Definition | Relevance |
|------|-----------|-----------|
| **Melanin** | Pigment determining iris darkness | Primary color determinant |
| **Rayleigh scattering** | Light scattering by stroma producing blue appearance | Why blue eyes appear blue (no blue pigment) |
| **Heterochromia** | Different coloration in different regions | Parametric variation target |
| **Central heterochromia** | Different color ring around the pupil | Common natural variation |
| **Sectoral heterochromia** | Distinct color sector in one iris | Less common but visually striking |

## Rendering Terms

| Term | Definition | Relevance |
|------|-----------|-----------|
| **Subsurface scattering (SSS)** | Light penetrating and scattering within translucent material | Critical for realistic iris/sclera appearance |
| **Procedural generation** | Creating content algorithmically rather than manually | Core approach for iris microstructure |
| **Signed distance field (SDF)** | Implicit surface representation via distance functions | Potential approach for iris feature boundaries |
| **Perlin/Simplex noise** | Coherent gradient noise functions | Basis for organic pattern generation |

---

*Add terms as they emerge during exploration. Precise definitions prevent confusion in later phases.*

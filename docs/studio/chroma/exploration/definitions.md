# Chroma - Definitions

> Glossary of terms specific to this project. Maintain as concepts evolve.

---

## Core Terms

| Term | Definition | Example |
|------|-----------|---------|
| RGB | Red-Green-Blue additive color model. Standard digital representation but perceptually non-uniform | `(212, 168, 87)` for amber |
| HSV | Hue-Saturation-Value. Separates chromatic content from brightness, more robust under lighting variation | `(43, 59, 83)` for amber |
| CIELAB (L*a*b*) | Perceptually uniform color space designed to approximate human vision. L=lightness, a=green-red, b=blue-yellow | `(71, 8, 32)` for warm amber |
| Regional Sampling | Analyzing a defined pixel region (e.g. 5x5) rather than a single pixel, providing statistical distribution of color | Sampling an iris region vs. a single pixel |
| Lighting Compensation | Algorithmic adjustment for detected lighting conditions that shift perceived color | Removing green tint from fluorescent lighting |
| Undertone | The subtle color beneath the surface layer, often masked by overtones in digital capture | Cool blue undertone beneath warm tan skin |
| Overtone | The surface-level color that digital sensors and vision models typically capture | Warm golden surface tone of amber eyes |
| Color Temperature | Characteristic of light source measured in Kelvin, affecting how colors appear in captured images | 5500K (daylight) vs 3200K (tungsten) |
| Chassis Parameters | Parametric specifications defining a character's visual attributes in the Luv system | `eyes.primary_color: #D4A857` |

---

## Related Concepts

| Concept | Relationship to This Project |
|---------|------------------------------|
| Luv Chassis | Primary consumer — Chroma validates generated images against chassis color specs |
| Vision Model Analysis | The problem Chroma solves — vision models misclassify colors due to contextual blindness |
| White Balance | Camera/rendering setting that affects color capture; a key source of the errors Chroma compensates for |
| WCAG Contrast | Accessibility standard that depends on accurate color measurement — potential downstream application |

---

*Add terms as they emerge during exploration. Precise definitions prevent confusion in later phases.*

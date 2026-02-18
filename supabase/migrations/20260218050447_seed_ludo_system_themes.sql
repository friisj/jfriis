-- Seed system themes for Ludo backgammon
-- These well-known UUIDs match SYSTEM_THEME_IDS in lib/studio/ludo/supabase/theme-loader.ts
-- Player keys use "1" (white) and "2" (black) in DB format

INSERT INTO ludo_themes (id, name, description, theme_data, is_public)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Classic',
  'Traditional wooden backgammon board with warm tones',
  '{
    "name": "Classic",
    "board": {
      "dimensions": {"width": 16, "height": 0.2, "thickness": 10},
      "color": 9127187,
      "bar": {"width": 0.8, "height": 0.3, "thickness": 10, "color": 6636321},
      "off": {"width": 1, "height": 0.1, "thickness": 8, "color": 4473924}
    },
    "points": {
      "alternateColors": [16738155, 5164484],
      "triangleDepth": 0.01,
      "triangleWidth": 0.5,
      "shape": "triangle"
    },
    "checkers": {
      "radius": {"top": 0.25, "bottom": 0.25},
      "height": 0.1,
      "segments": 16,
      "colors": {
        "1": 16119260,
        "2": 3092271
      }
    },
    "dice": {
      "size": 0.5,
      "colors": {
        "1": {"face": 16777215, "dots": 0},
        "2": {"face": 3092271, "dots": 16777215}
      },
      "dotRadius": 0.05,
      "dotSegments": 8
    },
    "layout": {
      "pointSpacing": 1.2,
      "boardSectionGap": 1.5,
      "checkerStackSpacing": 0.12,
      "dicePosition": {"x": -2, "y": 0.35, "z": 0}
    },
    "proportions": {
      "triangleBaseOffset": 4.8,
      "triangleTipOffset": 0.2,
      "leftSideStartX": -7.5,
      "checkerStackProgressionZ": 0.55,
      "barSeparationZ": 0.5,
      "barCheckerSpacingMultiplier": 2.5,
      "offAreaSeparationZ": 3.5,
      "offAreaStackSpacing": 0.01,
      "offAreaCenterX": 9
    },
    "lighting": {
      "backgroundColor": 2969622,
      "ambientColor": 16777215,
      "ambientIntensity": 0.1,
      "hemisphereSkyColor": 16777215,
      "hemisphereGroundColor": 9268835,
      "hemisphereIntensity": 0.2,
      "directionalColor": 16777215,
      "directionalIntensity": 1.2,
      "shadowMapSize": 2048
    },
    "performance": {
      "defaultTier": "medium",
      "checkerSegments": {"low": 8, "medium": 16, "high": 24, "ultra": 32},
      "shadowMapSize": {"low": 512, "medium": 1024, "high": 2048, "ultra": 4096}
    },
    "sonic": {
      "enabled": true,
      "keySignature": "C",
      "chordProgression": ["Cmaj7", "Am7", "Fmaj7", "G7"],
      "tempo": 90,
      "layers": {
        "pad": {"volume": 70, "density": 20, "character": 50},
        "arpeggio": {"volume": 40, "density": 40, "character": 60},
        "sparkle": {"volume": 20, "density": 15, "character": 70},
        "wash": {"volume": 30, "density": 10, "character": 40},
        "bass": {"volume": 50, "density": 25, "character": 30}
      },
      "effects": {
        "reverb": {"decay": 3.5, "wet": 0.35},
        "chorus": {"wet": 0.2, "depth": 0.6},
        "delay": {"wet": 0.15, "feedback": 0.25}
      },
      "mood": {"valence": 0.3, "energy": 0.4}
    }
  }'::jsonb,
  true
),
(
  '00000000-0000-0000-0000-000000000002',
  'Modern',
  'Sleek dark theme with blue and purple accents',
  '{
    "name": "Modern",
    "board": {
      "dimensions": {"width": 16, "height": 0.3, "thickness": 10},
      "color": 2899536,
      "bar": {"width": 1.2, "height": 0.4, "thickness": 10, "color": 3426142},
      "off": {"width": 1.2, "height": 0.15, "thickness": 8, "color": 1710618}
    },
    "points": {
      "alternateColors": [3446491, 10181046],
      "triangleDepth": 0.02,
      "triangleWidth": 0.6,
      "shape": "triangle"
    },
    "checkers": {
      "radius": {"top": 0.28, "bottom": 0.28},
      "height": 0.12,
      "segments": 20,
      "colors": {
        "1": 15527153,
        "2": 1842204
      }
    },
    "dice": {
      "size": 0.6,
      "colors": {
        "1": {"face": 15527153, "dots": 2899536},
        "2": {"face": 1842204, "dots": 3446491}
      },
      "dotRadius": 0.035,
      "dotSegments": 12
    },
    "layout": {
      "pointSpacing": 1.25,
      "boardSectionGap": 1.8,
      "checkerStackSpacing": 0.15,
      "dicePosition": {"x": -2.5, "y": 0.35, "z": 0}
    },
    "proportions": {
      "triangleBaseOffset": 4.8,
      "triangleTipOffset": 0.2,
      "leftSideStartX": -7.5,
      "checkerStackProgressionZ": 0.55,
      "barSeparationZ": 0.5,
      "barCheckerSpacingMultiplier": 2.5,
      "offAreaSeparationZ": 3.5,
      "offAreaStackSpacing": 0.01,
      "offAreaCenterX": 9
    },
    "lighting": {
      "backgroundColor": 1711150,
      "ambientColor": 16777215,
      "ambientIntensity": 0.08,
      "hemisphereSkyColor": 16777215,
      "hemisphereGroundColor": 2899536,
      "hemisphereIntensity": 0.15,
      "directionalColor": 16777215,
      "directionalIntensity": 1.4,
      "shadowMapSize": 2048
    },
    "performance": {
      "defaultTier": "high",
      "checkerSegments": {"low": 10, "medium": 20, "high": 28, "ultra": 40},
      "shadowMapSize": {"low": 1024, "medium": 2048, "high": 4096, "ultra": 4096}
    },
    "sonic": {
      "enabled": true,
      "keySignature": "Am",
      "chordProgression": ["Am7", "F", "C", "G"],
      "tempo": 110,
      "layers": {
        "pad": {"volume": 80, "density": 30, "character": 70},
        "arpeggio": {"volume": 50, "density": 50, "character": 80},
        "sparkle": {"volume": 30, "density": 25, "character": 85},
        "wash": {"volume": 40, "density": 15, "character": 60},
        "bass": {"volume": 70, "density": 40, "character": 50}
      },
      "effects": {
        "reverb": {"decay": 5.0, "wet": 0.45},
        "chorus": {"wet": 0.3, "depth": 0.8},
        "delay": {"wet": 0.25, "feedback": 0.35}
      },
      "mood": {"valence": -0.2, "energy": 0.7}
    }
  }'::jsonb,
  true
),
(
  '00000000-0000-0000-0000-000000000003',
  'Luxury',
  'Premium mahogany and gold with warm lighting',
  '{
    "name": "Luxury",
    "board": {
      "dimensions": {"width": 16, "height": 0.25, "thickness": 10},
      "color": 9109504,
      "bar": {"width": 1.0, "height": 0.35, "thickness": 10, "color": 16766720},
      "off": {"width": 1, "height": 0.12, "thickness": 8, "color": 5597999}
    },
    "points": {
      "alternateColors": [14329120, 9127187],
      "triangleDepth": 0.015,
      "triangleWidth": 0.55,
      "shape": "rounded"
    },
    "checkers": {
      "radius": {"top": 0.26, "bottom": 0.26},
      "height": 0.11,
      "segments": 24,
      "colors": {
        "1": 16775920,
        "2": 0
      }
    },
    "dice": {
      "size": 0.55,
      "colors": {
        "1": {"face": 16775920, "dots": 9109504},
        "2": {"face": 0, "dots": 16766720}
      },
      "dotRadius": 0.032,
      "dotSegments": 10
    },
    "layout": {
      "pointSpacing": 1.15,
      "boardSectionGap": 1.6,
      "checkerStackSpacing": 0.13,
      "dicePosition": {"x": -2.2, "y": 0.35, "z": 0}
    },
    "proportions": {
      "triangleBaseOffset": 4.8,
      "triangleTipOffset": 0.2,
      "leftSideStartX": -7.5,
      "checkerStackProgressionZ": 0.55,
      "barSeparationZ": 0.5,
      "barCheckerSpacingMultiplier": 2.5,
      "offAreaSeparationZ": 3.5,
      "offAreaStackSpacing": 0.01,
      "offAreaCenterX": 9
    },
    "lighting": {
      "backgroundColor": 3808794,
      "ambientColor": 16775393,
      "ambientIntensity": 0.12,
      "hemisphereSkyColor": 16775393,
      "hemisphereGroundColor": 9109504,
      "hemisphereIntensity": 0.25,
      "directionalColor": 16775393,
      "directionalIntensity": 1.1,
      "shadowMapSize": 4096
    },
    "performance": {
      "defaultTier": "ultra",
      "checkerSegments": {"low": 12, "medium": 24, "high": 32, "ultra": 48},
      "shadowMapSize": {"low": 1024, "medium": 2048, "high": 4096, "ultra": 8192}
    },
    "sonic": {
      "enabled": true,
      "keySignature": "Eb",
      "chordProgression": ["Ebmaj9", "Cm7", "Abmaj7", "Bb13"],
      "tempo": 75,
      "layers": {
        "pad": {"volume": 75, "density": 25, "character": 80},
        "arpeggio": {"volume": 45, "density": 35, "character": 75},
        "sparkle": {"volume": 35, "density": 20, "character": 90},
        "wash": {"volume": 50, "density": 20, "character": 70},
        "bass": {"volume": 60, "density": 30, "character": 40}
      },
      "effects": {
        "reverb": {"decay": 6.0, "wet": 0.5},
        "chorus": {"wet": 0.35, "depth": 0.9},
        "delay": {"wet": 0.2, "feedback": 0.3}
      },
      "mood": {"valence": 0.6, "energy": 0.3}
    }
  }'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

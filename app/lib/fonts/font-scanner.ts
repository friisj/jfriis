import fs from 'fs'
import path from 'path'

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900

export type FontStyle = 'normal' | 'italic'

export interface FontFile {
  filename: string
  path: string
  family: string
  weight: FontWeight
  style: FontStyle
  format: 'woff2' | 'woff' | 'ttf' | 'otf'
}

export interface FontFamily {
  name: string
  displayName: string
  files: FontFile[]
  availableWeights: FontWeight[]
  hasItalic: boolean
  isVariable: boolean
}

export interface SystemFont {
  name: string
  displayName: string
  stack: string
  availableWeights: FontWeight[]
}

// German weight names to numeric mapping (for Soehne fonts)
const germanWeightMap: Record<string, FontWeight> = {
  'extraleicht': 200,
  'leicht': 300,
  'buch': 400,
  'kraftig': 500,
  'halbfett': 600,
  'dreiviertelfett': 700,
  'fett': 700,
  'extrafett': 800
}

// Common weight name patterns
const weightPatterns: Record<string, FontWeight> = {
  'thin': 100,
  'extralight': 200,
  'extra-light': 200,
  'ultralight': 200,
  'light': 300,
  'regular': 400,
  'normal': 400,
  'book': 400,
  'medium': 500,
  'semibold': 600,
  'semi-bold': 600,
  'demibold': 600,
  'demi-bold': 600,
  'bold': 700,
  'extrabold': 800,
  'extra-bold': 800,
  'ultrabold': 800,
  'black': 900,
  'heavy': 900,
  ...germanWeightMap
}

function parseWeight(filename: string): FontWeight {
  const lowerName = filename.toLowerCase()

  // Check for explicit weight patterns
  for (const [pattern, weight] of Object.entries(weightPatterns)) {
    if (lowerName.includes(pattern)) {
      return weight
    }
  }

  // Default to 400 if no weight found
  return 400
}

function parseStyle(filename: string): FontStyle {
  const lowerName = filename.toLowerCase()
  return lowerName.includes('italic') || lowerName.includes('kursiv') ? 'italic' : 'normal'
}

function parseFamilyName(filename: string, folderName: string): string {
  // Extract base family name (e.g., "soehne", "untitled-sans")
  const baseName = filename
    .toLowerCase()
    .replace(/-(thin|extralight|light|regular|medium|semibold|bold|extrabold|black|heavy)/g, '')
    .replace(/-(italic|kursiv)/g, '')
    .replace(/\.(woff2?|ttf|otf)$/g, '')
    .replace(/-(extraleicht|leicht|buch|kraftig|halbfett|dreiviertelfett|fett|extrafett)/g, '')

  // Handle special cases
  if (baseName.includes('mono')) return `${folderName}-mono`
  if (baseName.includes('breit')) return `${folderName}-breit`

  return baseName || folderName
}

function getDisplayName(familyName: string): string {
  return familyName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export async function scanFontsDirectory(fontsPath: string): Promise<FontFamily[]> {
  const families = new Map<string, FontFamily>()

  try {
    const folders = fs.readdirSync(fontsPath)

    for (const folder of folders) {
      if (folder.startsWith('.')) continue

      const folderPath = path.join(fontsPath, folder)
      const stat = fs.statSync(folderPath)

      if (!stat.isDirectory()) continue

      const files = fs.readdirSync(folderPath)

      for (const file of files) {
        const ext = path.extname(file).toLowerCase()
        if (!['.woff2', '.woff', '.ttf', '.otf'].includes(ext)) continue

        const format = ext.slice(1) as 'woff2' | 'woff' | 'ttf' | 'otf'
        const familyName = parseFamilyName(file, folder)
        const weight = parseWeight(file)
        const style = parseStyle(file)

        const fontFile: FontFile = {
          filename: file,
          path: `/fonts/${folder}/${file}`,
          family: familyName,
          weight,
          style,
          format
        }

        if (!families.has(familyName)) {
          families.set(familyName, {
            name: familyName,
            displayName: getDisplayName(familyName),
            files: [],
            availableWeights: [],
            hasItalic: false,
            isVariable: false // We'll detect this if needed
          })
        }

        const family = families.get(familyName)!
        family.files.push(fontFile)

        if (!family.availableWeights.includes(weight)) {
          family.availableWeights.push(weight)
        }

        if (style === 'italic') {
          family.hasItalic = true
        }
      }
    }

    // Sort weights for each family
    families.forEach(family => {
      family.availableWeights.sort((a, b) => a - b)
      family.files.sort((a, b) => {
        if (a.weight !== b.weight) return a.weight - b.weight
        return a.style === 'normal' ? -1 : 1
      })
    })

    return Array.from(families.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    )
  } catch (error) {
    console.error('Error scanning fonts directory:', error)
    return []
  }
}

export const systemFonts: SystemFont[] = [
  {
    name: 'system-ui',
    displayName: 'System UI',
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    availableWeights: [300, 400, 500, 600, 700]
  },
  {
    name: 'georgia',
    displayName: 'Georgia',
    stack: 'Georgia, "Times New Roman", Times, serif',
    availableWeights: [400, 700]
  },
  {
    name: 'times',
    displayName: 'Times New Roman',
    stack: '"Times New Roman", Times, serif',
    availableWeights: [400, 700]
  },
  {
    name: 'arial',
    displayName: 'Arial',
    stack: 'Arial, Helvetica, sans-serif',
    availableWeights: [400, 700]
  },
  {
    name: 'helvetica',
    displayName: 'Helvetica',
    stack: 'Helvetica, Arial, sans-serif',
    availableWeights: [300, 400, 700]
  },
  {
    name: 'courier',
    displayName: 'Courier New',
    stack: '"Courier New", Courier, monospace',
    availableWeights: [400, 700]
  },
  {
    name: 'monaco',
    displayName: 'Monaco',
    stack: 'Monaco, "Courier New", monospace',
    availableWeights: [400]
  },
  {
    name: 'consolas',
    displayName: 'Consolas',
    stack: 'Consolas, "Courier New", monospace',
    availableWeights: [400, 700]
  }
]

export function getWeightLabel(weight: FontWeight): string {
  const labels: Record<FontWeight, string> = {
    100: 'Thin',
    200: 'Extra Light',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'Semi Bold',
    700: 'Bold',
    800: 'Extra Bold',
    900: 'Black'
  }
  return labels[weight]
}

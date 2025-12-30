'use client'

import { ThemeSwitcher } from '@/components/theme-switcher'
import { SpecimenContainer } from '@/components/specimen-wrapper'

export default function ThemeDemoPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Theme System Demo</h1>
            <p className="text-muted-foreground">
              Test the theming system with different themes and modes
            </p>
          </div>
          <ThemeSwitcher />
        </div>

        {/* Demo content in global theme */}
        <div className="mb-12 p-6 border rounded-lg bg-card">
          <h2 className="text-2xl font-semibold mb-4">Global Theme</h2>
          <p className="text-muted-foreground mb-4">
            This content uses the global theme selected above.
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
              Primary
            </button>
            <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg">
              Secondary
            </button>
            <button className="px-4 py-2 bg-accent text-accent-foreground rounded-lg">
              Accent
            </button>
            <button className="px-4 py-2 bg-destructive text-primary-foreground rounded-lg">
              Destructive
            </button>
          </div>
        </div>

        {/* Specimens with different themes */}
        <h2 className="text-2xl font-semibold mb-4">Isolated Specimens</h2>
        <p className="text-muted-foreground mb-6">
          Each specimen below uses a different theme, independent of the global theme.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SpecimenContainer
            title="Default Light"
            description="Using default theme in light mode"
            themeName="default"
            mode="light"
            showControls
          >
            <div className="space-y-4">
              <p className="text-foreground">
                This specimen is always in light mode with the default theme.
              </p>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                Button
              </button>
            </div>
          </SpecimenContainer>

          <SpecimenContainer
            title="Default Dark"
            description="Using default theme in dark mode"
            themeName="default"
            mode="dark"
            showControls
          >
            <div className="space-y-4">
              <p className="text-foreground">
                This specimen is always in dark mode with the default theme.
              </p>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                Button
              </button>
            </div>
          </SpecimenContainer>

          <SpecimenContainer
            title="Blue Light"
            description="Using blue theme in light mode"
            themeName="blue"
            mode="light"
            showControls
          >
            <div className="space-y-4">
              <p className="text-foreground">
                This specimen uses the blue theme in light mode.
              </p>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                Button
              </button>
            </div>
          </SpecimenContainer>

          <SpecimenContainer
            title="Blue Dark"
            description="Using blue theme in dark mode"
            themeName="blue"
            mode="dark"
            showControls
          >
            <div className="space-y-4">
              <p className="text-foreground">
                This specimen uses the blue theme in dark mode.
              </p>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                Button
              </button>
            </div>
          </SpecimenContainer>
        </div>
      </div>
    </div>
  )
}

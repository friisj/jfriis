'use client'

import { useState } from 'react'
import { StructuralCalibration } from './structural-calibration'
import { ThemePreview } from './theme-preview'
import { ThemeExport } from './theme-export'

export type DesignSystemConfig = {
  primitives: {
    spacing: {
      scale: '4pt' | '8pt' | 'custom'
      values: number[]
    }
    radius: {
      style: 'sharp' | 'moderate' | 'rounded'
      values: number[]
    }
    grid: {
      columns: number
      gutter: number
      margins: {
        mobile: number
        tablet: number
        desktop: number
      }
      maxWidth: number
    }
    breakpoints: {
      sm: number
      md: number
      lg: number
      xl: number
      '2xl': number
    }
    elevation: {
      levels: number
      strategy: 'shadow' | 'border' | 'both'
    }
  }
  semantic: {
    spacing: Record<string, string>
    radius: Record<string, string>
  }
}

type Step = 'calibration' | 'preview' | 'export'

export function DesignSystemTool() {
  const [currentStep, setCurrentStep] = useState<Step>('calibration')
  const [config, setConfig] = useState<DesignSystemConfig | null>(null)

  const handleConfigComplete = (newConfig: DesignSystemConfig) => {
    setConfig(newConfig)
    setCurrentStep('preview')
  }

  const handleBack = () => {
    if (currentStep === 'export') setCurrentStep('preview')
    else if (currentStep === 'preview') setCurrentStep('calibration')
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Design System Tool</h1>
        <p className="text-muted-foreground">
          Structural calibration for Tailwind theme configuration
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-12">
        <StepIndicator
          number={1}
          label="Calibration"
          active={currentStep === 'calibration'}
          completed={currentStep === 'preview' || currentStep === 'export'}
        />
        <div className="flex-1 h-px bg-border" />
        <StepIndicator
          number={2}
          label="Preview"
          active={currentStep === 'preview'}
          completed={currentStep === 'export'}
        />
        <div className="flex-1 h-px bg-border" />
        <StepIndicator
          number={3}
          label="Export"
          active={currentStep === 'export'}
          completed={false}
        />
      </div>

      {/* Content */}
      <div className="min-h-[600px]">
        {currentStep === 'calibration' && (
          <StructuralCalibration onComplete={handleConfigComplete} initialConfig={config} />
        )}

        {currentStep === 'preview' && config && (
          <ThemePreview
            config={config}
            onEdit={handleBack}
            onExport={() => setCurrentStep('export')}
          />
        )}

        {currentStep === 'export' && config && (
          <ThemeExport config={config} onBack={handleBack} />
        )}
      </div>
    </div>
  )
}

function StepIndicator({
  number,
  label,
  active,
  completed
}: {
  number: number
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
          ${completed ? 'bg-primary text-primary-foreground' : ''}
          ${active ? 'bg-primary text-primary-foreground' : ''}
          ${!active && !completed ? 'bg-muted text-muted-foreground' : ''}
        `}
      >
        {completed ? '✓' : number}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  )
}

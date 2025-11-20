'use client'

import { useState } from 'react'
import type { DesignSystemConfig } from './design-system-tool'
import { TypographyTemplate as TypographyTemplateNew } from './preview-templates-typography'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts'

interface PreviewTemplatesProps {
  config: DesignSystemConfig
}

type Template = 'card' | 'form' | 'blog' | 'typography' | 'layout' | 'dashboard'

export function PreviewTemplates({ config }: PreviewTemplatesProps) {
  const [activeTemplate, setActiveTemplate] = useState<Template>('card')

  const templates: { id: Template; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'card', label: 'Card' },
    { id: 'form', label: 'Form' },
    { id: 'blog', label: 'Blog Post' },
    { id: 'typography', label: 'Typography' },
    { id: 'layout', label: 'Layout' }
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Template Selector */}
      <div className="border-b bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => setActiveTemplate(template.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTemplate === template.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent'
              }`}
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto p-8 bg-background design-system-preview">
        {activeTemplate === 'dashboard' && <DashboardTemplate config={config} />}
        {activeTemplate === 'card' && <CardTemplate config={config} />}
        {activeTemplate === 'form' && <FormTemplate config={config} />}
        {activeTemplate === 'blog' && <BlogTemplate config={config} />}
        {activeTemplate === 'typography' && <TypographyTemplateNew config={config} />}
        {activeTemplate === 'layout' && <LayoutTemplate config={config} />}
      </div>
    </div>
  )
}

function DashboardTemplate({ config }: { config: DesignSystemConfig }) {
  const [isOpen, setIsOpen] = useState(false)
  const sans = config.primitives.typography.fontFamilies.sans.stack
  const mono = config.primitives.typography.fontFamilies.mono.stack
  const sizes = config.primitives.typography.typeScale.sizes

  // Sample data for charts
  const revenueData = [
    { month: 'Jan', revenue: 4200, expenses: 2400 },
    { month: 'Feb', revenue: 3800, expenses: 2200 },
    { month: 'Mar', revenue: 5100, expenses: 2800 },
    { month: 'Apr', revenue: 6200, expenses: 3100 },
    { month: 'May', revenue: 5800, expenses: 2900 },
    { month: 'Jun', revenue: 7200, expenses: 3400 }
  ]

  const trafficData = [
    { day: 'Mon', visitors: 1200 },
    { day: 'Tue', visitors: 1900 },
    { day: 'Wed', visitors: 1600 },
    { day: 'Thu', visitors: 2100 },
    { day: 'Fri', visitors: 2400 },
    { day: 'Sat', visitors: 1800 },
    { day: 'Sun', visitors: 1400 }
  ]

  const chartConfig = {
    revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
    expenses: { label: 'Expenses', color: 'hsl(var(--chart-2))' },
    visitors: { label: 'Visitors', color: 'hsl(var(--chart-1))' }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6" style={{ fontFamily: sans }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-bold text-foreground"
            style={{ fontSize: sizes['3xl'], fontFamily: sans }}
          >
            Analytics Dashboard
          </h1>
          <p
            className="text-muted-foreground mt-1"
            style={{ fontSize: sizes.sm, fontFamily: sans }}
          >
            Welcome back! Here's what's happening with your business.
          </p>
        </div>
        <Badge variant="outline" style={{ fontFamily: sans, fontSize: sizes.xs }}>
          Live
        </Badge>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription style={{ fontFamily: sans, fontSize: sizes.xs }}>
              Total Revenue
            </CardDescription>
            <CardTitle style={{ fontFamily: sans, fontSize: sizes['2xl'] }}>
              $45,231
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="default" style={{ fontSize: sizes.xs }}>
                +20.1%
              </Badge>
              <span
                className="text-muted-foreground"
                style={{ fontSize: sizes.xs, fontFamily: sans }}
              >
                from last month
              </span>
            </div>
            <Progress value={65} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription style={{ fontFamily: sans, fontSize: sizes.xs }}>
              Active Users
            </CardDescription>
            <CardTitle style={{ fontFamily: sans, fontSize: sizes['2xl'] }}>
              2,350
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" style={{ fontSize: sizes.xs }}>
                +12.5%
              </Badge>
              <span
                className="text-muted-foreground"
                style={{ fontSize: sizes.xs, fontFamily: sans }}
              >
                from last week
              </span>
            </div>
            <Progress value={42} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription style={{ fontFamily: sans, fontSize: sizes.xs }}>
              Conversion Rate
            </CardDescription>
            <CardTitle style={{ fontFamily: sans, fontSize: sizes['2xl'] }}>
              3.24%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" style={{ fontSize: sizes.xs }}>
                -2.3%
              </Badge>
              <span
                className="text-muted-foreground"
                style={{ fontSize: sizes.xs, fontFamily: sans }}
              >
                from last month
              </span>
            </div>
            <Progress value={24} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription style={{ fontFamily: sans, fontSize: sizes.xs }}>
              Total Orders
            </CardDescription>
            <CardTitle style={{ fontFamily: sans, fontSize: sizes['2xl'] }}>
              1,234
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="default" style={{ fontSize: sizes.xs }}>
                +8.2%
              </Badge>
              <span
                className="text-muted-foreground"
                style={{ fontSize: sizes.xs, fontFamily: sans }}
              >
                from last month
              </span>
            </div>
            <Progress value={78} className="mt-3" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList style={{ fontFamily: sans, fontSize: sizes.sm }}>
          <TabsTrigger value="revenue">Revenue & Expenses</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
        </TabsList>
        <TabsContent value="revenue" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: sans, fontSize: sizes.xl }}>
                Revenue vs Expenses
              </CardTitle>
              <CardDescription style={{ fontFamily: sans, fontSize: sizes.sm }}>
                Monthly comparison for the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      style={{ fontFamily: sans, fontSize: sizes.xs }}
                    />
                    <YAxis style={{ fontFamily: sans, fontSize: sizes.xs }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend
                      wrapperStyle={{ fontFamily: sans, fontSize: sizes.sm }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="expenses" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="traffic" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: sans, fontSize: sizes.xl }}>
                Weekly Traffic
              </CardTitle>
              <CardDescription style={{ fontFamily: sans, fontSize: sizes.sm }}>
                Visitor count for the past week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trafficData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="day"
                      style={{ fontFamily: sans, fontSize: sizes.xs }}
                    />
                    <YAxis style={{ fontFamily: sans, fontSize: sizes.xs }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="visitors"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: sans, fontSize: sizes.xl }}>
            Recent Transactions
          </CardTitle>
          <CardDescription style={{ fontFamily: sans, fontSize: sizes.sm }}>
            You have 23 transactions this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ fontFamily: sans, fontSize: sizes.sm }}>
                  Customer
                </TableHead>
                <TableHead style={{ fontFamily: sans, fontSize: sizes.sm }}>
                  Status
                </TableHead>
                <TableHead style={{ fontFamily: sans, fontSize: sizes.sm }}>
                  Date
                </TableHead>
                <TableHead
                  className="text-right"
                  style={{ fontFamily: sans, fontSize: sizes.sm }}
                >
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell
                  className="font-medium"
                  style={{ fontFamily: sans, fontSize: sizes.sm }}
                >
                  Olivia Martin
                </TableCell>
                <TableCell>
                  <Badge variant="default" style={{ fontSize: sizes.xs }}>
                    Completed
                  </Badge>
                </TableCell>
                <TableCell
                  style={{ fontFamily: mono, fontSize: sizes.xs }}
                  className="text-muted-foreground"
                >
                  2024-03-15
                </TableCell>
                <TableCell
                  className="text-right font-medium"
                  style={{ fontFamily: mono, fontSize: sizes.sm }}
                >
                  $1,299.00
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  className="font-medium"
                  style={{ fontFamily: sans, fontSize: sizes.sm }}
                >
                  Jackson Lee
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" style={{ fontSize: sizes.xs }}>
                    Pending
                  </Badge>
                </TableCell>
                <TableCell
                  style={{ fontFamily: mono, fontSize: sizes.xs }}
                  className="text-muted-foreground"
                >
                  2024-03-14
                </TableCell>
                <TableCell
                  className="text-right font-medium"
                  style={{ fontFamily: mono, fontSize: sizes.sm }}
                >
                  $599.00
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  className="font-medium"
                  style={{ fontFamily: sans, fontSize: sizes.sm }}
                >
                  Isabella Nguyen
                </TableCell>
                <TableCell>
                  <Badge variant="default" style={{ fontSize: sizes.xs }}>
                    Completed
                  </Badge>
                </TableCell>
                <TableCell
                  style={{ fontFamily: mono, fontSize: sizes.xs }}
                  className="text-muted-foreground"
                >
                  2024-03-13
                </TableCell>
                <TableCell
                  className="text-right font-medium"
                  style={{ fontFamily: mono, fontSize: sizes.sm }}
                >
                  $899.00
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  className="font-medium"
                  style={{ fontFamily: sans, fontSize: sizes.sm }}
                >
                  William Kim
                </TableCell>
                <TableCell>
                  <Badge variant="destructive" style={{ fontSize: sizes.xs }}>
                    Failed
                  </Badge>
                </TableCell>
                <TableCell
                  style={{ fontFamily: mono, fontSize: sizes.xs }}
                  className="text-muted-foreground"
                >
                  2024-03-12
                </TableCell>
                <TableCell
                  className="text-right font-medium"
                  style={{ fontFamily: mono, fontSize: sizes.sm }}
                >
                  $299.00
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  className="font-medium"
                  style={{ fontFamily: sans, fontSize: sizes.sm }}
                >
                  Sofia Davis
                </TableCell>
                <TableCell>
                  <Badge variant="default" style={{ fontSize: sizes.xs }}>
                    Completed
                  </Badge>
                </TableCell>
                <TableCell
                  style={{ fontFamily: mono, fontSize: sizes.xs }}
                  className="text-muted-foreground"
                >
                  2024-03-11
                </TableCell>
                <TableCell
                  className="text-right font-medium"
                  style={{ fontFamily: mono, fontSize: sizes.sm }}
                >
                  $1,999.00
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      {/* Collapsible Section */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle style={{ fontFamily: sans, fontSize: sizes.lg }}>
                  System Settings
                </CardTitle>
                <CardDescription style={{ fontFamily: sans, fontSize: sizes.sm }}>
                  Advanced configuration options
                </CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                <button
                  className="px-3 py-1 text-sm border rounded hover:bg-accent"
                  style={{ fontFamily: sans, fontSize: sizes.sm }}
                >
                  {isOpen ? 'Hide' : 'Show'}
                </button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <div
                    className="font-medium"
                    style={{ fontFamily: sans, fontSize: sizes.sm }}
                  >
                    Enable notifications
                  </div>
                  <div
                    className="text-muted-foreground"
                    style={{ fontFamily: sans, fontSize: sizes.xs }}
                  >
                    Receive email updates about your account
                  </div>
                </div>
                <div className="w-10 h-6 bg-primary rounded-full" />
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <div
                    className="font-medium"
                    style={{ fontFamily: sans, fontSize: sizes.sm }}
                  >
                    Two-factor authentication
                  </div>
                  <div
                    className="text-muted-foreground"
                    style={{ fontFamily: sans, fontSize: sizes.xs }}
                  >
                    Add an extra layer of security
                  </div>
                </div>
                <div className="w-10 h-6 bg-muted rounded-full" />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div
                    className="font-medium"
                    style={{ fontFamily: sans, fontSize: sizes.sm }}
                  >
                    Marketing emails
                  </div>
                  <div
                    className="text-muted-foreground"
                    style={{ fontFamily: sans, fontSize: sizes.xs }}
                  >
                    Receive product updates and offers
                  </div>
                </div>
                <div className="w-10 h-6 bg-primary rounded-full" />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}

function CardTemplate({ config }: { config: DesignSystemConfig }) {
  return (
    <div className="max-w-2xl mx-auto theme-space-y-6">
      <div className="border bg-card text-card-foreground theme-rounded-lg theme-p-4">
        <h3 className="theme-font-sans theme-text-lg font-semibold mb-2 leading-tight">
          Product Card Example
        </h3>
        <p className="theme-font-sans theme-text-sm text-muted-foreground mb-4 leading-normal">
          This card demonstrates your spacing, radius, and typography configuration in action.
        </p>
        <div className="flex theme-gap-3">
          <button className="px-4 py-2 bg-primary text-primary-foreground font-medium theme-rounded theme-text-sm theme-font-sans">
            Primary Action
          </button>
          <button className="px-4 py-2 border font-medium theme-rounded theme-text-sm theme-font-sans">
            Secondary
          </button>
        </div>
      </div>

      <div className="border bg-card text-card-foreground theme-rounded-lg theme-p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="theme-font-sans theme-text-base font-semibold leading-tight">
              Settings Panel
            </h3>
            <p className="theme-font-sans theme-text-xs text-muted-foreground leading-normal">
              Configure your preferences
            </p>
          </div>
          <button className="text-muted-foreground hover:text-foreground theme-text-sm">
            ✕
          </button>
        </div>
        <div className="theme-space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="theme-font-sans theme-text-sm">
              Enable notifications
            </span>
            <button
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors"
              style={{ borderRadius: '9999px' }}
            >
              <span className="inline-block h-4 w-4 transform rounded-full bg-primary-foreground shadow-sm transition-transform translate-x-6" />
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="theme-font-sans theme-text-sm">
              Dark mode
            </span>
            <button
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors"
              style={{ borderRadius: '9999px' }}
            >
              <span className="inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormTemplate({ config }: { config: DesignSystemConfig }) {
  const spacing = config.semantic.spacing['component-padding']
  const radius = config.semantic.radius.surface
  const interactiveRadius = config.semantic.radius.interactive
  const sans = config.primitives.typography.fontFamilies.sans.stack
  const sizes = config.primitives.typography.typeScale.sizes
  const lineHeights = config.primitives.typography.lineHeights

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="border bg-card text-card-foreground"
        style={{ borderRadius: radius, padding: spacing }}
      >
        <h2
          className="font-semibold mb-2"
          style={{
            fontFamily: sans,
            fontSize: sizes.xl,
            lineHeight: lineHeights.tight
          }}
        >
          Account Settings
        </h2>
        <p
          className="text-muted-foreground mb-6"
          style={{
            fontFamily: sans,
            fontSize: sizes.sm,
            lineHeight: lineHeights.normal
          }}
        >
          Manage your account preferences and notification settings
        </p>

        <div className="space-y-6">
          {/* Text Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block mb-2 font-medium text-sm"
                style={{ fontFamily: sans, fontSize: sizes.sm }}
              >
                First Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-input bg-background"
                style={{ borderRadius: interactiveRadius, fontFamily: sans, fontSize: sizes.sm }}
                placeholder="John"
              />
            </div>
            <div>
              <label
                className="block mb-2 font-medium text-sm"
                style={{ fontFamily: sans, fontSize: sizes.sm }}
              >
                Last Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-input bg-background"
                style={{ borderRadius: interactiveRadius, fontFamily: sans, fontSize: sizes.sm }}
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label
              className="block mb-2 font-medium text-sm"
              style={{ fontFamily: sans, fontSize: sizes.sm }}
            >
              Email Address
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-input bg-background"
              style={{ borderRadius: interactiveRadius, fontFamily: sans, fontSize: sizes.sm }}
              placeholder="john.doe@example.com"
            />
          </div>

          {/* Select Dropdown */}
          <div>
            <label
              className="block mb-2 font-medium text-sm"
              style={{ fontFamily: sans, fontSize: sizes.sm }}
            >
              Country
            </label>
            <select
              className="w-full px-3 py-2 border border-input bg-background"
              style={{ borderRadius: interactiveRadius, fontFamily: sans, fontSize: sizes.sm }}
            >
              <option>United States</option>
              <option>Canada</option>
              <option>United Kingdom</option>
              <option>Australia</option>
              <option>Germany</option>
            </select>
          </div>

          {/* Radio Buttons */}
          <div>
            <label
              className="block mb-3 font-medium text-sm"
              style={{ fontFamily: sans, fontSize: sizes.sm }}
            >
              Account Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="accountType"
                  className="w-4 h-4 text-primary border-input"
                  defaultChecked
                />
                <span style={{ fontFamily: sans, fontSize: sizes.sm }}>
                  Personal
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="accountType"
                  className="w-4 h-4 text-primary border-input"
                />
                <span style={{ fontFamily: sans, fontSize: sizes.sm }}>
                  Business
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="accountType"
                  className="w-4 h-4 text-primary border-input"
                />
                <span style={{ fontFamily: sans, fontSize: sizes.sm }}>
                  Enterprise
                </span>
              </label>
            </div>
          </div>

          {/* Checkboxes */}
          <div>
            <label
              className="block mb-3 font-medium text-sm"
              style={{ fontFamily: sans, fontSize: sizes.sm }}
            >
              Notification Preferences
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary border-input"
                  style={{ borderRadius: '0.25rem' }}
                  defaultChecked
                />
                <span style={{ fontFamily: sans, fontSize: sizes.sm }}>
                  Email notifications
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary border-input"
                  style={{ borderRadius: '0.25rem' }}
                  defaultChecked
                />
                <span style={{ fontFamily: sans, fontSize: sizes.sm }}>
                  Push notifications
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary border-input"
                  style={{ borderRadius: '0.25rem' }}
                />
                <span style={{ fontFamily: sans, fontSize: sizes.sm }}>
                  SMS notifications
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary border-input"
                  style={{ borderRadius: '0.25rem' }}
                />
                <span style={{ fontFamily: sans, fontSize: sizes.sm }}>
                  Marketing emails
                </span>
              </label>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <div
                  className="font-medium"
                  style={{ fontFamily: sans, fontSize: sizes.sm }}
                >
                  Two-factor Authentication
                </div>
                <p
                  className="text-muted-foreground"
                  style={{ fontFamily: sans, fontSize: sizes.xs }}
                >
                  Add an extra layer of security to your account
                </p>
              </div>
              <button
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors"
                style={{ borderRadius: '9999px' }}
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform translate-x-1" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div
                  className="font-medium"
                  style={{ fontFamily: sans, fontSize: sizes.sm }}
                >
                  Public Profile
                </div>
                <p
                  className="text-muted-foreground"
                  style={{ fontFamily: sans, fontSize: sizes.xs }}
                >
                  Make your profile visible to everyone
                </p>
              </div>
              <button
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors"
                style={{ borderRadius: '9999px' }}
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-primary-foreground shadow-sm transition-transform translate-x-6" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div
                  className="font-medium"
                  style={{ fontFamily: sans, fontSize: sizes.sm }}
                >
                  Activity Status
                </div>
                <p
                  className="text-muted-foreground"
                  style={{ fontFamily: sans, fontSize: sizes.xs }}
                >
                  Show when you're active
                </p>
              </div>
              <button
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors"
                style={{ borderRadius: '9999px' }}
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-primary-foreground shadow-sm transition-transform translate-x-6" />
              </button>
            </div>
          </div>

          {/* Textarea */}
          <div>
            <label
              className="block mb-2 font-medium text-sm"
              style={{ fontFamily: sans, fontSize: sizes.sm }}
            >
              Bio
            </label>
            <textarea
              className="w-full px-3 py-2 border border-input bg-background"
              style={{
                borderRadius: interactiveRadius,
                fontFamily: sans,
                fontSize: sizes.sm,
                lineHeight: lineHeights.normal
              }}
              rows={3}
              placeholder="Tell us about yourself..."
            />
            <p
              className="text-muted-foreground mt-1"
              style={{ fontFamily: sans, fontSize: sizes.xs }}
            >
              Brief description for your profile. Max 500 characters.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              className="flex-1 px-4 py-2 border border-input bg-background font-medium hover:bg-accent transition-colors"
              style={{
                borderRadius: interactiveRadius,
                fontFamily: sans,
                fontSize: sizes.sm
              }}
            >
              Cancel
            </button>
            <button
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              style={{
                borderRadius: interactiveRadius,
                fontFamily: sans,
                fontSize: sizes.sm
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BlogTemplate({ config }: { config: DesignSystemConfig }) {
  const sans = config.primitives.typography.fontFamilies.sans.stack
  const serif = config.primitives.typography.fontFamilies.serif.stack
  const mono = config.primitives.typography.fontFamilies.mono.stack
  const sizes = config.primitives.typography.typeScale.sizes
  const lineHeights = config.primitives.typography.lineHeights

  return (
    <article className="max-w-3xl mx-auto prose prose-lg">
      {/* Title */}
      <h1
        style={{
          fontFamily: serif,
          fontSize: sizes['4xl'],
          lineHeight: lineHeights.tight,
          fontWeight: 700,
          marginBottom: '0.5em'
        }}
      >
        The Evolution of Modern Design Systems
      </h1>

      {/* Meta */}
      <div
        className="flex items-center gap-4 text-muted-foreground pb-6 border-b mb-8"
        style={{
          fontFamily: sans,
          fontSize: sizes.sm,
          lineHeight: lineHeights.normal
        }}
      >
        <span>By Jane Designer</span>
        <span>•</span>
        <span>March 15, 2024</span>
        <span>•</span>
        <span>8 min read</span>
      </div>

      {/* Lead paragraph */}
      <p
        className="text-lg"
        style={{
          fontFamily: serif,
          fontSize: sizes.lg,
          lineHeight: lineHeights.relaxed,
          marginBottom: '1.5em'
        }}
      >
        Design systems have fundamentally transformed how teams build digital products. What started
        as simple style guides has evolved into comprehensive, living ecosystems that power modern
        user interfaces.
      </p>

      {/* Heading 2 */}
      <h2
        style={{
          fontFamily: serif,
          fontSize: sizes['2xl'],
          lineHeight: lineHeights.tight,
          fontWeight: 700,
          marginTop: '2em',
          marginBottom: '0.75em'
        }}
      >
        The Foundation: Design Tokens
      </h2>

      {/* Body paragraph */}
      <p
        style={{
          fontFamily: serif,
          fontSize: sizes.base,
          lineHeight: lineHeights.relaxed,
          marginBottom: '1.25em'
        }}
      >
        At the heart of every design system lies a carefully crafted set of design tokens. These
        atomic values define the visual DNA of your product—from spacing and typography to color
        and motion.
      </p>

      {/* Blockquote */}
      <blockquote
        className="border-l-4 border-primary pl-6 my-8"
        style={{
          fontFamily: serif,
          fontSize: sizes.lg,
          lineHeight: lineHeights.normal,
          fontStyle: 'italic'
        }}
      >
        "Design tokens are the visual design atoms of the design system—specifically, they are named
        entities that store visual design attributes."
      </blockquote>

      {/* Heading 3 */}
      <h3
        style={{
          fontFamily: serif,
          fontSize: sizes.xl,
          lineHeight: lineHeights.tight,
          fontWeight: 600,
          marginTop: '1.5em',
          marginBottom: '0.5em'
        }}
      >
        Key Components of a Token System
      </h3>

      {/* Unordered list */}
      <ul
        className="space-y-2 my-6"
        style={{
          fontFamily: serif,
          fontSize: sizes.base,
          lineHeight: lineHeights.normal,
          listStyleType: 'disc',
          paddingLeft: '1.5em'
        }}
      >
        <li>
          <strong>Primitives</strong>: Raw values like hex colors, pixel dimensions, and font weights
        </li>
        <li>
          <strong>Semantic tokens</strong>: Purpose-driven names that reference primitives
        </li>
        <li>
          <strong>Component tokens</strong>: Specific values for individual component variants
        </li>
      </ul>

      {/* Code block */}
      <div
        className="bg-muted rounded-lg p-4 my-6 border"
        style={{
          fontFamily: mono,
          fontSize: sizes.sm,
          lineHeight: lineHeights.normal
        }}
      >
        <pre>
          <code>{`// Example design token structure
const tokens = {
  color: {
    primary: '#2563eb',
    surface: '#ffffff'
  },
  spacing: {
    sm: '8px',
    md: '16px',
    lg: '24px'
  }
}`}</code>
        </pre>
      </div>

      {/* Ordered list */}
      <h3
        style={{
          fontFamily: serif,
          fontSize: sizes.xl,
          lineHeight: lineHeights.tight,
          fontWeight: 600,
          marginTop: '1.5em',
          marginBottom: '0.5em'
        }}
      >
        Implementation Steps
      </h3>

      <ol
        className="space-y-3 my-6"
        style={{
          fontFamily: serif,
          fontSize: sizes.base,
          lineHeight: lineHeights.normal,
          listStyleType: 'decimal',
          paddingLeft: '1.5em'
        }}
      >
        <li>
          <strong>Audit your existing design</strong> to identify patterns and inconsistencies
        </li>
        <li>
          <strong>Define your token structure</strong> starting with primitives
        </li>
        <li>
          <strong>Map semantic meanings</strong> to create a scalable system
        </li>
        <li>
          <strong>Document usage guidelines</strong> for your team
        </li>
        <li>
          <strong>Iterate based on feedback</strong> from designers and developers
        </li>
      </ol>

      {/* Pull quote / Callout */}
      <div
        className="bg-accent border-l-4 border-primary rounded-r-lg p-6 my-8"
        style={{
          fontFamily: sans,
          fontSize: sizes.base,
          lineHeight: lineHeights.normal
        }}
      >
        <p className="font-semibold mb-2">💡 Pro Tip</p>
        <p>
          Start small with spacing and color tokens. You can always expand your system as your team
          becomes more comfortable with the token approach.
        </p>
      </div>

      {/* Final paragraph */}
      <p
        style={{
          fontFamily: serif,
          fontSize: sizes.base,
          lineHeight: lineHeights.relaxed,
          marginTop: '2em'
        }}
      >
        Building a design system is a journey, not a destination. The most successful systems evolve
        with their products while maintaining consistency and enabling teams to move faster. By
        starting with a solid foundation of design tokens, you set yourself up for scalable,
        maintainable design at any scale.
      </p>

      {/* Footer meta */}
      <div
        className="border-t pt-6 mt-12 flex items-center justify-between text-muted-foreground"
        style={{
          fontFamily: sans,
          fontSize: sizes.sm,
          lineHeight: lineHeights.normal
        }}
      >
        <div className="flex gap-3">
          <span className="px-3 py-1 bg-muted rounded-full">Design Systems</span>
          <span className="px-3 py-1 bg-muted rounded-full">UI/UX</span>
          <span className="px-3 py-1 bg-muted rounded-full">Tokens</span>
        </div>
        <button className="hover:text-foreground">Share →</button>
      </div>
    </article>
  )
}

function TypographyTemplate({ config }: { config: DesignSystemConfig }) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">TYPE SCALE</h4>
        <div className="space-y-3">
          {Object.entries(config.primitives.typography.typeScale.sizes).map(([name, size]) => (
            <div key={name} className="flex items-baseline gap-4 pb-2 border-b border-border/50">
              <div className="w-20 text-xs text-muted-foreground font-mono">{name}</div>
              <div
                style={{
                  fontSize: size,
                  fontFamily: config.primitives.typography.fontFamilies.sans.stack,
                  lineHeight: config.primitives.typography.lineHeights.normal
                }}
              >
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">FONT WEIGHTS</h4>
        <div className="space-y-2">
          {Object.entries(config.primitives.typography.fontWeights).map(([name, weight]) => (
            <div
              key={name}
              style={{
                fontFamily: config.primitives.typography.fontFamilies.sans.stack,
                fontSize: config.primitives.typography.typeScale.sizes.base,
                fontWeight: weight
              }}
            >
              {name} ({weight}) - The quick brown fox jumps over the lazy dog
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">LINE HEIGHTS</h4>
        <div className="space-y-4">
          {Object.entries(config.primitives.typography.lineHeights).map(([name, height]) => (
            <div key={name} className="border-b pb-4">
              <div className="text-xs text-muted-foreground mb-2">{name} ({height})</div>
              <p
                style={{
                  fontFamily: config.primitives.typography.fontFamilies.sans.stack,
                  fontSize: config.primitives.typography.typeScale.sizes.sm,
                  lineHeight: height
                }}
              >
                Design systems are the backbone of consistent user interfaces. They provide a shared
                language and reusable components that help teams build products faster and more
                efficiently. A well-designed system scales across products and platforms.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LayoutTemplate({ config }: { config: DesignSystemConfig }) {
  const spacing = config.semantic.spacing
  const radius = config.semantic.radius

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">SPACING SCALE</h4>
        <div className="space-y-2">
          {config.primitives.spacing.values.slice(0, 9).map((value, index) => (
            <div key={value} className="flex items-center gap-4">
              <div className="w-20 text-xs text-muted-foreground font-mono">{value}px</div>
              <div
                className="bg-primary/20 border border-primary/50"
                style={{
                  width: `${value}px`,
                  height: '24px',
                  borderRadius: config.primitives.radius.values[1] + 'px'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">BORDER RADIUS</h4>
        <div className="flex flex-wrap gap-4">
          {config.primitives.radius.values.filter(v => v !== 9999).map((value) => (
            <div key={value} className="text-center">
              <div
                className="w-20 h-20 bg-primary/20 border border-primary/50 mb-2"
                style={{ borderRadius: `${value}px` }}
              />
              <div className="text-xs text-muted-foreground font-mono">{value}px</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">SEMANTIC SPACING</h4>
        <div className="space-y-2">
          {Object.entries(spacing).map(([name, value]) => (
            <div key={name} className="flex items-center gap-4">
              <div className="w-40 text-xs text-muted-foreground font-mono">{name}</div>
              <div className="text-xs text-muted-foreground">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-4">GRID SYSTEM</h4>
        <div className="border rounded-lg p-4 space-y-2 text-sm">
          <div>Columns: {config.primitives.grid.columns}</div>
          <div>Gutter: {config.primitives.grid.gutter}px</div>
          <div>Max Width: {config.primitives.grid.maxWidth}px</div>
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-1">Margins</div>
            <div className="pl-4 space-y-1 text-xs">
              <div>Mobile: {config.primitives.grid.margins.mobile}px</div>
              <div>Tablet: {config.primitives.grid.margins.tablet}px</div>
              <div>Desktop: {config.primitives.grid.margins.desktop}px</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

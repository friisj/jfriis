# Series Layout Architecture Recommendations

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ Fixed Height Container (calc(100vh - header))       │
│ ┌──────────────┬────────────────────────────────┐  │
│ │ Config       │ Images/Jobs                    │  │
│ │ (Scrollable) │ ┌──────────────────────────┐   │  │
│ │              │ │ Tabs + Upload (Sticky)   │   │  │
│ │              │ ├──────────────────────────┤   │  │
│ │              │ │                          │   │  │
│ │              │ │  Grid (Scrollable)       │   │  │
│ │              │ │                          │   │  │
│ │              │ │                          │   │  │
│ │              │ └──────────────────────────┘   │  │
│ └──────────────┴────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Key Changes

### 1. Root Container
```tsx
<div className="h-[calc(100vh-4rem)]"> {/* Subtract header height */}
  <ResizablePanelGroup direction="horizontal" className="h-full">
```

### 2. Config Panel (Left Column)
```tsx
<ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
  <div className="h-full flex flex-col overflow-hidden">
    {/* Fixed header */}
    <div className="flex-none px-6 py-4 border-b">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Series</h2>
        <Button size="sm" variant="outline">Edit</Button>
      </div>
    </div>

    {/* Scrollable content */}
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="space-y-6">
        {/* Config sections here */}
      </div>
    </div>
  </div>
</ResizablePanel>
```

### 3. Images Panel (Right Column)
```tsx
<ResizablePanel defaultSize={75} minSize={50}>
  <div className="h-full flex flex-col overflow-hidden">
    {/* Fixed tabs + upload button */}
    <div className="flex-none px-6 py-4 border-b">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>
        <Button size="sm">Upload</Button>
      </div>
    </div>

    {/* Scrollable grid */}
    <div className="flex-1 overflow-y-auto">
      <Tabs value={activeTab} className="h-full">
        <TabsContent value="images" className="h-full px-6 py-4 mt-0">
          <ImageGallery />
        </TabsContent>
      </Tabs>
    </div>
  </div>
</ResizablePanel>
```

## ConfigPanel IA Improvements

### Current Problems
- Edit mode sprawls vertically
- Generate section breaks flow
- No clear read/edit distinction
- Inconsistent spacing

### Recommended Structure

#### Read Mode
```tsx
<div className="space-y-6">
  {/* Compact info display */}
  <div className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold mb-1.5">{series.title}</h3>
      <p className="text-xs text-muted-foreground">
        {imageCount} images · {jobCount} jobs
      </p>
    </div>

    {description && (
      <div className="text-sm prose-sm">
        <ReactMarkdown>{description}</ReactMarkdown>
      </div>
    )}

    {tags.length > 0 && (
      <div className="flex flex-wrap gap-1">
        {tags.map(tag => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    )}
  </div>

  {/* Actions at bottom */}
  <div className="flex gap-2">
    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
      Edit
    </Button>
    <Button size="sm" variant="outline">
      Generate
    </Button>
  </div>
</div>
```

#### Edit Mode
```tsx
<div className="space-y-4">
  {/* Compact form */}
  <div className="space-y-3">
    <div>
      <Label className="text-xs">Title</Label>
      <Input value={title} onChange={...} className="text-sm" />
    </div>

    <div>
      <Label className="text-xs">Description</Label>
      <Textarea value={description} rows={6} className="text-sm" />
    </div>

    <div>
      <Label className="text-xs">Tags</Label>
      <Input value={tagsInput} className="text-sm" />
    </div>

    <div className="flex items-center gap-2">
      <Checkbox checked={isPrivate} />
      <span className="text-sm">Private</span>
    </div>
  </div>

  {/* Actions */}
  <div className="flex gap-2">
    <Button size="sm" onClick={handleSave}>Save</Button>
    <Button size="sm" variant="outline" onClick={handleCancel}>
      Cancel
    </Button>
  </div>
</div>
```

#### Generate Section (Separate)
Move to a Dialog/Popover instead of inline:
```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button size="sm" variant="outline">Generate</Button>
  </PopoverTrigger>
  <PopoverContent className="w-80">
    <div className="space-y-3">
      <Label>Describe this series</Label>
      <Textarea value={prompt} rows={3} />
      <Button onClick={handleGenerate}>Generate</Button>
    </div>
  </PopoverContent>
</Popover>
```

## Specific CSS Changes

### Remove These
```css
/* Don't put overflow on wrapping divs */
.h-full.overflow-y-auto.p-6  ❌

/* Don't put overflow on TabsContent */
.overflow-y-auto on TabsContent  ❌
```

### Add These
```css
/* Root container height */
.h-[calc(100vh-4rem)]  ✅

/* Column structure */
.h-full.flex.flex-col.overflow-hidden  ✅

/* Fixed header sections */
.flex-none  ✅

/* Scrollable content */
.flex-1.overflow-y-auto  ✅
```

## Implementation Priority

1. **Fix viewport height** - Add calc() to root
2. **Fix scroll containers** - Move overflow to correct elements
3. **Simplify ConfigPanel states** - Compact read/edit modes
4. **Move generate to popover** - Reduce visual clutter
5. **Add sticky tabs** - Keep controls visible

## Testing Checklist

- [ ] Config column scrolls independently
- [ ] Images grid scrolls independently
- [ ] Tabs + upload button stay visible when scrolling
- [ ] Container fills viewport height
- [ ] ResizableHandle works smoothly
- [ ] Edit/read mode transitions are smooth
- [ ] Works on different viewport heights

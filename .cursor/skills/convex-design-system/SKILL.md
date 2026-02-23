---
name: convex-design-system
description: Convex website design system components and patterns from the official Storybook. Use when building UI components, pages, or layouts that follow the Convex design language. Applies when working with React components, buttons, forms, banners, or cards.
---

# Convex Design System

Reference for the Convex website component library. Source: https://website-storybook.previews.convex.dev/

## Design tokens

Source: `@convex-dev/design-system` npm package + https://convex.dev/brand

### Brand colors
- **Red**: `#EE342F` (rgb 238, 52, 47)
- **Yellow**: `#F3B01C` (rgb 243, 176, 28)
- **Purple**: `#8D2676` (rgb 141, 38, 118)

### Theme colors (light mode)
- **Background brand**: `rgb(249, 247, 238)` (warm cream)
- **Background primary**: `rgb(243, 240, 237)` (warm light gray)
- **Background secondary**: `rgb(253, 252, 250)` (near white)
- **Background tertiary**: `rgb(240, 238, 235)`
- **Content primary**: `rgb(42, 40, 37)` (near black)
- **Content secondary**: `rgb(120, 118, 113)` (warm gray)
- **Content link**: blue-700 `rgb(33, 34, 181)`
- **Border transparent**: `rgba(33, 34, 30, 0.14)`

### Theme colors (dark mode)
- **Background primary**: `rgb(30, 28, 26)`
- **Background secondary**: `rgb(42, 40, 37)`
- **Background tertiary**: `rgb(60, 58, 65)`
- **Content primary**: `rgb(255, 255, 255)`
- **Content secondary**: `rgb(185, 177, 170)`

### Neutral scale (1-12)
- n1: `rgb(222, 226, 234)` through n12: `rgb(24, 25, 28)`

### Typography
- **Display font**: "GT America", "Inter Variable", system sans-serif stack
- **h1**: text-2xl
- **h2**: text-xl
- **h3**: text-lg font-semibold
- **h4**: text-base font-semibold
- **h5**: text-sm font-semibold
- **Logo typeface**: Kanit (lambda hidden in the "x")

### Utility colors
- **Accent**: `rgb(63, 82, 149)`
- **Info**: `rgb(7, 191, 232)` (cyan)
- **Success**: green-500 `rgb(79, 176, 20)`
- **Warning**: yellow-500 `rgb(243, 176, 28)`
- **Error/Danger**: red-500 `rgb(238, 52, 47)`

## Component quick reference

### Components

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| Banner | Status messages (info, success, error) | `variant*`, `children*`, `className` |
| Card | Clickable card linking to a page | `href*`, `children*`, `className` |
| Code | Display code with copy button | `code*`, `className`, `buttonClassName` |
| FeatureBanner | Promote a page with dark CTA banner | `title*`, `description*`, `href*`, `className` |
| Markdown | Render styled markdown content | Supports headings, lists, code, links |
| Placeholder | Placeholder/skeleton content | (see reference) |

### Buttons

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| Button | Standard button with variants | `children`, `size` (default "md"), `color` (default "yellow"), `disabled`, `onClick` |
| GlowButton | CTA button with glow effect | `text*`, `href*`, `onClick`, `trackingEvent` |

### Forms

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| Field | Label + input wrapper | `label`, `type` |
| Fieldset | Group of fields | (see reference) |
| SelectInput | Dropdown select | `options*` (`{label, value}[]`), `error`, `placeholder`, `defaultValue`, `disabled` |
| TextInput | Single-line text input | `error`, `value`, `placeholder`, `disabled` |
| TextareaInput | Multi-line text input | (see reference) |

## Usage patterns

### Banner variants

```tsx
<Banner variant="info">This is an informational message.</Banner>
<Banner variant="success">Operation completed.</Banner>
<Banner variant="error">Something went wrong.</Banner>
```

### Button variants

```tsx
// Default yellow CTA
<Button color="yellow" size="md">Click me</Button>

// Disabled state
<Button disabled>Cannot click</Button>

// Link style button
<Button>Link text</Button>

// Glow CTA button (dark with glow effect)
<GlowButton text="Start building" href="/docs" />
```

### Form inputs

```tsx
// Text input with states
<TextInput placeholder="Enter text" />
<TextInput error={true} />
<TextInput disabled />

// Select input
<SelectInput
  options={[
    { label: "Option 1", value: "1" },
    { label: "Option 2", value: "2" },
  ]}
  placeholder="Select an option..."
/>

// Field with label
<Field label="First Name" type="text" />
```

### Card component

```tsx
// Basic card (used as basis for ImageCard and TemplateCard)
<Card href="/page">Card content here</Card>
```

### Feature banner

```tsx
<FeatureBanner
  title="Feature Banner"
  description="This is the default feature banner."
  href="/learn-more"
/>
```

## Additional resources

- For detailed component prop tables, see [reference.md](reference.md)
- For complete color palette and CSS variables, see [tokens.md](tokens.md)
- Live Storybook: https://website-storybook.previews.convex.dev/
- Brand guidelines: https://convex.dev/brand
- Design system package: `@convex-dev/design-system` on npm

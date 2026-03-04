# Thumbnail Management

Thumbnails are displayed on component cards and detail pages. The system supports manual upload and automatic generation.

## Thumbnail types

| Type | Description |
|------|-------------|
| Uploaded | Manually uploaded image |
| Generated | Auto-composed from logo + template |
| None | No thumbnail (shows placeholder) |

## Uploading thumbnails

### Manual upload

1. Expand the package row
2. Open Component Details editor
3. Click "Upload Thumbnail"
4. Select an image file (PNG, JPG, WebP)
5. Click Save

### Recommended specifications

- **Aspect ratio**: 16:9
- **Size**: 1200x675 pixels
- **Format**: PNG or WebP
- **File size**: Under 2MB

## Automatic generation

When a logo is uploaded, thumbnails can be auto-generated.

### How it works

1. Admin uploads logo in Component Details
2. System composes logo onto background template
3. Generated thumbnail is saved
4. Thumbnail appears on cards and detail page

### Logo requirements

- **Aspect ratio**: Square (1:1)
- **Format**: PNG with transparency preferred
- **Size**: At least 200x200 pixels

## Thumbnail templates

Admins can manage background templates for generation.

### Viewing templates

1. Go to Settings tab
2. Find "Thumbnail Templates" section
3. View list of available templates

### Creating templates

1. Click "Add Template"
2. Upload background image (16:9)
3. Name the template
4. Set as default (optional)
5. Save

### Template specifications

- **Aspect ratio**: 16:9
- **Size**: 1200x675 pixels
- **Format**: PNG
- **Logo placement**: Centered

### Managing templates

| Action | Description |
|--------|-------------|
| Edit | Change name or image |
| Delete | Remove template |
| Set Default | Use for new auto-generations |
| Reorder | Drag to change order |

## Hiding thumbnails

The "Hide thumbnail in category listings" option:

- Hides thumbnail on category-filtered views
- Still shows in Featured section
- Still shows on detail page

Use this for components that look better without thumbnails in grid views.

## Clearing thumbnails

To remove a thumbnail:

1. Open Component Details editor
2. Click "Clear Thumbnail"
3. Click Save

The component will show a placeholder in the grid.

## Clearing logos

To remove a logo:

1. Open Component Details editor
2. Find the Logo section
3. Click "Clear Logo"
4. Click Save

This also removes any auto-generated thumbnail.

## Batch regeneration

To regenerate all thumbnails:

1. Go to Settings tab
2. Find "Thumbnail Management"
3. Click "Regenerate All Thumbnails"
4. Wait for batch processing

Use this after changing the default template.

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Thumbnail not showing | Processing delay | Refresh page |
| Generation failed | Invalid logo format | Re-upload as PNG |
| Poor quality | Logo too small | Use higher resolution |
| Wrong template | Template selection | Select correct template |

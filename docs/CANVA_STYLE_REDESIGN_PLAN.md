# Canva-Style AI Design Studio Redesign Plan

## Purpose

Build Poster Maker into a full AI-first design studio: generate the base image first, then design editable overlays in a Canva-style editor. The app should support music posters, YouTube thumbnails, social posts, story/reel covers, title-card PNGs, promo banners, and reusable asset packs.

The main shift is this:

1. Generate or prepare the main visual.
2. Design editable overlays with text, logos, title cards, images, cutouts, stickers, credits, badges, and export presets.

This avoids asking the image model to do everything perfectly in one shot. AI handles the scene/title asset generation. The editor handles final layout, typography, logos, and readable text.

## Current App Audit

Current strengths:

- Express server already serves the app and AI endpoints.
- Gemini image generation works through the Classroom credential path.
- OpenAI image generation path exists.
- Server-side gallery exists under `/api/gallery` and `/generated`.
- Title card generation exists with chroma background removal using `pngjs`.
- Poster generation already accepts hero, background, logo, and reference uploads.
- Current UI has basic controls, a canvas preview, generation, gallery, and export.

Current limits to fix:

- The canvas is a custom hand-written editor, not a real object editor.
- Text editing is field-driven, not direct rich text editing on the canvas.
- Overlay objects do not have full Canva-style resize, rotate, lock, duplicate, align, snap, group, order, save/load, and preset style support.
- There is no project format model for YouTube thumbnail, story, square post, poster, etc.
- AI generation and overlay design are mixed together instead of being a clean two-step workflow.
- Asset management is too small: no asset library, no cutout status, no generated asset variants, no reusable brand kit.
- Gallery is a flat generation list, not project-aware.
- rembg exists in the Classroom project on the same VPS, but this app container cannot import that Python package directly unless we expose it as a service, share a sidecar, or add Python/rembg to this app.

## Research Notes

Canva-style product behavior to copy:

- Fast template/format start.
- Asset upload and asset library.
- Direct canvas manipulation.
- Editable text styles and brand-like reusable styles.
- One-click resize/export flows.
- Separate generated assets from final design composition.

Editor engine options:

- Fabric.js: object model, text/image/shape controls, canvas serialization, SVG support, and JSON project save/load. Best fit for editable design documents.
- Konva: strong scene graph, layers, transformers, and performance for interactive canvas apps. Better if we build a custom editor engine from scratch.
- Current raw Canvas 2D: fine for generated preview, not enough for a Canva-style editor without rebuilding many editor primitives.

Decision:

- Use Fabric.js for the new editor foundation.
- Keep the Express server and AI routes.
- Migrate the frontend into a structured client app, ideally Vite + React + Fabric.js, while keeping deploy simple through the existing Node server.
- If migration risk is high, we can first build the Fabric editor in vanilla modules, then move to React after the editor model is stable.

Research/source links:

- Canva editor/product concepts: https://www.canva.com/help/
- Canva Apps SDK docs: https://www.canva.dev/docs/apps/
- Fabric.js docs: https://fabricjs.com/docs/
- Konva docs: https://konvajs.org/docs/
- YouTube thumbnail size guidance: https://support.google.com/youtube/answer/72431

## Product Thesis

This is not a generic blank design tool. It is a regional music and promo design production desk with AI help.

Target user:

- A creator or studio making Bhojpuri, Hindi, Chhattisgarhi, devotional, wedding-adjacent, DJ, folk, and small-business promotional visuals.
- They want fast results, big titles, recognizable people, logos, real poster density, and easy export.

Single job:

- Turn uploaded people/assets plus instructions into a finished, editable design in the correct format.

Design personality:

- Minimal setup.
- Big bold format cards.
- Large canvas.
- Direct controls.
- Commercial poster energy, but the app UI itself should stay clean, fast, and studio-like.

## Full Project Scope

The finished app is a Canva-style creative suite with a strong AI workflow, not only a poster generator.

Core product areas:

- Format studio: choose what to make and size the canvas correctly.
- Asset desk: upload, label, process, remove background, enhance, and reuse images.
- AI base generator: create the main visual plate from people, scene, pose, and style inputs.
- Editor canvas: place and edit every overlay object directly.
- Overlay library: apply ready-made text, title, badge, credits, logo, thumbnail, and poster layouts.
- AI asset generator: generate transparent title PNGs, stickers, date blocks, ornaments, frames, and callouts.
- Project library: save full editable projects and reopen later.
- Generation gallery: save all generated images/assets on the VPS.
- Export desk: export final PNG/JPG/WebP for poster, YouTube thumbnail, story, square, and custom sizes.

The app should support both fast mode and professional mode:

- Fast mode: upload photo, choose format, choose preset, generate, export.
- Professional mode: upload assets, process cutouts, generate base, design overlays, create title assets, save project, export variants.

The strongest product rule:

- AI generates artwork and assets. The editor owns all important readable text, logos, final layout, and export composition.

## Complete Creation Flow

### Flow A: Fast Poster

1. User chooses Music Poster 4:5.
2. User uploads hero/couple photo.
3. User enters title, artist names, date, credits.
4. User chooses scene, pose, palette, and title style.
5. App generates a base poster plate.
6. App applies editable overlay preset.
7. User adjusts title/credits/logos.
8. User exports PNG.

### Flow B: YouTube Thumbnail

1. User chooses YouTube Thumbnail.
2. User uploads face/person image or uses AI base.
3. User removes background from person.
4. User chooses thumbnail layout: face left/text right, shock title, before/after, arrow callout.
5. User styles title and badges.
6. User exports 1280 x 720 or 1920 x 1080.

### Flow C: AI Background Plus Editable Overlay

1. User uploads identity photo and optional background/style refs.
2. App generates 2-4 base image variants without final text.
3. User picks one as locked background.
4. User designs text, logos, date, title card, and badges in editor.
5. User saves project and exports final.

### Flow D: Asset Generator

1. User opens AI Asset Generator.
2. User chooses asset type: title, badge, sticker, ornament, credit strip, frame, arrow, lower-third.
3. User enters custom prompt and style options.
4. App generates variants.
5. App removes background with chroma or rembg.
6. User adds selected asset to canvas.

### Flow E: Image Cleanup and Cutout

1. User uploads person/product/logo image.
2. User chooses `Remove background`.
3. rembg tool creates transparent PNG.
4. User chooses cutout style: clean, sticker border, glow, shadow, YouTube pop, poster rim light.
5. User adds cutout as an editable overlay.

## Core Workflow

### Step 0: Choose Output Type

The first screen is not a landing page. It is the creation desk.

Format presets:

- Music Poster 4:5 - 1080 x 1350
- YouTube Thumbnail - 1280 x 720
- YouTube Full HD Thumbnail - 1920 x 1080
- Instagram/Facebook Square - 1080 x 1080
- Story/Reel Cover - 1080 x 1920
- Landscape Promo - 1200 x 628
- Banner Wide - 1600 x 900
- Title Card PNG - transparent
- Custom Size - user-defined width/height

Each preset stores:

- Canvas size
- Safe zones
- Default text scale
- Export defaults
- Suggested template categories

### Step 1: Collect Assets

Asset roles:

- Hero/couple/person identity photo
- Heroine/second person identity photo
- Background scene photo
- Logo left/right
- Brand logo pack
- Reference posters
- Costume/dress reference
- Pose reference
- Color palette reference
- Product/object photo
- Existing title image
- Background plate
- Texture/ornament pack

Asset actions:

- Use as-is
- Remove background only
- Remove background and enhance
- Keep face/body identity, change scene
- Keep face/body identity, change clothing
- Keep identity, adjust pose
- Keep image, generate matching background
- Use only as style reference
- Use only as logo/reference
- Use only for color palette

Asset metadata:

- `id`
- `kind`
- `role`
- `fileUrl`
- `thumbnailUrl`
- `width`
- `height`
- `createdAt`
- `source`
- `removeBgStatus`
- `identityLock`
- `usagePolicy`
- `notes`

### Step 2: Generate Base Visual

This creates the main poster/thumbnail image without final overlay text unless the user explicitly wants baked text.

Modes:

- Background only: no people, clean scene for overlays.
- Person scene: use uploaded hero/couple photo, preserve face/body, change background.
- Image as-is: place uploaded image directly into design canvas.
- Cutout subject: remove background and place subject as editable overlay.
- Dress/style change: keep face/body identity, change wardrobe styling.
- Pose change: preserve identity but guide pose with selected preset.
- Reframe/extend: adapt image to selected canvas ratio.
- Photo cleanup: improve lighting/sharpness, keep composition.
- Poster plate: generate a dense cinematic base with space for title and credits.

Base generation controls:

- Format preset
- Identity lock: strict / balanced / loose
- Retouch: none / light / polished / cinematic
- Background style
- Pose style
- Costume style
- Mood
- Color palette
- Lighting
- Camera framing
- Text space behavior
- Negative prompt
- Custom override prompt
- Number of variants

Base output behavior:

- Save all variants to server gallery.
- Let user choose one as canvas background.
- Selected base becomes locked background layer by default.
- Other variants stay in the asset tray.

### Step 3: Overlay Design

This is the Canva-style editor phase.

Editable object types:

- Text
- Rich title text
- AI title-card PNG
- Image
- Logo
- Person cutout
- Generated sticker
- Shape
- Frame
- Credit strip
- Badge
- Date block
- Artist name tag
- Decorative ornament
- Gradient/texture overlay
- Shadow/highlight overlay

Object operations:

- Drag
- Resize
- Rotate
- Crop image
- Flip
- Opacity
- Lock/unlock
- Hide/show
- Duplicate
- Delete
- Bring forward/send backward
- Align left/center/right/top/middle/bottom
- Distribute
- Snap to center/safe zones/other objects
- Group/ungroup
- Copy/paste style
- Save style as preset

Layer panel:

- Thumbnail per layer
- Rename layer
- Lock/hide controls
- Drag reorder
- Filter by text/image/logo/generated

Inspector panel:

- Shows controls for selected object.
- Text controls for text.
- Image controls for image.
- Effects controls for any object.
- AI actions for generated or uploaded assets.

## Text Style System

Text must be editable in the editor, not baked by AI unless the user chooses "baked poster".

### Text Roles

- Main title
- Subtitle/tagline
- Artist name left
- Artist name right
- Presenter
- Release label
- Release date
- Credit strip
- Footer tag
- YouTube punch title
- YouTube supporting title
- Price/promo badge
- Location/date small line
- Call-to-action
- Watermark/brand mark

### Text Style Preset Families

Music poster:

- Ornate Devanagari gold
- Bhojpuri red banner
- Chhattisgarhi folk title
- Metallic film title
- Rain romance script
- DJ neon chrome
- Devotional glow
- Rural dust title
- Palace royal title
- Fairground festival title

YouTube thumbnail:

- Impact block yellow
- White-red shock title
- Black outline viral title
- Face-side punch title
- Big number badge
- Split-screen label
- Arrow callout label
- Before/after tag
- Reaction bubble
- News lower-third

Social/promo:

- Clean brand headline
- Sale burst
- Event poster title
- Service card title
- Luxury serif promo
- Bold local business banner
- Minimal quote card
- Product label
- Menu item label
- Festival greeting

Credit/title details:

- Film credit strip
- Singer/lyrics/music/director row
- Producer/presenter line
- "Releasing on" date block
- "Official video song" footer
- Cast labels with outline
- Logo corner caption

### Text Style Controls

Core:

- Font family
- Weight
- Size
- Line height
- Letter spacing
- Alignment
- Width/auto fit
- Case transform
- Language/script hint

Fill:

- Solid fill
- Linear gradient
- Radial gradient
- Image/texture fill later
- Gold/chrome preset fill

Stroke:

- Primary stroke
- Secondary stroke
- Stroke width
- Stroke join style
- Inner/outer simulated stroke

Shadow/glow:

- Drop shadow
- Hard offset shadow
- Soft shadow
- Neon glow
- Inner glow simulation
- Long shadow

Decor:

- Background pill
- Ribbon banner
- Badge circle
- Underline swash
- Ornament curls
- Crown/top flourish
- Side flourishes
- Date capsule

Transform:

- Arc text
- Wave text
- Perspective skew
- Rotate
- Fit to box
- Stack words

## Image Overlay Style System

Image object controls:

- Crop
- Fit/cover/contain
- Corner radius
- Border
- Stroke
- Shadow
- Glow
- Color grade
- Blur background copy
- Cutout halo
- Sticker border
- Reflection
- Blend mode
- Opacity

Cutout/person styles:

- Clean cutout
- White sticker border
- Golden glow
- Cinematic rim light
- Poster shadow
- Folk color outline
- YouTube pop outline
- Devotional aura
- DJ neon edge

Logo styles:

- Use as-is
- Remove background
- White logo
- Black logo
- Gold logo
- Badge lockup
- Corner watermark
- Top presenter mark

## AI Asset Generator

Separate from poster base generation.

Asset types:

- Title card PNG
- Sticker/badge
- Date block
- Credit strip background
- Ornamental frame
- Crown/flourish
- Lower-third
- YouTube arrow/callout
- Logo cleanup variant
- Texture overlay
- Background plate
- Cutout subject

Asset generator controls:

- Asset type
- Text content
- Style family
- Color palette
- Finish
- Outline
- Shadow
- Ornament level
- Background handling
- Transparent PNG output
- Custom instruction
- Negative prompt
- Generate 4 variants

Title card variant dimensions:

- Wide title - 1600 x 600
- Poster title - 1200 x 420
- Square badge - 1024 x 1024
- YouTube punch title - 1400 x 500
- Vertical title stack - 900 x 1200

Background handling:

- Preferred: solid chroma key color, then server removes it.
- Advanced: rembg service for non-solid generated assets.
- Fallback: keep background if removal fails.

## rembg Tool Service Plan

Reality:

- Classroom project has rembg installed in its Python backend container on the same VPS.
- Poster Maker runs as a separate Node app/container.
- Same VPS does not automatically mean same Python runtime, package path, or model cache.
- The right production design is a persistent rembg HTTP tool service that Poster Maker can call.

### Decision

Add rembg as a first-class persistent service/tool:

- Service name: `rembg-tool`
- Internal URL: `http://rembg-tool:8002`
- Poster Maker env: `REMBG_URL=http://rembg-tool:8002`
- Runtime: Python FastAPI or small Flask app
- Restart policy: `unless-stopped`
- Persistent model cache volume: `rembg-model-cache:/app/.u2net`
- Persistent processed asset output stays in Poster Maker data volume: `/app/data/assets/processed`

Keep current chroma-key removal for AI title cards because it is faster and cleaner when the app controls the generated background color. Use rembg for arbitrary photos, logos, products, people, and generated assets that do not use a clean chroma background.

### Service Responsibilities

The rembg tool does only background removal and matte cleanup. It does not own projects, gallery, AI prompts, or editor state.

Responsibilities:

- Accept image upload.
- Run rembg with a selected model/session.
- Return transparent PNG bytes.
- Optionally trim transparent padding.
- Optionally add feather/alpha cleanup.
- Expose health and model status.
- Keep model downloaded on persistent volume.

Non-responsibilities:

- It does not save Poster Maker assets.
- It does not know project IDs.
- It does not call Gemini/OpenAI.
- It does not style the cutout. Styling happens in the editor.

### rembg Tool API

Health:

```http
GET /health
```

Response:

```json
{
  "ok": true,
  "model": "u2net",
  "modelLoaded": true
}
```

Remove background:

```http
POST /remove-background
Content-Type: multipart/form-data
```

Fields:

- `image`: required image file
- `model`: optional, default `u2net`
- `trim`: optional boolean, default `true`
- `alphaMatting`: optional boolean, default `false`
- `foregroundThreshold`: optional number
- `backgroundThreshold`: optional number
- `erodeSize`: optional number
- `output`: optional, default `png`

Response:

- `image/png` transparent PNG

Optional JSON mode:

```http
POST /remove-background-json
```

Response:

```json
{
  "ok": true,
  "mimeType": "image/png",
  "width": 840,
  "height": 1200,
  "imageDataUrl": "data:image/png;base64,..."
}
```

### Docker Compose Shape

Target compose services:

```yaml
services:
  postermaker:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      DATA_DIR: /app/data
      REMBG_URL: http://rembg-tool:8002
    volumes:
      - postermaker-data:/app/data
    depends_on:
      rembg-tool:
        condition: service_healthy

  rembg-tool:
    build:
      context: ./services/rembg-tool
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      U2NET_HOME: /app/.u2net
      REMBG_MODEL: u2net
      PORT: 8002
    expose:
      - "8002"
    volumes:
      - rembg-model-cache:/app/.u2net
    healthcheck:
      test: ["CMD", "curl", "--fail", "http://127.0.0.1:8002/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s

volumes:
  postermaker-data:
  rembg-model-cache:
```

### Poster Maker Server API

Poster Maker owns asset persistence. The Node server calls rembg and saves the result.

New endpoints:

- `POST /api/assets/upload`
- `POST /api/assets/remove-bg`
- `POST /api/assets/enhance`
- `POST /api/assets/generate`
- `GET /api/assets`
- `GET /api/assets/:id`
- `DELETE /api/assets/:id`
- `POST /api/generate-base`
- `POST /api/generate-title`
- `POST /api/export`

`POST /api/assets/remove-bg` request:

```json
{
  "assetId": "asset-id",
  "model": "u2net",
  "trim": true,
  "alphaMatting": false
}
```

Response:

```json
{
  "ok": true,
  "asset": {
    "id": "processed-asset-id",
    "parentAssetId": "asset-id",
    "kind": "cutout",
    "mimeType": "image/png",
    "url": "/assets/processed/processed-asset-id.png",
    "removeBg": {
      "provider": "rembg-tool",
      "model": "u2net",
      "trim": true
    }
  }
}
```

### Asset UI Tool

Every image asset card gets these actions:

- Add to canvas
- Remove background
- Replace background
- Enhance
- Use as base background
- Use as identity reference
- Use as pose reference
- Use as style reference
- Use as logo
- Download
- Delete

Remove background states:

- Ready
- Queued
- Removing background
- Done
- Failed
- Service unavailable

If `REMBG_URL` is missing or `/health` fails, the UI must show:

- "Background removal service unavailable"
- Disable the remove button
- Keep the uploaded original usable as-is

### Persistent File Layout

```text
data/
  assets/
    originals/
      asset-id.ext
    processed/
      asset-id-rembg.png
      asset-id-enhanced.png
      asset-id-cutout-style.png
    thumbnails/
      asset-id.webp
  generated/
    base/
    title/
    stickers/
  projects/
    project-id.json
  exports/
    export-id.png
  gallery.json
```

### rembg Implementation Order

1. Add `services/rembg-tool/`.
2. Add rembg service Dockerfile using the Classroom backend pattern.
3. Pre-download U2-Net model into `/app/.u2net`.
4. Add health endpoint.
5. Add `/remove-background`.
6. Add `REMBG_URL` env in Poster Maker compose.
7. Add Node proxy endpoint `/api/assets/remove-bg`.
8. Add asset card "Remove background" button.
9. Save processed PNG on the Poster Maker data volume.
10. Add processed asset to the canvas/editor.

## Project Data Model

Project:

```json
{
  "id": "project-id",
  "name": "Song poster",
  "format": "music_poster_4x5",
  "canvas": {
    "width": 1080,
    "height": 1350,
    "backgroundColor": "#111111"
  },
  "pages": [],
  "assets": [],
  "generations": [],
  "createdAt": "",
  "updatedAt": ""
}
```

Page:

```json
{
  "id": "page-id",
  "name": "Poster",
  "width": 1080,
  "height": 1350,
  "background": {
    "type": "image",
    "assetId": "asset-id",
    "locked": true
  },
  "elements": []
}
```

Element:

```json
{
  "id": "element-id",
  "type": "text",
  "role": "headline",
  "x": 540,
  "y": 960,
  "width": 900,
  "height": 180,
  "rotation": 0,
  "locked": false,
  "visible": true,
  "style": {}
}
```

Generation:

```json
{
  "id": "generation-id",
  "type": "base_image",
  "provider": "gemini",
  "model": "gemini-3.1-flash-image",
  "prompt": "",
  "inputs": [],
  "outputs": [],
  "selectedOutputId": "",
  "createdAt": ""
}
```

## UI Redesign

### App Shell

Layout:

```text
Top bar: project name, format, undo/redo, generate, export

Left rail:
  Create
  Assets
  AI
  Text
  Elements
  Templates
  Gallery

Left panel:
  Active tool controls and preset lists

Center:
  Canvas workspace with zoom, rulers/safe zone, selection handles

Right panel:
  Inspector for selected object

Bottom strip:
  Variants, pages, recent generated assets, export queue
```

### First Screen

The first screen should be the actual creation flow:

- Big "What are you making?" format cards.
- Recent projects and recent generated assets.
- Quick action: "Upload photo and start".
- Quick action: "Generate background".
- Quick action: "Make title PNG".

No marketing hero page.

### Visual Direction

Palette:

- Studio black: `#111316`
- Charcoal panel: `#1A1D22`
- Paper canvas: `#F7F2E8`
- Mint action: `#38D8B5`
- Marigold: `#F4B84F`
- Vermilion: `#F25D4B`
- Plum: `#6C3FF2`
- Soft line: `rgba(255,255,255,0.12)`

Type:

- UI: Inter or system sans
- Display accents: Bricolage Grotesque or Space Grotesk
- Devanagari/editor content: Noto Sans Devanagari / Nirmala UI fallback

Signature UI idea:

- "Production rail" stepper with large bold cards:
  - Assets
  - Generate base
  - Design overlays
  - Export

The risk:

- The UI uses a dark professional studio shell with one strong mint/marigold action system, while the canvas content can be colorful. This keeps the app modern without making the whole UI look like a poster.

### Modern UX Requirements

The redesigned UI must feel like a serious creative tool, not a form page.

Core UX rules:

- The canvas is always the center of the product.
- Upload and generation controls must be visible early, not buried at the bottom.
- Every generation action shows progress in the canvas area.
- Generated outputs appear immediately in the canvas or variant strip.
- No manual refresh is needed for gallery or assets.
- User can start with only one photo and still get a result.
- User can choose "use image as-is" at every step.
- User can always download the current canvas.
- Important text stays editable unless user explicitly chooses baked text.
- Presets should be visually selectable cards, not long plain dropdowns.
- Advanced controls collapse under "Tune" or "More".

### Screen Inventory

1. Create screen
   - Format cards
   - Recent projects
   - Start from upload
   - Start from AI prompt
   - Start from title asset

2. Studio screen
   - Left rail
   - Tool panel
   - Center canvas
   - Right inspector
   - Bottom variants/pages strip
   - Top command bar

3. Asset manager
   - Uploaded assets
   - Processed cutouts
   - Generated assets
   - Role filters
   - Search

4. Base generation wizard
   - Inputs
   - Scene/pose/style
   - Identity lock
   - Variants
   - Select as background

5. AI asset generator
   - Title cards
   - Stickers
   - Badges
   - Ornaments
   - Transparent PNG outputs

6. Template browser
   - Music posters
   - YouTube thumbnails
   - Social/promo
   - Title layouts
   - Credit strips

7. Export drawer
   - File type
   - Size
   - Transparent background where possible
   - Quality
   - Recent exports

### Top Command Bar

Controls:

- Project name
- Current format
- Resize
- Undo
- Redo
- Save state
- Generate
- Export
- Zoom
- Help/status

Primary command:

- When no base exists: `Generate base`
- When base exists and object selected: `Edit selection`
- When project is ready: `Export`

### Left Rail

Tool sections:

- Create
- Assets
- AI base
- Text
- Titles
- Elements
- Templates
- Brand
- Gallery
- Export

The left rail should use icons plus short labels. The active section opens the left panel.

### Left Panel Behavior

Create:

- Format selection
- Start from photo
- Start from prompt
- Start from template

Assets:

- Upload dropzone
- Asset role tags
- Remove background
- Add to canvas
- Asset filters

AI base:

- Prompt
- Scene
- Pose
- Costume
- Identity lock
- Generate variants

Text:

- Add heading
- Add subtitle
- Add credit strip
- Text style presets
- Language/script

Titles:

- AI title generator
- Title card presets
- Generated title variants
- Add selected title to canvas

Elements:

- Shapes
- Badges
- Frames
- Arrows
- Ornaments
- Texture overlays

Templates:

- Full overlay layouts
- Format-specific templates
- Apply without replacing background

Brand:

- Logos
- Colors
- Saved text styles
- Default credits

Gallery:

- Generated base images
- Generated title cards
- Generated stickers
- Previous exports

### Right Inspector

Inspector changes by selection:

No selection:

- Canvas background
- Format
- Safe zones
- Page settings

Text selected:

- Text content
- Style preset
- Font
- Fill
- Stroke
- Shadow
- Effects
- Position
- Layer order

Image selected:

- Crop
- Fit
- Remove background
- Border
- Shadow
- Glow
- Color grade
- Position
- Layer order

Multiple selected:

- Align
- Distribute
- Group
- Duplicate
- Delete

### Bottom Strip

Purpose:

- Show variants and pages without hiding the canvas.

Modes:

- Base variants
- AI asset variants
- Pages
- Recent exports

### Mobile UX

Mobile should not show three columns. It should use:

- Canvas first.
- Bottom toolbar for tools.
- Slide-up sheet for active controls.
- Large tap targets.
- One selected object inspector at a time.
- Gallery and assets as full-screen sheets.

Mobile priority:

1. Generate.
2. Pick variant.
3. Add/edit text.
4. Move/scale objects.
5. Export.

Advanced precision layout can remain desktop-first.

## Preset Libraries

The preset library is the heart of speed. It should be structured data, not hard-coded random UI strings.

Preset object shape:

```json
{
  "id": "ornate_devanagari_gold",
  "name": "Ornate Devanagari Gold",
  "category": "text.title.music",
  "formatSupport": ["music_poster_4x5", "story", "square"],
  "tags": ["music", "regional", "gold", "title"],
  "style": {},
  "promptFragment": "",
  "previewAsset": ""
}
```

### Step Preset Matrix

Start step:

- Music poster
- YouTube thumbnail
- Instagram square
- Story/reel cover
- Landscape promo
- Title card PNG
- Festival greeting
- Product promo
- Event poster
- Custom size

Asset step:

- Person identity
- Couple identity
- Product
- Logo
- Background
- Pose reference
- Dress reference
- Style reference
- Existing poster
- Existing title
- Texture
- Ornament
- Brand kit

Base generation step:

- Generate background only
- Generate with person
- Preserve uploaded photo as-is
- Remove background only
- Replace scene
- Change outfit
- Change pose
- Reframe/extend
- Enhance photo
- Create poster plate
- Create thumbnail plate

Overlay step:

- Add title
- Add subtitle
- Add artist names
- Add logo
- Add date
- Add credit strip
- Add badge
- Add cutout
- Add sticker
- Add frame
- Add arrow/callout
- Add gradient overlay
- Add texture overlay

Export step:

- PNG high quality
- JPG compressed
- WebP
- Transparent PNG
- YouTube thumbnail
- Story
- Square post
- Poster print
- Custom export

### Asset Action Catalog

Upload actions:

- Upload files
- Capture from camera later
- Paste image from clipboard later
- Import from URL later
- Pick from gallery
- Use generated output

Role actions:

- Mark as hero
- Mark as heroine
- Mark as couple
- Mark as background
- Mark as logo
- Mark as product
- Mark as pose reference
- Mark as dress reference
- Mark as style reference
- Mark as texture

Processing actions:

- Remove background
- Trim transparent padding
- Enhance face/photo
- Upscale later
- Crop
- Rotate
- Flip
- Make square thumbnail
- Make web preview
- Convert to transparent PNG
- Extract palette
- Detect dominant colors later

Use actions:

- Add to canvas
- Set as background
- Set as locked base
- Use as AI input
- Use as style reference
- Use as title texture
- Use as logo watermark
- Duplicate processed variant

### Text Style Catalog

Music title styles:

- Ornate Devanagari Gold
- Bhojpuri Banner Red
- Chhattisgarhi Folk Cream
- Metallic Film Gold
- Royal Palace Script
- DJ Neon Chrome
- Rain Romance Blue
- Devotional Glow
- Rural Dust Serif
- Fairground Festival
- Street Album Bold
- Sad Song Soft Gold
- Comedy Folk Loud
- Action Drama Steel
- Wedding Song Floral

YouTube text styles:

- Yellow Impact Black Stroke
- White Viral Red Stroke
- Red Alert Block
- Black/Yellow Split
- Clean Creator White
- Shock Number Badge
- Before After Labels
- Arrow Callout Text
- News Lower Third
- Tutorial Step Label
- Product Reveal Title
- Reaction Bubble

Promo text styles:

- Sale Burst
- Luxury Serif
- Event Poster Bold
- Local Business Banner
- Festival Greeting
- Service Card Clean
- Price Tag Bold
- Menu Item Label
- Product Launch
- Quote Card

Credit styles:

- Film Credit Dense
- Music Video Credit Row
- Singer/Lyrics/Music Strip
- Release Date Block
- Presenter Top Line
- Producer Badge
- Logo Caption
- Footer Tag

### Text Finish Catalog

Fill finishes:

- Solid
- Two-color gradient
- Gold bevel
- Chrome
- Red enamel
- Cream ink
- Neon tube
- Painted brush
- Embossed paper
- Grain print
- White clean
- Black clean

Stroke styles:

- No stroke
- Thin crisp
- Thick black
- Thick maroon
- Double outline
- Sticker white
- Gold outer rim
- Neon edge
- Hard offset
- Inner dark edge

Shadow styles:

- None
- Soft drop
- Deep poster
- Hard offset
- Long shadow
- Glow
- Neon glow
- Under-title smoke
- Bottom grounding shadow

Decor styles:

- None
- Underline swash
- Side swashes
- Crown top
- Floral curls
- Folk dots
- DJ sparks
- Devotional rays
- Ribbon backplate
- Date capsule

### Image Effect Catalog

Cutout effects:

- Clean alpha
- White sticker border
- Black sticker border
- Gold rim
- Neon rim
- Soft shadow
- Deep poster shadow
- YouTube pop shadow
- Cinematic rim light
- Devotional aura
- Folk color edge
- Product clean shadow

Image color effects:

- Original
- Warm poster
- Cool cinematic
- High contrast
- Soft romance
- Film grain
- Fairground glow
- Monsoon blue
- Devotional warm
- YouTube punch
- Product clean
- Black and white

Background effects:

- Blur copy
- Dark vignette
- Center spotlight
- Gradient wash
- Dust/smoke
- Bokeh lights
- Stage lights
- Paper grain
- Poster texture
- Color overlay

Logo effects:

- Use as-is
- Remove background
- White logo
- Black logo
- Gold logo
- Badge lockup
- Small corner
- Presenter line
- Watermark
- Stamp

### Overlay Kit Catalog

Music poster kits:

- Classic regional music poster
- Title-heavy poster
- Fairground song
- Palace drama
- Rural release
- Devotional poster
- DJ night poster
- Rain romance poster
- Action folk poster
- Wedding song poster

YouTube kits:

- Face plus headline
- Split before/after
- Arrow/callout
- Big number
- News alert
- Product reveal
- Tutorial steps
- Reaction thumbnail
- Podcast clip
- Music release thumbnail

Social/promo kits:

- Event announcement
- Product promo
- Service ad
- Festival greeting
- Course/offer poster
- Local business banner
- Price list
- Menu promo
- Quote card
- Launch teaser

### AI Prompt Style Dimensions

Every AI generation preset should map to these dimensions:

- Subject handling
- Identity lock
- Body composition lock
- Pose
- Wardrobe
- Scene
- Lighting
- Color palette
- Camera/framing
- Poster density
- Text space
- Realism level
- Retouch level
- Negative prompt
- Output format

Prompt override modes:

- Append to preset
- Replace style only
- Replace full prompt
- Strict command mode

Strict command mode must still keep safety and identity instructions.

## Database-Driven Prompt System

Production prompts must not live only in `server.js`. The app needs a database-driven prompt system so prompts can be edited, versioned, tested, rolled back, and upgraded without code deploys.

### Prompt System Goals

- Admin can update prompt templates from an internal prompt manager.
- Every generation request stores the exact prompt version used.
- Prompt changes are versioned and reversible.
- Different workflows can compose different prompt blocks.
- Safety, identity lock, and output-format rules cannot be removed accidentally.
- Presets can map to prompt fragments without hard-coded strings.
- Old projects remain reproducible because they store prompt version references.
- Prompt upgrades can be tested before becoming default.

### Database Choice

Start with SQLite on the persistent VPS volume:

- Simple deployment.
- No separate database service required.
- Good enough for prompts, projects, assets, gallery, and job metadata.
- Easy backup as one file.

Future upgrade path:

- Migrate to Postgres when user accounts, team sharing, or high concurrency is needed.
- Keep prompt schema relational so migration is direct.

Database file:

```text
data/postermaker.sqlite
```

Backup rule:

- Copy `data/postermaker.sqlite`.
- Keep generated images/assets in `data/`.
- Store prompt export JSON snapshots in `data/backups/prompts/`.

### Prompt Entities

Prompt template:

```json
{
  "id": "base_music_poster",
  "name": "Base Music Poster",
  "type": "base_generation",
  "status": "active",
  "activeVersionId": "version-id",
  "description": "Generates the base music poster image plate",
  "createdAt": "",
  "updatedAt": ""
}
```

Prompt version:

```json
{
  "id": "version-id",
  "templateId": "base_music_poster",
  "version": 12,
  "status": "published",
  "modelFamily": "gemini",
  "content": "",
  "variables": [],
  "requiredBlocks": ["identity_lock", "safety_negative", "output_format"],
  "changeNote": "Improve title-free background generation",
  "createdBy": "admin",
  "createdAt": ""
}
```

Prompt block:

```json
{
  "id": "identity_lock_strict",
  "category": "identity_lock",
  "status": "active",
  "content": "Preserve face geometry, body size, skin tone...",
  "locked": true,
  "version": 4
}
```

Prompt preset mapping:

```json
{
  "presetId": "fairground_song",
  "promptBlockIds": ["scene_fairground", "lighting_festive", "poster_density_high"],
  "negativeBlockIds": ["avoid_ai_face", "avoid_bad_text"]
}
```

Generation run:

```json
{
  "id": "generation-id",
  "projectId": "project-id",
  "type": "base_generation",
  "provider": "gemini",
  "model": "gemini-3.1-flash-image",
  "templateVersionIds": ["version-id"],
  "promptBlockVersionIds": ["block-version-id"],
  "resolvedPrompt": "",
  "resolvedNegativePrompt": "",
  "inputAssetIds": [],
  "outputAssetIds": [],
  "createdAt": ""
}
```

### Prompt Types

Prompt templates needed:

- `base_background_only`
- `base_music_poster`
- `base_youtube_thumbnail`
- `base_story_cover`
- `identity_scene_change`
- `identity_pose_change`
- `identity_costume_change`
- `image_as_is_cleanup`
- `image_reframe_extend`
- `asset_title_card`
- `asset_sticker`
- `asset_badge`
- `asset_ornament`
- `asset_credit_strip`
- `asset_frame`
- `logo_cleanup`
- `product_cutout_style`
- `overlay_layout_suggestion`
- `negative_common`
- `negative_text_quality`
- `negative_identity_drift`

Prompt blocks needed:

- Identity lock strict
- Identity lock balanced
- Identity lock loose
- Body composition lock
- Face realism
- Retouch none/light/polished
- Scene instruction
- Pose instruction
- Costume instruction
- Camera/framing
- Lighting
- Palette
- Output format
- Text-space behavior
- Baked text behavior
- Editable overlay behavior
- Safety/common negative
- Typography quality
- Title-card transparent/chroma behavior
- YouTube thumbnail readability
- Music poster density

### Prompt Resolver Flow

Every AI request must go through a resolver.

Flow:

1. User chooses format, workflow, presets, assets, and custom instructions.
2. Client sends structured config, not a finished final prompt.
3. Server creates a generation run.
4. Server loads active prompt template for the workflow.
5. Server loads required locked blocks.
6. Server loads preset blocks.
7. Server validates variables.
8. Server applies custom instruction according to override mode.
9. Server resolves final prompt and negative prompt.
10. Server stores the resolved prompt, versions, inputs, and model.
11. Server calls Gemini/OpenAI.
12. Server stores outputs and links them to the generation run.

Pseudo flow:

```text
workflow + format + preset ids + asset roles + custom command
  -> prompt template
  -> required locked blocks
  -> preset prompt blocks
  -> variable interpolation
  -> override policy
  -> final prompt
  -> generation run audit record
  -> provider call
  -> output assets
```

### Prompt Override Modes

Append:

- User instruction is appended after presets.
- Safety and identity blocks remain.
- Default for normal users.

Replace style:

- User instruction replaces style/palette/scene blocks.
- Identity, safety, format, and output blocks remain.

Replace full:

- User instruction replaces most creative prompt.
- Locked blocks remain.
- Only advanced users/admin.

Strict command:

- User instruction gets highest priority after locked blocks.
- Must still keep identity/safety/output constraints.
- Useful for "do exactly this style" testing.

### Prompt Upgrade Support

Prompt versions must be immutable after publish.

Lifecycle:

- Draft
- Review
- Published
- Active
- Archived

Rules:

- Editing an active prompt creates a new draft version.
- Activating a draft moves the active pointer.
- Old generation records keep old version IDs.
- Rollback sets active pointer back to older published version.
- Draft prompts can be tested with `previewPrompt=true`.

Prompt upgrade checklist:

1. Create draft version.
2. Add change note.
3. Run test cases.
4. Compare outputs.
5. Publish version.
6. Activate for selected workflow.
7. Monitor generation failures.
8. Roll back if needed.

### Prompt Test Cases

Store test cases in DB or JSON:

- Music poster with one hero image.
- Music poster with couple image.
- YouTube thumbnail with cutout.
- Title card transparent PNG.
- Logo cleanup.
- Background-only fairground.
- Strict identity lock.
- Dress change.
- Pose change.
- No uploaded image fallback.

Each test case stores:

- Input config
- Asset fixture references
- Expected prompt fragments
- Expected no-go fragments
- Expected output behavior

### Prompt Admin UI

Admin panel sections:

- Prompt templates
- Prompt blocks
- Preset mappings
- Test cases
- Generation audit
- Version history
- Rollback controls

Admin actions:

- Create prompt template
- Edit draft
- Publish version
- Activate version
- Archive version
- Duplicate from old version
- Run test prompt
- View resolved prompt
- Compare two versions
- Export prompt pack
- Import prompt pack

Important UI rule:

- Locked safety/identity blocks should show a lock icon and cannot be removed in normal editing.

### Prompt Database Tables

Initial tables:

```sql
prompt_templates (
  id text primary key,
  name text not null,
  type text not null,
  status text not null,
  active_version_id text,
  description text,
  created_at text not null,
  updated_at text not null
)

prompt_versions (
  id text primary key,
  template_id text not null,
  version integer not null,
  status text not null,
  model_family text,
  content text not null,
  variables_json text not null,
  required_blocks_json text not null,
  change_note text,
  created_by text,
  created_at text not null
)

prompt_blocks (
  id text primary key,
  name text not null,
  category text not null,
  status text not null,
  locked integer not null default 0,
  content text not null,
  version integer not null,
  created_at text not null,
  updated_at text not null
)

preset_prompt_mappings (
  id text primary key,
  preset_id text not null,
  workflow text not null,
  prompt_block_ids_json text not null,
  negative_block_ids_json text not null,
  created_at text not null,
  updated_at text not null
)

generation_runs (
  id text primary key,
  project_id text,
  workflow text not null,
  provider text not null,
  model text not null,
  template_version_ids_json text not null,
  prompt_block_version_ids_json text not null,
  resolved_prompt text not null,
  resolved_negative_prompt text,
  input_asset_ids_json text not null,
  output_asset_ids_json text not null,
  status text not null,
  error text,
  created_at text not null,
  finished_at text
)
```

### Flow Logic Engine

The app also needs database-driven workflow logic, not just prompt text.

Flow definition:

```json
{
  "id": "music_poster_ai_base_then_overlay",
  "name": "Music Poster: AI Base + Overlay",
  "formatIds": ["music_poster_4x5", "story", "square"],
  "steps": [
    "choose_format",
    "collect_assets",
    "generate_base",
    "select_variant",
    "design_overlays",
    "export"
  ],
  "defaultPromptTemplateId": "base_music_poster",
  "defaultOverlayKitIds": ["classic_regional_music_poster"],
  "requiredAssetRoles": ["hero_or_couple"],
  "optionalAssetRoles": ["logo", "background", "style_reference"]
}
```

Flow logic should decide:

- Which steps are visible.
- Which assets are required.
- Which prompt template is used.
- Which preset categories appear.
- Which export presets appear.
- Which warnings to show.
- Whether user can skip AI generation and use image as-is.

Flow definitions can start as JSON, then move into SQLite:

- `flows`
- `flow_versions`
- `flow_steps`
- `flow_prompt_defaults`
- `flow_preset_defaults`

Upgrade rule:

- Existing projects store the flow version used.
- New projects use the active flow version.
- Admin can publish new flow versions without breaking old projects.

### Background Presets

- Village lane
- Rural fairground
- Forest romance
- Palace night
- Small-town street
- DJ stage
- Monsoon road
- Hill meadow
- Devotional temple glow
- Wedding-stage lights
- Action dust
- Old wall texture
- Market street
- River bank
- Studio portrait backdrop
- YouTube split-screen
- News thumbnail background
- Product promo background
- Festival greeting background

### Pose Presets

- Couple center
- Romantic close-up
- Back-to-back attitude
- Dance hook step
- Heroine foreground
- Hero foreground
- Walking through fair
- Mic stage
- Bike romance
- Dupatta motion
- Rain song
- Festival spin
- Hand reach
- Seated steps
- Split portrait
- Title overlap
- Crowd stage
- Village lane pose
- Royal album stance
- Street swagger
- Dreamy profile
- YouTube shocked face
- Pointing at text
- Product holding pose
- Devotional folded hands
- Singer performance pose
- Director-style hero pose
- Couple looking away
- Over-shoulder poster look
- Wide cinematic walking pose

### Costume/Styling Presets

- Keep original clothes
- Regional casual
- Folk festive
- Royal subtle
- Modern music album
- DJ night
- Devotional simple
- Rain romance
- Rural action
- YouTube creator casual
- Clean business promo
- Product demo

### Overlay Template Presets

Music poster:

- Classic title-bottom poster
- Big center title
- Side artist labels
- Release-date bottom
- Dense credits
- Two-logo top
- Title behind subjects
- Title over lower body
- Split portrait poster

YouTube:

- Face left, text right
- Big text center
- Before/after split
- Arrow callout
- Top bar label
- Reaction thumbnail
- News alert
- Product reveal
- Tutorial steps

Social/promo:

- Event announcement
- Service card
- Price promo
- Festival greeting
- Product launch
- Local business poster
- Quote card
- Menu promo

## Server/API Redesign

Keep:

- Express
- `/api/health`
- `/api/gallery`
- `/generated`
- Gemini/OpenAI service helpers

Add:

- `/api/projects`
- `/api/projects/:id`
- `/api/projects/:id/save`
- `/api/assets`
- `/api/assets/upload`
- `/api/assets/remove-bg`
- `/api/assets/generate`
- `/api/generate-base`
- `/api/generate-title`
- `/api/export`
- `/api/prompts/templates`
- `/api/prompts/templates/:id/versions`
- `/api/prompts/blocks`
- `/api/prompts/resolve`
- `/api/prompts/test`
- `/api/flows`
- `/api/flows/:id/versions`

Storage:

- `data/projects/project-id.json`
- `data/assets/original`
- `data/assets/processed`
- `data/generated`
- `data/exports`
- `data/gallery.json`
- `data/postermaker.sqlite`
- `data/backups/prompts`

Later database option:

- SQLite for project, asset, prompt, flow, and generation metadata.
- Keep files on disk/volume.
- Postgres later if multi-user/team scale needs it.

## Workspace Structure Target

The project should move toward this structure:

```text
poster-maker/
  app/
    main.js
    editor/
      canvas.js
      objects.js
      serialization.js
      selection.js
      export.js
    state/
      projectStore.js
      assetStore.js
      generationStore.js
    ui/
      shell.js
      panels/
      inspector/
      components/
    presets/
      formats.json
      textStyles.json
      overlayKits.json
      backgroundStyles.json
      imageEffects.json
      promptStyles.json
  server/
    index.js
    routes/
      assets.js
      projects.js
      generation.js
      export.js
    services/
      gemini.js
      openai.js
      rembg.js
      promptResolver.js
      flowResolver.js
      storage.js
      database.js
      migrations.js
    db/
      schema.sql
      seeds/
        prompts.json
        flows.json
        presets.json
  services/
    rembg-tool/
      Dockerfile
      app.py
      requirements.txt
  docs/
    CANVA_STYLE_REDESIGN_PLAN.md
```

Migration can be gradual. The first implementation does not need to move every file immediately, but new editor/preset code should be written in small modules instead of expanding one huge `app.js`.

## Preset Data Files

Preset lists should become JSON files so new styles can be added without editing core UI logic.

Required preset files:

- `formats.json`
- `assetRoles.json`
- `backgroundStyles.json`
- `poseStyles.json`
- `costumeStyles.json`
- `textStyles.json`
- `textFinishes.json`
- `imageEffects.json`
- `overlayKits.json`
- `aiAssetTypes.json`
- `promptStyles.json`
- `exportPresets.json`

Each preset should support:

- `id`
- `name`
- `description`
- `category`
- `formatSupport`
- `tags`
- `style`
- `promptFragment`
- `negativePromptFragment`
- `preview`
- `enabled`

This makes the app feel large and customizable without hard-coding every option into one file.

## Implementation Phases

### Phase 0: Planning and Workspace Setup

Deliverables:

- This plan doc.
- Create `docs/` for planning.
- Add implementation checklist after user approval.
- Decide editor engine and migration strategy.
- Create preset data files.
- Create `services/rembg-tool` plan scaffold.
- Decide whether Phase 1 is vanilla modules or Vite/React.
- Add SQLite schema plan and migration runner.
- Seed database-driven prompt templates.
- Seed database-driven flow definitions.

Acceptance:

- Plan is complete enough to implement without rethinking the product every step.
- Prompt and flow logic have an upgrade path before UI rebuild starts.

### Phase 1: New App Shell and Format System

Deliverables:

- New modern shell.
- Format selection.
- Project state model.
- Existing generation routes still work.
- Canvas area uses selected format size.
- Left rail and right inspector layout.
- Bottom variant strip.
- Big creation cards for formats.
- First preset JSON loading path.
- First flow definition loader.
- First prompt resolver dry-run endpoint.

Acceptance:

- User can choose Music Poster, YouTube Thumbnail, Story, Square.
- Canvas changes size and safe zone.
- Existing gallery still loads.
- UI no longer feels like a long settings form.
- Backend can resolve a prompt from DB/config without calling AI.

### Phase 2: Real Canva-Style Editor Engine

Deliverables:

- Fabric.js editor surface.
- Add text/image/logo objects.
- Selection handles.
- Drag, resize, rotate.
- Layer panel.
- Inspector panel.
- Save/load project JSON.

Acceptance:

- User can add multiple editable text/images.
- User can select any object and style it.
- Reloading project restores the design.

### Phase 3: Asset Workspace

Deliverables:

- Asset tray.
- Upload with role.
- Remove background action.
- Use as-is action.
- Add to canvas action.
- Processed asset variants.
- Persistent asset storage.
- rembg status and health checks.

Acceptance:

- User uploads a photo, removes background, adds cutout to canvas.
- User uploads logo, removes background, adds it to top corner.
- If rembg service is offline, user sees a clear unavailable state.

### Phase 4: AI Base Generation Wizard

Deliverables:

- Two-step generation UI.
- Generate base image variants.
- Use selected output as locked background.
- Preserve identity prompts.
- Scene/dress/pose options.
- Database-driven prompt resolver for base generation.
- Generation run audit records.
- Prompt version storage on every output.

Acceptance:

- User uploads hero/couple image.
- Chooses scene and pose.
- Generates variants.
- Picks one and continues to overlay design.
- Admin can update the base prompt without editing code.

### Phase 5: Overlay Presets and Text Style System

Deliverables:

- Text preset library.
- Multi-style controls.
- Poster template overlays.
- YouTube thumbnail overlays.
- Credit strip generator.
- Brand/logo placement presets.

Acceptance:

- User can apply title styles to editable text.
- User can switch a poster overlay layout without regenerating the base image.

### Phase 6: AI Asset Generator

Deliverables:

- Title card variants.
- Badge/sticker variants.
- Ornament/flourish generation.
- Transparent PNG handling.
- Asset generator gallery.

Acceptance:

- User generates 4 title variants.
- Picks one and adds it to canvas.
- Can still move/scale it like any image.

### Phase 7: Export and Project Gallery

Deliverables:

- Export PNG/JPG/WebP.
- Export selected format.
- Save project.
- Duplicate project.
- Project gallery.
- Generated asset gallery.

Acceptance:

- User can reopen old project.
- User can download final poster/thumbnail.
- Generated files remain on VPS volume.

### Phase 8: Production Polish

Deliverables:

- Keyboard shortcuts.
- Undo/redo.
- Autosave.
- Mobile layout.
- Better loading states.
- Error recovery.
- Performance pass.

Acceptance:

- App feels stable enough for repeated real work.

## Build Order Recommendation

Do this order:

1. Keep current app live.
2. Add project/format data model.
3. Replace center canvas with Fabric editor.
4. Build text/image overlay editing.
5. Move current AI generation into Step 1 background generation.
6. Add asset tray and rembg service support.
7. Add overlay preset library.
8. Add AI asset generator variants.
9. Add project save/load/export.

Do not start with rembg or advanced AI. The app becomes useful only after the editable overlay editor exists.

## Risks

- Exact text from AI images is unreliable. Keep important text editable.
- Face/body preservation depends on model behavior and uploaded source quality.
- rembg integration can bloat the Node container if added directly.
- A full editor is larger than the current app; avoid trying to build every feature in one pass.
- Mobile editor needs a separate interaction model; do desktop-first then mobile controls.

## Immediate Next Tasks

1. Confirm this plan direction.
2. Add a `TODO.md` or `docs/IMPLEMENTATION_CHECKLIST.md`.
3. Install editor dependencies.
4. Create a new editor state model.
5. Build the new app shell and format picker.
6. Add the first Fabric canvas with add-text/add-image/export.
7. Reconnect existing AI generation as "Generate base".

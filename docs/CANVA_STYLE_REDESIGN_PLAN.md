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

## rembg Integration Plan

Reality:

- Classroom project has rembg installed in its Python backend container on the same VPS.
- This Node app cannot import rembg directly unless it runs in the same container or calls a service.

Options:

1. Shared rembg HTTP service
   - Create a small `/remove-bg` service from the Classroom rembg pattern.
   - Poster Maker calls `REMBG_URL`.
   - Best long-term option.

2. Call Classroom backend if it exposes a safe endpoint
   - Only if existing API has a reusable background removal route.
   - Must avoid coupling Poster Maker to Classroom app internals.

3. Add Python/rembg into Poster Maker container
   - Simple API shape, heavier Docker image.
   - Model download/build time increases.

4. Keep current chroma-key removal for title cards
   - Best for generated title PNGs.
   - Not enough for arbitrary photos.

Decision:

- Keep chroma removal for title cards.
- Add `REMBG_URL` support for image/photo/object background removal.
- If `REMBG_URL` is missing, show "background removal unavailable" instead of silently pretending.

Server endpoints:

- `POST /api/assets/remove-bg`
- `POST /api/assets/enhance`
- `POST /api/assets/generate`
- `POST /api/generate-base`
- `POST /api/generate-title`

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

## Preset Libraries

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

Storage:

- `data/projects/project-id.json`
- `data/assets/original`
- `data/assets/processed`
- `data/generated`
- `data/exports`
- `data/gallery.json`

Later database option:

- SQLite for project and asset metadata.
- Keep files on disk/volume.

## Implementation Phases

### Phase 0: Planning and Workspace Setup

Deliverables:

- This plan doc.
- Create `docs/` for planning.
- Add implementation checklist after user approval.
- Decide editor engine and migration strategy.

Acceptance:

- Plan is complete enough to implement without rethinking the product every step.

### Phase 1: New App Shell and Format System

Deliverables:

- New modern shell.
- Format selection.
- Project state model.
- Existing generation routes still work.
- Canvas area uses selected format size.

Acceptance:

- User can choose Music Poster, YouTube Thumbnail, Story, Square.
- Canvas changes size and safe zone.
- Existing gallery still loads.

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

Acceptance:

- User uploads a photo, removes background, adds cutout to canvas.
- User uploads logo, removes background, adds it to top corner.

### Phase 4: AI Base Generation Wizard

Deliverables:

- Two-step generation UI.
- Generate base image variants.
- Use selected output as locked background.
- Preserve identity prompts.
- Scene/dress/pose options.

Acceptance:

- User uploads hero/couple image.
- Chooses scene and pose.
- Generates variants.
- Picks one and continues to overlay design.

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


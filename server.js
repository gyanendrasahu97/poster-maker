import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import express from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";
import { GoogleGenAI, Modality } from "@google/genai";
import { PNG } from "pngjs";
import { createAppDatabase } from "./server/services/database.js";
import { createAssetStore } from "./server/services/assets.js";
import { checkRembgHealth, removeBackgroundWithRembg } from "./server/services/rembgClient.js";
import { listFlows, listPromptBlocks, listPromptTemplates, logGenerationRun, resolvePrompt } from "./server/services/promptResolver.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 18 },
});
const generateUpload = upload.fields([
  { name: "hero", maxCount: 1 },
  { name: "background", maxCount: 1 },
  { name: "logoLeft", maxCount: 1 },
  { name: "logoRight", maxCount: 1 },
  { name: "references", maxCount: 16 },
  { name: "mask", maxCount: 1 },
]);

const PORT = Number(process.env.PORT || 5177);
const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "data");
const GENERATED_DIR = join(DATA_DIR, "generated");
const ASSETS_DIR = join(DATA_DIR, "assets");
const GALLERY_FILE = join(DATA_DIR, "gallery.json");
const REMBG_URL = process.env.REMBG_URL || "";
const CLASSROOM_ROOT = process.env.CLASSROOM_ROOT || "C:\\Users\\gyane\\.gemini\\antigravity\\classroom";
const CLASSROOM_BACKEND_ENV = join(CLASSROOM_ROOT, "backend", ".env");
const CLASSROOM_KEY_HELPER = join(process.cwd(), "scripts", "load_classroom_google_key.py");
const CLASSROOM_PYTHON =
  process.env.CLASSROOM_PYTHON ||
  process.env.PYTHON ||
  "C:\\Users\\gyane\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";

let credentialState = {
  classroomEnvLoaded: false,
  classroomSecretChecked: false,
  classroomSecretLoaded: false,
  classroomSecretError: "",
};

loadClassroomEnv();
ensureDataDirs();
const appDb = createAppDatabase(DATA_DIR);
const assetStore = createAssetStore(DATA_DIR, appDb);

app.use(express.json({ limit: "2mb" }));
app.use("/generated", express.static(GENERATED_DIR));
app.use("/assets", express.static(ASSETS_DIR));
app.use(express.static(process.cwd()));

const sizeMap = {
  portrait: "1024x1536",
  square: "1024x1024",
  landscape: "1536x1024",
  story: "1024x1536",
};

const geminiAspectMap = {
  portrait: "2:3",
  square: "1:1",
  landscape: "3:2",
  story: "9:16",
};

const GEMINI_IMAGE_PRIMARY_MODEL = "gemini-3.1-flash-image";
const GEMINI_IMAGE_FALLBACK_MODEL = "gemini-2.5-flash-image";
const GEMINI_IMAGE_PRIMARY_BASE_URL = "https://aiplatform.googleapis.com/";
const GEMINI_IMAGE_FALLBACK_BASE_URL = "https://us-central1-aiplatform.googleapis.com/";

const presetText = {
  genre: {
    romantic: "romantic Indian music video poster, expressive lead couple chemistry, emotional but commercial",
    festival: "folk festival music poster, colorful costumes, celebratory crowd atmosphere, regional pride",
    devotional: "devotional cinematic poster, graceful sacred atmosphere, warm lamps, respectful styling",
    action: "rural action-drama poster, dust, grit, dramatic hero presence, energetic composition",
    palace: "royal palace music poster, candlelight, ornate interiors, intense romantic drama",
  },
  background: {
    village: "Indian village lane, warm dust, hand-painted walls, distant crowd and flags",
    forest: "lush green forest path, soft mist, natural light, cinematic depth",
    fair: "rural fairground, bunting flags, stage lights, festive crowd blur",
    palace: "grand heritage palace interior, lamps, carved pillars, rich depth",
    hillside: "open hill meadow, pastel sky, flowers, dance-song energy",
    city: "small-town street, buses, signboards, monsoon haze, film poster realism",
  },
  pose: {
    couple_center: "lead couple centered, standing close, confident music-album poster pose",
    romantic_closeup: "tight romantic close-up, faces near each other, emotional eye contact, album-cover intimacy",
    back_to_back_attitude: "hero and heroine back-to-back, confident attitude, music video swagger",
    dance_hook: "signature dance hook step, energetic but poster-composed, fabric and hand motion",
    heroine_foreground: "heroine foreground with hero behind, romantic song-poster depth",
    hero_foreground: "hero foreground with heroine behind, low-angle commercial album look",
    walking_fair: "couple walking through fairground lights, candid music-video romance",
    mic_stage: "hero holding microphone on small stage, heroine beside him, concert-poster feeling",
    bike_romance: "couple near bike on rural road/fair street, album-poster travel romance",
    dupatta_motion: "heroine dupatta/fabric motion around pair, dramatic regional song style",
    rain_song: "monsoon/rain-song pose with soft backlight, romantic emotional album look",
    festival_spin: "heroine spin/dance pose with hero smiling, festive choreography energy",
    hand_reach: "hero and heroine reaching hands toward each other, dramatic song-poster emotion",
    seated_steps: "couple seated on steps/bench, relaxed romantic music album composition",
    split_portrait: "split character portrait composition, hero one side heroine other side, title between them",
    title_overlap: "large title overlaps lower bodies, faces above title, classic music poster framing",
    crowd_stage: "leads in front of blurred crowd and stage lights, public performance album poster",
    village_lane: "couple in village lane with cinematic depth, regional love-song pose",
    royal_album: "subtle royal costume polish, still music album not wedding, confident romantic stance",
    street_swagger: "urban small-town street swagger, hero and heroine posed like a music single cover",
    dreamy_profile: "soft profile pose, heroine looking away, hero looking toward camera, dreamy romantic mood",
  },
  palette: {
    gold: "warm gold, saffron, deep maroon, glowing highlights",
    green: "forest green, cream, muted yellow, natural highlights",
    pastel: "sky cyan, rose pink, soft yellow, airy romantic colors",
    earth: "brown earth, smoke gray, old-paper beige, dusty sunlight",
    neon: "teal, magenta, amber, night market contrast",
  },
  typography: {
    hindi_calligraphy: "large ornate Devanagari title space, decorative swashes, music-poster lettering",
    bold_release: "bold release-date block near bottom, readable commercial poster hierarchy",
    minimal: "clean title space with elegant centered composition and fewer text zones",
    dense_credits: "traditional poster layout with top logos, side actor names, bottom credit strip",
  },
  posterStyle: {
    reference_music:
      "match the uploaded reference-poster family: Indian regional music poster, heroic couple, rich cinematic background, huge ornate title, actor labels near subjects, release/date block, dense bottom credit strip, tiny top presenter logos",
    title_heavy:
      "title-first composition: oversized decorative Devanagari song title dominates the lower-middle, with flourishes, bevel/glow, drop shadow, warm gold/cream outline, and actor photos framed around it",
    fairground_song:
      "festival/fairground song poster: colorful bunting flags, warm mela lights, crowd blur, romantic lead pair, bright commercial album-poster polish",
    palace_drama:
      "dramatic palace poster: deep background, golden lamps, rich costume polish, strong contrast, premium romantic-drama look",
    rural_release:
      "rural release poster: dusty warm background, village/fair stage, grounded regional texture, readable title and credits",
  },
  titleStyle: {
    ornate_devanagari:
      "ornate hand-lettered Devanagari title, thick strokes, elegant curls, gold/cream fill, dark maroon shadow, cinematic glow, like regional music poster calligraphy",
    bold_block:
      "bold compact Devanagari/Latin block title, highly readable, stacked words, strong outline and bevel",
    brush_romantic:
      "romantic brush-calligraphy title with sweeping swashes, glossy highlights and soft glow",
    metallic_gold:
      "embossed metallic gold title, black drop shadow, premium film-poster finish",
  },
  layoutPreset: {
    classic_vertical:
      "top: presenter and tiny logo marks; middle: hero and heroine large; side: artist names; lower-middle: huge title; bottom: release date and dense credits",
    title_center:
      "top: presenter; center: huge title over/near leads; bottom: release block and credit strip",
    release_bottom:
      "top: small logos; center: leads; lower: title; bottom: bold release date with credits below",
    no_empty_space:
      "fill the whole poster with a complete designed layout, no blank editor spaces, no placeholder regions",
  },
};

app.get("/api/health", (_req, res) => {
  ensureGoogleKey();
  res.json({
    ok: true,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    googleConfigured: Boolean(process.env.GOOGLE_API_KEY),
    classroomCredentials: {
      envLoaded: credentialState.classroomEnvLoaded,
      secretLoaded: credentialState.classroomSecretLoaded,
      secretChecked: credentialState.classroomSecretChecked,
      secretError: credentialState.classroomSecretError || null,
    },
    defaults: {
      openaiModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      geminiModel: process.env.GOOGLE_IMAGE_MODEL || GEMINI_IMAGE_PRIMARY_MODEL,
      geminiFallbackModel: GEMINI_IMAGE_FALLBACK_MODEL,
    },
    database: {
      configured: true,
      path: appDb.dbPath,
    },
    rembg: {
      configured: Boolean(REMBG_URL),
      url: REMBG_URL ? "configured" : "",
    },
  });
});

app.get("/api/gallery", (_req, res) => {
  res.json({ items: readGallery() });
});

app.get("/api/prompts/templates", (_req, res) => {
  res.json({ items: listPromptTemplates(appDb) });
});

app.get("/api/prompts/templates/:id/active", (req, res) => {
  const template = appDb.get(
    `SELECT id, name, type, status, active_version_id AS activeVersionId, description, updated_at AS updatedAt
     FROM prompt_templates
     WHERE id = ?`,
    [req.params.id],
  );
  if (!template) return res.status(404).json({ error: "Prompt template not found." });
  const version = appDb.get(
    `SELECT id, template_id AS templateId, version, status, model_family AS modelFamily, content,
            variables_json AS variablesJson, required_blocks_json AS requiredBlocksJson,
            change_note AS changeNote, created_by AS createdBy, created_at AS createdAt
     FROM prompt_versions
     WHERE id = ?`,
    [template.activeVersionId],
  );
  if (!version) return res.status(404).json({ error: "Active prompt version missing." });
  res.json({ template, version });
});

app.post("/api/prompts/templates/:id/versions", (req, res) => {
  try {
    const template = appDb.get(
      `SELECT id, name, type, active_version_id AS activeVersionId FROM prompt_templates WHERE id = ?`,
      [req.params.id],
    );
    if (!template) return res.status(404).json({ error: "Prompt template not found." });
    const active = appDb.get(
      `SELECT version, model_family AS modelFamily, variables_json AS variablesJson, required_blocks_json AS requiredBlocksJson
       FROM prompt_versions
       WHERE id = ?`,
      [template.activeVersionId],
    );
    if (!active) return res.status(404).json({ error: "Active prompt version missing." });

    const content = String(req.body.content || "").trim();
    if (!content) return res.status(400).json({ error: "Prompt content is required." });
    if (!content.includes("{{basePrompt}}")) {
      return res.status(400).json({ error: "Prompt wrapper must include {{basePrompt}} so the generated creative prompt is not lost." });
    }
    if (content.length > 60000) return res.status(400).json({ error: "Prompt content is too large." });

    const maxRow = appDb.get(`SELECT MAX(version) AS maxVersion FROM prompt_versions WHERE template_id = ?`, [template.id]);
    const nextVersion = Number(maxRow?.maxVersion || active.version || 0) + 1;
    const id = `${template.id}_v${nextVersion}`;
    const timestamp = new Date().toISOString();
    appDb.run(
      `INSERT INTO prompt_versions
        (id, template_id, version, status, model_family, content, variables_json, required_blocks_json, change_note, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        template.id,
        nextVersion,
        "published",
        active.modelFamily || "image",
        content,
        active.variablesJson,
        active.requiredBlocksJson,
        String(req.body.changeNote || "Prompt edited from production UI").slice(0, 300),
        String(req.body.createdBy || "poster-maker-ui").slice(0, 80),
        timestamp,
      ],
    );
    appDb.run(`UPDATE prompt_templates SET active_version_id = ?, updated_at = ? WHERE id = ?`, [id, timestamp, template.id]);
    res.json({ ok: true, templateId: template.id, activeVersionId: id, version: nextVersion });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Prompt version save failed." });
  }
});

app.get("/api/prompts/blocks", (_req, res) => {
  res.json({ items: listPromptBlocks(appDb) });
});

app.post("/api/prompts/resolve", (req, res) => {
  try {
    const config = parseConfig(req.body.config || req.body);
    const fallbackPrompt =
      config.kind === "title" ? buildTitlePrompt(config) : buildPosterPrompt(config, config.referenceCount || []);
    const resolution = resolvePrompt(appDb, {
      templateId: config.kind === "title" ? "asset_title_card" : "base_music_poster",
      workflow: config.kind === "title" ? "asset_title_card" : "base_music_poster",
      basePrompt: fallbackPrompt,
      customInstruction: config.controls?.customPrompt || config.customPrompt || "No extra user override.",
      outputRule: config.kind === "title" ? "Return one title-card image asset." : "Return one full base image.",
    });
    res.json({ ...resolution });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Prompt resolution failed" });
  }
});

app.post("/api/generate/preview", (req, res) => {
  try {
    const config = parseConfig(req.body.config || req.body);
    const assetReferences = collectAssetReferenceImages(config.assetIds || {});
    const basePrompt = buildPosterPrompt(config, assetReferences);
    const provider = config.provider || "openai";
    const promptResolution = resolvePrompt(appDb, {
      templateId: "base_music_poster",
      workflow: "base_music_poster",
      basePrompt,
      customInstruction: config.controls?.customPrompt || "No extra user override.",
      outputRule: "Return one complete production-ready base image for the selected format.",
      variables: {
        workflowContext: `Format: ${config.size || "portrait"}. Provider: ${provider}. Saved asset references: ${assetReferences.length}.`,
      },
    });
    res.json({
      prompt: promptResolution.prompt,
      negativePrompt: promptResolution.negativePrompt,
      promptMeta: promptResolution.meta,
      referenceCount: assetReferences.length,
      assetReferenceIds: assetReferences.map((reference) => reference.posterAssetId).filter(Boolean),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Prompt preview failed." });
  }
});

app.get("/api/flows", (_req, res) => {
  res.json({ items: listFlows(appDb) });
});

app.get("/api/assets", (_req, res) => {
  res.json({ items: assetStore.list() });
});

const assetUpload = upload.fields([
  { name: "assets", maxCount: 18 },
  { name: "image", maxCount: 1 },
]);

app.post("/api/assets/upload", handleUpload(assetUpload), (req, res) => {
  const files = [...(req.files?.assets || []), ...(req.files?.image || [])];
  const role = req.body.role || "asset";
  const assets = files.map((file) => assetStore.saveOriginal(file, role, req.body.title || file.originalname));
  res.json({ assets });
});

app.get("/api/rembg/health", async (_req, res) => {
  res.json(await checkRembgHealth(REMBG_URL));
});

app.post("/api/assets/remove-bg", handleUpload(upload.single("image")), async (req, res) => {
  try {
    let sourceAsset = null;
    let bytes = null;
    let filename = "";
    let mimeType = "";

    if (req.body.assetId) {
      sourceAsset = assetStore.get(req.body.assetId);
      if (!sourceAsset) return res.status(404).json({ error: "Asset not found." });
      bytes = assetStore.read(sourceAsset);
      filename = sourceAsset.filename;
      mimeType = sourceAsset.mimeType;
    } else if (req.file) {
      sourceAsset = assetStore.saveOriginal(req.file, req.body.role || "asset", req.body.title || req.file.originalname);
      bytes = req.file.buffer;
      filename = req.file.originalname;
      mimeType = req.file.mimetype;
    } else {
      return res.status(400).json({ error: "Upload an image or provide assetId." });
    }

    const output = await removeBackgroundWithRembg({
      rembgUrl: REMBG_URL,
      imageBytes: bytes,
      filename,
      mimeType,
      options: {
        model: req.body.model || "u2net",
        trim: req.body.trim !== "false",
        alphaMatting: req.body.alphaMatting === "true",
      },
    });
    const asset = assetStore.saveProcessed({
      parentAsset: sourceAsset,
      bytes: output,
      role: "cutout",
      title: `${sourceAsset.title || "Asset"} cutout`,
      meta: { provider: "rembg-tool", model: req.body.model || "u2net" },
    });
    res.json({ ok: true, asset });
  } catch (error) {
    const status = Number(error?.status || 500);
    res.status(status).json({ error: error instanceof Error ? error.message : "Background removal failed" });
  }
});

app.post(
  "/api/generate",
  handleUpload(generateUpload),
  async (req, res) => {
    try {
      const config = parseConfig(req.body.config);
      const references = collectGenerationReferences(req.files, config);
      const mask = req.files?.mask?.[0];
      const basePrompt = buildPosterPrompt(config, references);
      const provider = config.provider || "openai";
      const promptResolution = resolvePrompt(appDb, {
        templateId: "base_music_poster",
        workflow: "base_music_poster",
        basePrompt,
        customInstruction: config.controls?.customPrompt || "No extra user override.",
        outputRule: "Return one complete production-ready base image for the selected format.",
        variables: {
          workflowContext: `Format: ${config.size || "portrait"}. Provider: ${provider}. Uploaded references: ${references.length}.`,
        },
      });
      const prompt = promptResolution.prompt;

      if (provider === "gemini") {
        const result = await generateWithGemini({ config, prompt, references });
        const galleryItem = saveGeneratedImage({
          dataUrl: result.imageDataUrl,
          kind: "poster",
          title: config.fields?.headline || "AI poster",
          provider: "gemini",
          model: result.model,
        });
        logGenerationRun(appDb, {
          workflow: "base_music_poster",
          provider: "gemini",
          model: result.model,
          templateVersionIds: [promptResolution.meta.templateVersionId],
          promptBlockVersionIds: promptResolution.meta.promptBlockVersionIds,
          prompt,
          negativePrompt: promptResolution.negativePrompt,
          inputAssetIds: references.map((reference) => reference.posterAssetId).filter(Boolean),
          outputAssetIds: galleryItem ? [galleryItem.id] : [],
          status: "done",
        });
        return res.json({ ...result, galleryItem, prompt, promptMeta: promptResolution.meta, provider: "gemini" });
      }

      const result = await generateWithOpenAI({ config, prompt, references, mask });
      const galleryItem = saveGeneratedImage({
        dataUrl: result.imageDataUrl,
        kind: "poster",
        title: config.fields?.headline || "AI poster",
        provider: "openai",
        model: config.model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      });
      logGenerationRun(appDb, {
        workflow: "base_music_poster",
        provider: "openai",
        model: config.model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        templateVersionIds: [promptResolution.meta.templateVersionId],
        promptBlockVersionIds: promptResolution.meta.promptBlockVersionIds,
        prompt,
        negativePrompt: promptResolution.negativePrompt,
        inputAssetIds: references.map((reference) => reference.posterAssetId).filter(Boolean),
        outputAssetIds: galleryItem ? [galleryItem.id] : [],
        status: "done",
      });
      res.json({ ...result, galleryItem, prompt, promptMeta: promptResolution.meta, provider: "openai" });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Poster generation failed",
      });
    }
  },
);

function handleUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (error) => {
      if (!error) {
        next();
        return;
      }
      if (isClientAbortError(error)) {
        console.warn(`Upload cancelled by client: ${req.method} ${req.originalUrl}`);
        if (!res.headersSent) res.status(499).json({ error: "Upload cancelled before it finished. Please retry." });
        return;
      }
      next(error);
    });
  };
}

function collectUploadedImages(files = {}) {
  const withRole = (role, list = []) =>
    list.map((file, index) => ({
      ...file,
      posterRole: role,
      posterIndex: index + 1,
    }));
  return [
    ...withRole("hero identity/couple source photo", files.hero),
    ...withRole("background scene source image", files.background),
    ...withRole("left logo source image", files.logoLeft),
    ...withRole("right logo source image", files.logoRight),
    ...withRole("style/reference poster image", files.references),
  ];
}

function collectGenerationReferences(files = {}, config = {}) {
  return [...collectUploadedImages(files), ...collectAssetReferenceImages(config.assetIds || {})];
}

function collectAssetReferenceImages(assetIds = {}) {
  const references = [];
  const seen = new Set();
  const addAsset = (id, role) => {
    if (!id || seen.has(id)) return;
    const asset = assetStore.get(id);
    if (!asset) throw new Error(`Selected asset was not found: ${id}`);
    seen.add(id);
    references.push({
      buffer: assetStore.read(asset),
      mimetype: asset.mimeType || "image/png",
      originalname: asset.title || asset.filename || `${id}.png`,
      posterRole: role,
      posterAssetId: asset.id,
      posterSource: "asset-store",
    });
  };

  addAsset(assetIds.hero, "saved hero identity/couple source photo");
  addAsset(assetIds.background, "saved background scene source image");
  addAsset(assetIds.logoLeft, "saved left logo source image");
  addAsset(assetIds.logoRight, "saved right logo source image");
  for (const id of Array.isArray(assetIds.references) ? assetIds.references : []) {
    addAsset(id, "saved style/reference poster image");
  }
  return references;
}

app.post("/api/generate-title", async (req, res) => {
  try {
    const config = parseConfig(req.body.config || req.body);
    const basePrompt = buildTitlePrompt(config);
    const promptResolution = resolvePrompt(appDb, {
      templateId: "asset_title_card",
      workflow: "asset_title_card",
      basePrompt,
      customInstruction: config.customPrompt || "No extra user override.",
      outputRule: "Return one reusable title-card image asset.",
    });
    const prompt = promptResolution.prompt;
    const provider = config.provider || "gemini";
    const titleConfig = {
      provider,
      model: config.model,
      size: "landscape",
      quality: "high",
    };

    if (provider === "openai") {
      const rawResult = await generateWithOpenAI({ config: titleConfig, prompt, references: [], mask: null });
      const result = postProcessTitleResult(rawResult, config);
      const galleryItem = saveGeneratedImage({
        dataUrl: result.imageDataUrl,
        kind: "title",
        title: config.title || "AI title card",
        provider: "openai",
        model: titleConfig.model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      });
      logGenerationRun(appDb, {
        workflow: "asset_title_card",
        provider: "openai",
        model: titleConfig.model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        templateVersionIds: [promptResolution.meta.templateVersionId],
        promptBlockVersionIds: promptResolution.meta.promptBlockVersionIds,
        prompt,
        negativePrompt: promptResolution.negativePrompt,
        outputAssetIds: galleryItem ? [galleryItem.id] : [],
        status: "done",
      });
      return res.json({ ...result, galleryItem, prompt, promptMeta: promptResolution.meta, provider: "openai" });
    }

    const rawResult = await generateWithGemini({ config: titleConfig, prompt, references: [] });
    const result = postProcessTitleResult(rawResult, config);
    const galleryItem = saveGeneratedImage({
      dataUrl: result.imageDataUrl,
      kind: "title",
      title: config.title || "AI title card",
      provider: "gemini",
      model: result.model,
    });
    logGenerationRun(appDb, {
      workflow: "asset_title_card",
      provider: "gemini",
      model: result.model,
      templateVersionIds: [promptResolution.meta.templateVersionId],
      promptBlockVersionIds: promptResolution.meta.promptBlockVersionIds,
      prompt,
      negativePrompt: promptResolution.negativePrompt,
      outputAssetIds: galleryItem ? [galleryItem.id] : [],
      status: "done",
    });
    res.json({ ...result, galleryItem, prompt, promptMeta: promptResolution.meta, provider: "gemini" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Title generation failed",
    });
  }
});

function parseConfig(raw) {
  if (!raw) return {};
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid poster config JSON.");
  }
}

function ensureDataDirs() {
  mkdirSync(GENERATED_DIR, { recursive: true });
  if (!existsSync(GALLERY_FILE)) writeFileSync(GALLERY_FILE, "[]", "utf-8");
}

function readGallery() {
  try {
    const raw = readFileSync(GALLERY_FILE, "utf-8");
    return JSON.parse(raw)
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
      .slice(0, 60);
  } catch {
    return [];
  }
}

function writeGallery(items) {
  writeFileSync(GALLERY_FILE, JSON.stringify(items.slice(0, 60), null, 2), "utf-8");
}

function saveGeneratedImage({ dataUrl, kind, title, provider, model }) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const extension = mimeType.includes("webp") ? "webp" : mimeType.includes("jpeg") ? "jpg" : "png";
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const filename = `${kind}-${id}.${extension}`;
  const bytes = Buffer.from(match[2], "base64");
  writeFileSync(join(GENERATED_DIR, filename), bytes);
  const item = {
    id,
    kind,
    title,
    provider,
    model: model || "",
    mimeType,
    filename,
    url: `/generated/${filename}`,
    downloadUrl: `/generated/${filename}`,
    bytes: bytes.length,
    createdAtMs: Date.now(),
    createdAt: new Date().toISOString(),
  };
  const gallery = readGallery();
  gallery.unshift(item);
  writeGallery(gallery);
  return item;
}

function postProcessTitleResult(result, config) {
  if ((config.removeBg || "chroma") !== "chroma") return result;
  try {
    return {
      ...result,
      imageDataUrl: removeSolidBackground(result.imageDataUrl, config.bgColor || "#00ff00"),
    };
  } catch (error) {
    console.warn("Title background removal failed; returning original image", error);
    return result;
  }
}

function removeSolidBackground(dataUrl, bgColor) {
  const match = String(dataUrl || "").match(/^data:image\/png;base64,(.+)$/);
  if (!match) return dataUrl;
  const png = PNG.sync.read(Buffer.from(match[1], "base64"));
  const key = hexToRgb(bgColor || "#00ff00");
  const visited = new Uint8Array(png.width * png.height);
  const queue = [];
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
    const pos = y * png.width + x;
    if (visited[pos]) return;
    if (!isBackgroundPixel(png, x, y, key)) return;
    visited[pos] = 1;
    queue.push([x, y]);
  };

  for (let x = 0; x < png.width; x += 1) {
    enqueue(x, 0);
    enqueue(x, png.height - 1);
  }
  for (let y = 0; y < png.height; y += 1) {
    enqueue(0, y);
    enqueue(png.width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [x, y] = queue[cursor];
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const pos = y * png.width + x;
      if (visited[pos] || isBackgroundPixel(png, x, y, key)) visited[pos] = 1;
    }
  }

  for (let pos = 0; pos < visited.length; pos += 1) {
    if (!visited[pos]) continue;
    const idx = pos << 2;
    png.data[idx] = 0;
    png.data[idx + 1] = 0;
    png.data[idx + 2] = 0;
    png.data[idx + 3] = 0;
  }

  softenAlphaEdge(png, visited);
  const output = PNG.sync.write(png, { colorType: 6 });
  return `data:image/png;base64,${output.toString("base64")}`;
}

function isBackgroundPixel(png, x, y, key) {
  const idx = (png.width * y + x) << 2;
  const r = png.data[idx];
  const g = png.data[idx + 1];
  const b = png.data[idx + 2];
  const distance = Math.sqrt((r - key.r) ** 2 + (g - key.g) ** 2 + (b - key.b) ** 2);
  const greenDominant = g > 92 && g > r * 1.14 && g > b * 1.14;
  const closeToKey = distance < 190;
  return closeToKey || greenDominant;
}

function softenAlphaEdge(png, removed) {
  const copyAlpha = new Uint8Array(png.width * png.height);
  for (let pos = 0; pos < copyAlpha.length; pos += 1) copyAlpha[pos] = png.data[(pos << 2) + 3];
  for (let y = 1; y < png.height - 1; y += 1) {
    for (let x = 1; x < png.width - 1; x += 1) {
      const pos = y * png.width + x;
      if (removed[pos]) continue;
      const nearRemoved =
        removed[pos - 1] ||
        removed[pos + 1] ||
        removed[pos - png.width] ||
        removed[pos + png.width] ||
        removed[pos - png.width - 1] ||
        removed[pos - png.width + 1] ||
        removed[pos + png.width - 1] ||
        removed[pos + png.width + 1];
      if (nearRemoved) png.data[(pos << 2) + 3] = Math.min(copyAlpha[pos], 230);
    }
  }
}

function hexToRgb(hex) {
  const clean = String(hex || "#00ff00").replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function buildPosterPrompt(config, referenceFiles = []) {
  const referenceCount = Array.isArray(referenceFiles) ? referenceFiles.length : Number(referenceFiles || 0);
  const fields = config.fields || {};
  const controls = config.controls || {};
  const picked = {
    genre: presetText.genre[controls.genre] || controls.genre || "",
    background: presetText.background[controls.background] || controls.background || "",
    pose: presetText.pose[controls.pose] || controls.pose || "",
    palette: presetText.palette[controls.palette] || controls.palette || "",
    typography: presetText.typography[controls.typography] || controls.typography || "",
    posterStyle: presetText.posterStyle[controls.posterStyle] || controls.posterStyle || presetText.posterStyle.reference_music,
    titleStyle: presetText.titleStyle[controls.titleStyle] || controls.titleStyle || presetText.titleStyle.ornate_devanagari,
    layoutPreset: presetText.layoutPreset[controls.layoutPreset] || controls.layoutPreset || presetText.layoutPreset.classic_vertical,
  };
  const language = controls.language || "Hindi / Chhattisgarhi";
  const textPolicy = controls.textPolicy || "baked";
  const custom = controls.customPrompt || "";
  const overrideMode = controls.overrideMode || "append";
  const identityLock = controls.identityLock || "strict";
  const retouch = controls.retouch || "light";
  const identityInstruction = buildIdentityInstruction(identityLock, retouch, referenceCount);
  const uploadInstruction = buildUploadInstruction(referenceFiles);
  const posterTextInstruction =
    textPolicy === "baked"
      ? buildBakedTextInstruction(fields, language)
      : "Do not render final title, credits, names, or logos into the image. Leave tasteful negative space for the app to overlay editable text and uploaded logos.";

  const basePrompt = [
    "Create one complete finished vertical Indian regional music-video poster, ready to publish. This is NOT a background plate and NOT a blank template.",
    "Visual realism requirement: the people must look like real photographed humans from the uploaded source images, not AI-generated characters, not wax/plastic skin, not beauty-filter clones. Preserve natural face asymmetry, skin texture, glasses/jewelry if present, hairline, body size, and relative body composition unless the user explicitly requests wardrobe or pose styling.",
    "The poster must look like the provided reference music posters: professional, dense, commercial, cinematic, and fully designed edge-to-edge.",
    `Poster style preset: ${picked.posterStyle}.`,
    `Core genre: ${picked.genre}.`,
    `Scene/background: ${picked.background}.`,
    `Pose/blocking: ${picked.pose}.`,
    `Color palette: ${picked.palette}.`,
    `Typography hierarchy: ${picked.typography}.`,
    `Title style: ${picked.titleStyle}.`,
    `Layout preset: ${picked.layoutPreset}.`,
    `Language market: ${language}.`,
    uploadInstruction,
    identityInstruction,
    posterTextInstruction,
    "Typography quality requirements: make the main title large, decorative, high contrast, layered with bevel/outline/shadow/glow, and integrated with the characters. Bottom credits should be tiny but visibly arranged like a real poster credit strip. Add plausible small logo marks at top corners, but no real copyrighted logos.",
    "Composition requirements: hero and heroine must be large, central, attractive, and poster-lit; title must not be tiny; release/date must be readable; no empty placeholder zones.",
    "Quality requirements: cinematic lighting, natural realistic faces, natural hands, correct anatomy, sharp poster detail, professional color grade, no watermark, no QR code, no fake signatures, no random unreadable extra text beyond requested poster text, no synthetic AI face look.",
    referenceCount ? "Use uploaded images according to their labels. The hero identity/couple source photo is the primary face/body source, not loose inspiration. Preserve recognizability while making a finished poster." : "",
    controls.negativePrompt ? `Avoid: ${controls.negativePrompt}` : "",
  ].filter(Boolean);

  if (custom && overrideMode === "replace") {
    return [
      "Create one complete finished vertical Indian regional music-video poster, ready to publish.",
      "Visual realism requirement: the people must look like real photographed humans from the uploaded source images, preserving face identity, body size, and natural skin texture. Avoid synthetic AI face, plastic skin, fake actor replacement, and generic model-like beauty.",
      uploadInstruction,
      identityInstruction,
      posterTextInstruction,
      `User override replaces style presets: ${custom}`,
      controls.negativePrompt ? `Avoid: ${controls.negativePrompt}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (custom) basePrompt.push(`User style override, must be obeyed after presets: ${custom}`);
  return basePrompt.join("\n");
}

function buildUploadInstruction(referenceFiles) {
  if (!Array.isArray(referenceFiles) || !referenceFiles.length) {
    return "No image uploads were provided. Create fictional poster characters only.";
  }
  const lines = referenceFiles.map((file, index) => `${index + 1}. ${file.posterRole || "reference image"}: ${file.originalname || "uploaded image"}`);
  return [
    "Uploaded image roles, in exact order:",
    ...lines,
    "Use the hero identity/couple source photo for the real faces, body proportions, skin tone, hairstyle, glasses/jewelry, and relative composition.",
    "Use background images only as scene guidance, logo images only as logo guidance, and style/reference poster images only for poster styling.",
  ].join("\n");
}

function buildBakedTextInstruction(fields, language) {
  const headline = fields.headline || "मोरे दिल के बात";
  const presenter = fields.presenter || "CRUZA MUSIC PRESENTS";
  const subtitle = fields.subtitle || "A soulful regional love song";
  const leftName = fields.leftName || "ARYAN SAHU";
  const rightName = fields.rightName || "KAVYA SEN";
  const release = fields.release || "RELEASING SOON";
  const date = fields.date || "2026";
  const credits =
    fields.credits ||
    "SINGER RAHUL VERMA  |  LYRICS DEV SAHU  |  MUSIC AMAN RAJ  |  DIRECTOR VIKAS NIRMALKAR";
  const footer = fields.footer || "OFFICIAL MUSIC POSTER";

  return [
    "Render all poster text directly inside the generated image as a complete poster design.",
    `Top presenter text: "${presenter}".`,
    `Main title: "${headline}". Make this the biggest, most beautiful title on the poster. Use ${language} poster-style lettering when possible.`,
    `Small subtitle near title: "${subtitle}".`,
    `Left artist label near hero: "${leftName}".`,
    `Right artist label near heroine: "${rightName}".`,
    `Release block: "${release}" and "${date}".`,
    `Bottom credit strip text: "${credits}".`,
    `Footer tag: "${footer}".`,
    "If exact Devanagari text is difficult, prioritize a convincing ornate Devanagari-style title resembling the requested words, but keep Latin names and release/date readable.",
  ].join("\n");
}

function buildTitlePrompt(config) {
  const title = config.title || "SONG TITLE";
  const subtitle = config.subtitle || "";
  const style = config.style || "ornate_gold";
  const fill = config.fill || "#ffe37a";
  const accent = config.accent || "#6a180e";
  const bgColor = config.bgColor || "#00ff00";
  const removeBg = config.removeBg || "chroma";
  const customPrompt = config.customPrompt || "";
  const letterFamily = config.letterFamily || "devanagari_ornate";
  const finish = config.finish || "gold_bevel";
  const outline = config.outline || "thick_shadow";
  const ornament = config.ornament || "rich";
  const shadow = config.shadow || "deep";
  const styleText =
    {
      ornate_gold: "ornate Indian regional music title, premium gold bevel, thick maroon outline, glossy hand-lettered Devanagari/album-calligraphy feel",
      neon_stage: "night stage neon title, cyan and magenta glow, music video single cover typography, electric but readable",
      folk_red: "folk regional poster title, cream fill, bold red outline, hand-painted fairground banner lettering",
      clean_album: "clean modern album title, bold readable lettering, premium minimal music-cover typography, crisp edges",
      metal_film: "metallic film title, silver steel bevel, dark outline, dramatic cinematic title treatment",
      bhojpuri_banner: "Bhojpuri music poster title, loud commercial banner lettering, yellow-gold fill, red/black outline, festival energy",
      chhattisgarhi_folk: "Chhattisgarhi folk music title, warm handmade regional lettering, gold and red accents, decorative curves",
      devotional_glow: "devotional music title, sacred warm glow, saffron-gold lettering, soft halo, respectful ornate style",
      rain_romance: "romantic rain-song title, blue silver shine, wet glossy highlights, soft emotional glow",
      street_album: "street music album title, bold urban regional typography, sticker-like outline, gritty stage energy",
      royal_script: "royal palace romance title, elegant script, embossed gold, jewel highlights, premium ornate curves",
      dj_remix: "DJ remix music title, nightclub glow, sharp chrome lettering, neon edge lights, energetic typography",
    }[style] || style;
  const optionText = {
    letterFamily: {
      devanagari_ornate: "ornate Devanagari title lettering with accurate Hindi/Chhattisgarhi poster feel",
      bhojpuri_loud: "loud Bhojpuri commercial music lettering, thick and festive",
      chhattisgarhi_folk: "Chhattisgarhi folk lettering, handmade regional curves and warm culture",
      latin_album: "Latin album-cover lettering, clean music-single typography",
      brush_script: "romantic brush script with sweeping strokes",
      blockbuster: "large blockbuster film title lettering",
      devotional: "devotional sacred lettering with respectful glow",
    },
    finish: {
      gold_bevel: "gold bevel with glossy highlights",
      chrome: "chrome metallic shine",
      painted: "painted hand-lettered texture",
      neon: "neon tube/glow finish",
      embossed: "embossed raised print finish",
      flat_clean: "flat clean premium vector-like finish",
    },
    outline: {
      thick_shadow: "thick dark outline with strong drop shadow",
      double_outline: "double outline, inner light rim and outer dark rim",
      thin_crisp: "thin crisp outline",
      sticker: "sticker cutout border",
      glow_only: "mostly glow, minimal outline",
    },
    ornament: {
      rich: "rich curls, swashes, ornamental flourishes",
      moderate: "moderate decorative flourishes",
      minimal: "minimal ornamentation",
      floral: "floral decorative elements integrated into letters",
      royal: "royal crown-like flourishes and jewel motifs",
      none: "no extra ornamentation",
    },
    shadow: {
      deep: "deep layered shadow",
      soft: "soft shadow",
      hard: "hard offset shadow",
      glow: "colored glow shadow",
      none: "no shadow",
    },
  };

  return [
    "Generate only a standalone title-card graphic for a music poster.",
    removeBg === "chroma"
      ? `Use a perfectly flat solid background color ${bgColor} only. Do not draw checkerboard transparency. Do not use gradients or texture in the background. The server will remove this solid color after generation.`
      : "Use a clean simple background only if necessary.",
    "No checkerboard pattern. No fake transparency grid. No poster scene, no people, no faces, no photo background, no rectangle card, no mockup.",
    `Main title text: "${title}".`,
    subtitle ? `Small subtitle text below or tucked into the title: "${subtitle}".` : "No extra words unless needed for decoration.",
    `Typography style: ${styleText}.`,
    `Letter family: ${optionText.letterFamily[letterFamily] || letterFamily}.`,
    `Finish: ${optionText.finish[finish] || finish}.`,
    `Outline style: ${optionText.outline[outline] || outline}.`,
    `Ornament level: ${optionText.ornament[ornament] || ornament}.`,
    `Shadow depth: ${optionText.shadow[shadow] || shadow}.`,
    `Preferred fill color: ${fill}. Preferred outline/accent color: ${accent}.`,
    "Make the lettering large, centered, layered, premium, readable, with bevel/outline/shadow/glow/highlight details.",
    customPrompt ? `User custom title direction: ${customPrompt}` : "",
    "Avoid AI artifacts, random unreadable extra letters, watermarks, QR codes, logos, faces, bodies, background scenes, checkerboard grids, and fake transparency patterns.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildIdentityInstruction(identityLock, retouch, referenceCount) {
  if (!referenceCount) {
    return "No source person image was uploaded; create clean fictional poster characters.";
  }
  const lockText = {
    strict:
      "STRICT IDENTITY LOCK: preserve the uploaded hero and heroine faces, facial geometry, skin tone, hairstyle silhouette, hairline, glasses/jewelry if visible, body proportions, relative height, pose, body size, and composition. Do not replace them with new actors. Do not slim, enlarge, age, beautify into a different person, or change facial identity. Keep the result realistic and photo-derived, not AI-generated-looking.",
    balanced:
      "BALANCED IDENTITY LOCK: keep the uploaded hero and heroine clearly recognizable, preserving face structure, natural skin detail, body proportions, pose direction, and relative size while allowing poster lighting and wardrobe styling. Do not turn them into generic AI models.",
    loose:
      "LOOSE IDENTITY LOCK: use the uploaded people as character references but keep their main facial identity and body composition recognizable, with realistic human texture.",
  };
  const retouchText = {
    none: "No facial retouching; only match lighting and poster color grade.",
    light: "Allow only light makeup, cinematic lighting, skin cleanup, and color grading that still preserves facial detail.",
    poster: "Allow commercial poster makeup and wardrobe polish, but preserve exact face identity and body proportions.",
  };
  return `${lockText[identityLock] || lockText.strict} ${retouchText[retouch] || retouchText.light}`;
}

async function generateWithOpenAI({ config, prompt, references, mask }) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing. Add it to .env.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = config.model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const size = sizeMap[config.size] || "1024x1536";
  const quality = config.quality || "high";

  let response;
  if (references.length || mask) {
    const files = await Promise.all(references.map((file) => bufferToFile(file)));
    const params = {
      model,
      image: files,
      prompt,
      size,
      quality,
    };
    if (mask) params.mask = await bufferToFile(mask);
    response = await client.images.edit(params);
  } else {
    response = await client.images.generate({
      model,
      prompt,
      size,
      quality,
    });
  }

  return normalizeOpenAIImageResponse(response);
}

async function bufferToFile(file) {
  return toFile(file.buffer, file.originalname || "reference.png", { type: file.mimetype || "image/png" });
}

async function normalizeOpenAIImageResponse(response) {
  const item = response?.data?.[0];
  if (!item) throw new Error("OpenAI returned no image data.");
  if (item.b64_json) {
    return {
      imageDataUrl: `data:image/png;base64,${item.b64_json}`,
      usage: response.usage || null,
    };
  }
  if (item.url) {
    const fetched = await fetch(item.url);
    const contentType = fetched.headers.get("content-type") || "image/png";
    const bytes = Buffer.from(await fetched.arrayBuffer());
    return {
      imageDataUrl: `data:${contentType};base64,${bytes.toString("base64")}`,
      usage: response.usage || null,
    };
  }
  throw new Error("OpenAI image response did not include base64 or URL output.");
}

async function generateWithGemini({ config, prompt, references }) {
  ensureGoogleKey();
  if (!process.env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is missing. Add it to .env or classroom app secrets.");
  const key = process.env.GOOGLE_API_KEY;
  const vertexai = String(process.env.GOOGLE_GENAI_VERTEX || "").toLowerCase() === "true" || key.startsWith("AQ.");
  const requestedModel = config.model || process.env.GOOGLE_IMAGE_MODEL || "";
  const attempts = requestedModel
    ? [{ model: requestedModel, baseUrl: process.env.GOOGLE_GENAI_BASE_URL || GEMINI_IMAGE_PRIMARY_BASE_URL }]
    : [
        { model: GEMINI_IMAGE_PRIMARY_MODEL, baseUrl: GEMINI_IMAGE_PRIMARY_BASE_URL },
        { model: GEMINI_IMAGE_FALLBACK_MODEL, baseUrl: GEMINI_IMAGE_FALLBACK_BASE_URL },
      ];
  const parts = [{ text: prompt }];
  references.forEach((file, index) => {
    parts.push({
      text: `Uploaded image ${index + 1}: ${file.posterRole || "reference image"} (${file.originalname || "uploaded image"}).`,
    });
    parts.push({
      inlineData: {
        data: file.buffer.toString("base64"),
        mimeType: file.mimetype || "image/jpeg",
      },
    });
  });

  let lastError = null;
  for (const attempt of attempts) {
    try {
      const client = new GoogleGenAI({
        apiKey: key,
        vertexai,
        httpOptions: { baseUrl: attempt.baseUrl },
      });
      const response = await client.models.generateContent({
        model: attempt.model,
        contents: [{ role: "user", parts }],
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
          imageConfig: { aspectRatio: geminiAspectMap[config.size] || "2:3" },
        },
      });

      const partsOut = response?.candidates?.[0]?.content?.parts || [];
      for (const part of partsOut) {
        if (part.inlineData?.data) {
          return {
            imageDataUrl: `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`,
            usage: response.usageMetadata || null,
            model: attempt.model,
            baseUrl: attempt.baseUrl,
          };
        }
      }
      throw new Error("Gemini returned no inline image.");
    } catch (error) {
      lastError = error;
      console.warn(`Gemini image attempt failed: ${attempt.model} via ${attempt.baseUrl}`, error);
    }
  }
  throw lastError || new Error("Gemini image generation failed.");
}

function loadClassroomEnv() {
  if (!existsSync(CLASSROOM_BACKEND_ENV)) return;
  const raw = readFileSync(CLASSROOM_BACKEND_ENV, "utf-8");
  let loadedAny = false;
  for (const lineRaw of raw.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    if (!key) continue;
    const cleanKey = key.trim();
    if (process.env[cleanKey]) continue;
    process.env[cleanKey] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    loadedAny = true;
  }
  credentialState.classroomEnvLoaded = loadedAny;
}

function ensureGoogleKey() {
  if (process.env.GOOGLE_API_KEY || credentialState.classroomSecretChecked) return;
  credentialState.classroomSecretChecked = true;
  const keyFromSupabase = loadGoogleKeyFromClassroomSupabaseSync();
  if (keyFromSupabase) {
    process.env.GOOGLE_API_KEY = keyFromSupabase;
    credentialState.classroomSecretLoaded = true;
    credentialState.classroomSecretError = "";
    return;
  }
  if (!existsSync(CLASSROOM_KEY_HELPER)) {
    credentialState.classroomSecretError = "classroom helper missing";
    return;
  }
  const result = spawnSync(CLASSROOM_PYTHON, [CLASSROOM_KEY_HELPER], {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: { ...process.env, CLASSROOM_ROOT },
    timeout: 20000,
  });
  const key = (result.stdout || "").trim();
  if (result.status === 0 && key) {
    process.env.GOOGLE_API_KEY = key;
    credentialState.classroomSecretLoaded = true;
    credentialState.classroomSecretError = "";
    return;
  }
  credentialState.classroomSecretError = (result.stderr || result.error?.message || "classroom secret lookup failed")
    .trim()
    .slice(0, 220);
}

function loadGoogleKeyFromClassroomSupabaseSync() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const encryptionKey = process.env.SECRETS_ENCRYPTION_KEY;
  if (!url || !serviceKey || !encryptionKey) return "";

  const script = `
const { createDecipheriv, createHmac, timingSafeEqual } = require("node:crypto");
function b64url(input) {
  return Buffer.from(String(input).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function decryptFernetJson(token, key) {
  if (!token) return {};
  if (typeof token === "object") return token;
  const raw = b64url(token);
  const secret = b64url(key);
  const signingKey = secret.subarray(0, 16);
  const encryptionKey = secret.subarray(16);
  const signed = raw.subarray(0, raw.length - 32);
  const mac = raw.subarray(raw.length - 32);
  const expected = createHmac("sha256", signingKey).update(signed).digest();
  if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) throw new Error("Bad Fernet signature");
  const iv = raw.subarray(9, 25);
  const ciphertext = raw.subarray(25, raw.length - 32);
  const decipher = createDecipheriv("aes-128-cbc", encryptionKey, iv);
  return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"));
}
(async () => {
  const endpoint = process.env.SUPABASE_URL.replace(/\\/$/, "") + "/rest/v1/institutes?select=id,name,secrets";
  const response = await fetch(endpoint, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY,
      authorization: "Bearer " + process.env.SUPABASE_SERVICE_KEY,
    },
  });
  if (!response.ok) throw new Error("Supabase " + response.status);
  const rows = await response.json();
  const candidates = [];
  for (const row of rows) {
    try {
      const secrets = decryptFernetJson(row.secrets, process.env.SECRETS_ENCRYPTION_KEY);
      const key = String(secrets.GOOGLE_API_KEY || "").trim();
      if (key && !key.includes("YOUR_") && !key.toLowerCase().startsWith("placeholder")) candidates.push(key);
    } catch {}
  }
  const key = candidates.find((item) => item.startsWith("AQ.")) || candidates[0] || "";
  if (key) process.stdout.write(key);
})().catch((error) => {
  process.stderr.write(error.message);
  process.exit(1);
});
`;

  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: process.cwd(),
    encoding: "utf-8",
    env: process.env,
    timeout: 20000,
  });
  const key = (result.stdout || "").trim();
  if (result.status === 0 && key) return key;
  credentialState.classroomSecretError = (result.stderr || result.error?.message || "classroom Supabase secret lookup failed")
    .trim()
    .slice(0, 220);
  return "";
}

function isClientAbortError(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "ECONNRESET" || error?.code === "ABORT_ERR" || message.includes("request aborted");
}

app.use((error, req, res, _next) => {
  if (isClientAbortError(error)) {
    console.warn(`Request cancelled by client: ${req.method} ${req.originalUrl}`);
    if (!res.headersSent) res.status(499).json({ error: "Request cancelled before upload finished. Please retry." });
    return;
  }

  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "One uploaded image is too large. Use images under 50 MB each."
        : `Upload failed: ${error.message}`;
    res.status(status).json({ error: message });
    return;
  }

  console.error(error);
  res.status(500).json({ error: error instanceof Error ? error.message : "Server error" });
});

app.listen(PORT, () => {
  console.log(`AI Poster Maker running at http://localhost:${PORT}`);
});

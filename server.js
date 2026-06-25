import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import express from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";
import { GoogleGenAI, Modality } from "@google/genai";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 18 },
});

const PORT = Number(process.env.PORT || 5177);
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

app.use(express.json({ limit: "2mb" }));
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
  });
});

app.post(
  "/api/generate",
  upload.fields([
    { name: "references", maxCount: 16 },
    { name: "mask", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const config = parseConfig(req.body.config);
      const references = req.files?.references || [];
      const mask = req.files?.mask?.[0];
      const prompt = buildPosterPrompt(config, references.length);
      const provider = config.provider || "openai";

      if (provider === "gemini") {
        const result = await generateWithGemini({ config, prompt, references });
        return res.json({ ...result, prompt, provider: "gemini" });
      }

      const result = await generateWithOpenAI({ config, prompt, references, mask });
      res.json({ ...result, prompt, provider: "openai" });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Poster generation failed",
      });
    }
  },
);

function parseConfig(raw) {
  if (!raw) return {};
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid poster config JSON.");
  }
}

function buildPosterPrompt(config, referenceCount) {
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
    identityInstruction,
    posterTextInstruction,
    "Typography quality requirements: make the main title large, decorative, high contrast, layered with bevel/outline/shadow/glow, and integrated with the characters. Bottom credits should be tiny but visibly arranged like a real poster credit strip. Add plausible small logo marks at top corners, but no real copyrighted logos.",
    "Composition requirements: hero and heroine must be large, central, attractive, and poster-lit; title must not be tiny; release/date must be readable; no empty placeholder zones.",
    "Quality requirements: cinematic lighting, natural realistic faces, natural hands, correct anatomy, sharp poster detail, professional color grade, no watermark, no QR code, no fake signatures, no random unreadable extra text beyond requested poster text, no synthetic AI face look.",
    referenceCount ? "The uploaded person photos are identity/source images, not loose inspiration. Preserve recognizability while making a finished poster." : "",
    controls.negativePrompt ? `Avoid: ${controls.negativePrompt}` : "",
  ].filter(Boolean);

  if (custom && overrideMode === "replace") {
    return [
      "Create one complete finished vertical Indian regional music-video poster, ready to publish.",
      "Visual realism requirement: the people must look like real photographed humans from the uploaded source images, preserving face identity, body size, and natural skin texture. Avoid synthetic AI face, plastic skin, fake actor replacement, and generic model-like beauty.",
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
  const parts = references.map((file) => ({
    inlineData: {
      data: file.buffer.toString("base64"),
      mimeType: file.mimetype || "image/jpeg",
    },
  }));
  parts.push({ text: prompt });

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

app.listen(PORT, () => {
  console.log(`AI Poster Maker running at http://localhost:${PORT}`);
});

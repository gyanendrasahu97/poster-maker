const canvas = document.getElementById("posterCanvas");
const ctx = canvas.getContext("2d");
const titleCanvas = document.getElementById("titleCanvas");
const titleCtx = titleCanvas?.getContext("2d");
const galleryDbName = "poster-maker-gallery";
const galleryStoreName = "items";

const sizes = {
  portrait: [1080, 1350],
  story: [1080, 1920],
  square: [1080, 1080],
};

const textDefaults = {
  presenter: "MS MUSIC PRESENTS",
  headline: "मोरे सुनरी",
  subtitle: "A cinematic love song",
  leftName: "MANISH STAR",
  rightName: "KALPITA SINGH",
  release: "RELEASING ON",
  date: "21 JUNE 2026",
  credits: "LYRICS SANJAY KUMAR  |  MUSIC VIVEK SENA  |  SINGER MANISH SHARMA  |  DIRECTOR DEEPAK HALDAR",
  footer: "FULL VIDEO SONG  |  OFFICIAL POSTER",
};

const templates = [
  {
    id: "festival",
    name: "Festival Gold",
    note: "lanterns, warm title, crowd glow",
    gradient: ["#2b1723", "#9a3c35", "#f0b84c"],
    accent: "#f4d36f",
    title: "#ffe78c",
    mood: "warm",
  },
  {
    id: "forest",
    name: "Forest Release",
    note: "green cinema, date block, calm haze",
    gradient: ["#0b1a16", "#244334", "#e7c783"],
    accent: "#d9f0bd",
    title: "#fff2c7",
    mood: "leaf",
  },
  {
    id: "rural",
    name: "Rural Dust",
    note: "earth, smoke, dramatic center title",
    gradient: ["#211714", "#8c6542", "#d7b36c"],
    accent: "#f3c55f",
    title: "#fff0ba",
    mood: "dust",
  },
  {
    id: "romance",
    name: "Romance Sky",
    note: "pastel horizon, dancing couple energy",
    gradient: ["#65b8d8", "#e3d777", "#814a76"],
    accent: "#f6e47b",
    title: "#8130a1",
    mood: "sky",
  },
  {
    id: "palace",
    name: "Palace Drama",
    note: "deep palace, candle-lit gold",
    gradient: ["#15111a", "#463024", "#b37a38"],
    accent: "#e6bb63",
    title: "#f6d77d",
    mood: "palace",
  },
  {
    id: "wedding",
    name: "Wedding Stage",
    note: "folk stage, bright fabric, poster fair",
    gradient: ["#0b9eb0", "#f4d35e", "#c23d45"],
    accent: "#ffe15f",
    title: "#4b2418",
    mood: "fair",
  },
];

const presetOptions = {
  genre: ["romantic", "festival", "devotional", "action", "palace"],
  background: ["village", "forest", "fair", "palace", "hillside", "city"],
  pose: [
    "couple_center",
    "romantic_closeup",
    "back_to_back_attitude",
    "dance_hook",
    "heroine_foreground",
    "hero_foreground",
    "walking_fair",
    "mic_stage",
    "bike_romance",
    "dupatta_motion",
    "rain_song",
    "festival_spin",
    "hand_reach",
    "seated_steps",
    "split_portrait",
    "title_overlap",
    "crowd_stage",
    "village_lane",
    "royal_album",
    "street_swagger",
    "dreamy_profile",
  ],
  palette: ["gold", "green", "pastel", "earth", "neon"],
  typography: ["hindi_calligraphy", "bold_release", "minimal", "dense_credits"],
  posterStyle: ["reference_music", "title_heavy", "fairground_song", "palace_drama", "rural_release"],
  titleStyle: ["ornate_devanagari", "bold_block", "brush_romantic", "metallic_gold"],
  layoutPreset: ["classic_vertical", "title_center", "release_bottom", "no_empty_space"],
};

let state = {
  templateId: "festival",
  size: "portrait",
  editorMode: "ai",
  grain: 13,
  vignette: 45,
  glow: 24,
  aiOnly: true,
  generatedPoster: null,
  generation: {
    active: false,
    progress: 0,
    stage: "",
    timer: null,
  },
  production: {
    assets: [],
    promptTemplates: [],
    flows: [],
    rembg: { ok: false, configured: false },
    activePromptVersion: null,
  },
  gallery: [],
  references: [],
  uploadFiles: {
    hero: null,
    background: null,
    logoLeft: null,
    logoRight: null,
  },
  selectedAssetIds: {
    hero: null,
    background: null,
    logoLeft: null,
    logoRight: null,
    references: [],
  },
  uploadNames: {
    hero: "",
    background: "",
    logoLeft: "",
    logoRight: "",
    references: [],
  },
  ai: {
    provider: "openai",
    model: "",
    textPolicy: "baked",
    identityLock: "strict",
    retouch: "light",
    genre: "romantic",
    background: "fair",
    pose: "couple_center",
    palette: "gold",
    typography: "dense_credits",
    posterStyle: "reference_music",
    titleStyle: "ornate_devanagari",
    layoutPreset: "classic_vertical",
    overrideMode: "append",
    language: "Hindi / Chhattisgarhi",
    customPrompt: "",
    negativePrompt: "watermark, unreadable random text, distorted hands, duplicate faces, fake logo, QR code, AI-generated face, plastic skin, waxy skin, changed identity, changed body size",
    lastPrompt: "",
  },
  titleCard: {
    text: textDefaults.headline,
    sub: textDefaults.subtitle,
    style: "ornate_gold",
    fill: "#ffe37a",
    accent: "#6a180e",
    prompt: "",
    removeBg: "chroma",
    bgColor: "#00ff00",
    letterFamily: "devanagari_ornate",
    finish: "gold_bevel",
    outline: "thick_shadow",
    ornament: "rich",
    shadow: "deep",
    aiImage: null,
    lastPrompt: "",
  },
  images: {
    hero: null,
    background: null,
    logoLeft: null,
    logoRight: null,
  },
  activeLayer: "headline",
  layers: {
    logoLeft: { label: "Left logo", type: "image", x: 74, y: 58, w: 120, h: 70, visible: true, opacity: 1 },
    logoRight: { label: "Right logo", type: "image", x: 884, y: 54, w: 128, h: 74, visible: true, opacity: 1 },
    presenter: { label: "Presenter", type: "text", text: textDefaults.presenter, x: 540, y: 92, size: 32, color: "#fff1c6", align: "center", width: 720, visible: true, opacity: 1, weight: "800", font: "Arial" },
    headline: { label: "Main title", type: "text", text: textDefaults.headline, x: 540, y: 770, size: 136, color: "#ffe78c", align: "center", width: 900, visible: true, opacity: 1, weight: "900", font: "Nirmala UI" },
    subtitle: { label: "Subtitle", type: "text", text: textDefaults.subtitle, x: 540, y: 902, size: 34, color: "#ffffff", align: "center", width: 720, visible: true, opacity: 0.9, weight: "700", font: "Georgia" },
    leftName: { label: "Left artist", type: "text", text: textDefaults.leftName, x: 150, y: 460, size: 34, color: "#fff4cc", align: "left", width: 260, visible: true, opacity: 1, weight: "800", font: "Arial" },
    rightName: { label: "Right artist", type: "text", text: textDefaults.rightName, x: 930, y: 460, size: 34, color: "#fff4cc", align: "right", width: 260, visible: true, opacity: 1, weight: "800", font: "Arial" },
    release: { label: "Release label", type: "text", text: textDefaults.release, x: 540, y: 1036, size: 30, color: "#ffffff", align: "center", width: 640, visible: true, opacity: 1, weight: "800", font: "Arial" },
    date: { label: "Date", type: "text", text: textDefaults.date, x: 540, y: 1090, size: 58, color: "#fff06f", align: "center", width: 780, visible: true, opacity: 1, weight: "900", font: "Arial Black" },
    credits: { label: "Credits", type: "text", text: textDefaults.credits, x: 540, y: 1214, size: 22, color: "#ffffff", align: "center", width: 940, visible: true, opacity: 0.92, weight: "700", font: "Arial" },
    footer: { label: "Footer", type: "text", text: textDefaults.footer, x: 540, y: 1280, size: 24, color: "#f5df9e", align: "center", width: 960, visible: true, opacity: 1, weight: "800", font: "Arial" },
    hero: { label: "Hero image", type: "image", x: 215, y: 260, w: 650, h: 650, visible: true, opacity: 1 },
  },
};

const layerOrder = ["logoLeft", "logoRight", "hero", "presenter", "leftName", "rightName", "headline", "subtitle", "release", "date", "credits", "footer"];
const quickTextIds = ["presenter", "headline", "subtitle", "leftName", "rightName", "release", "date", "credits", "footer"];

let drag = null;

function activeTemplate() {
  return templates.find((template) => template.id === state.templateId) || templates[0];
}

function scaleY(baseY) {
  const [baseW, baseH] = sizes.portrait;
  return (baseY / baseH) * canvas.height;
}

function drawBackground(template) {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  template.gradient.forEach((color, index) => gradient.addColorStop(index / (template.gradient.length - 1), color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.images.background) {
    drawCoverImage(state.images.background, 0, 0, canvas.width, canvas.height, 0.88);
  }

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  if (template.mood === "sky") drawSkyMarks();
  if (template.mood === "leaf") drawLeaves();
  if (template.mood === "dust") drawDust();
  if (template.mood === "palace") drawCandles();
  if (template.mood === "fair") drawFlags();
  if (template.mood === "warm") drawLanterns();
  ctx.restore();

  const floor = ctx.createLinearGradient(0, canvas.height * 0.48, 0, canvas.height);
  floor.addColorStop(0, "rgba(0,0,0,0)");
  floor.addColorStop(0.68, "rgba(0,0,0,0.54)");
  floor.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCoverImage(img, x, y, w, h, opacity = 1) {
  const ratio = Math.max(w / img.width, h / img.height);
  const nw = img.width * ratio;
  const nh = img.height * ratio;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
  ctx.restore();
}

function drawContainImage(img, x, y, w, h, opacity = 1) {
  const ratio = Math.min(w / img.width, h / img.height);
  const nw = img.width * ratio;
  const nh = img.height * ratio;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
  ctx.restore();
}

function drawContainImageOn(targetCtx, img, x, y, w, h, opacity = 1) {
  const ratio = Math.min(w / img.width, h / img.height);
  const nw = img.width * ratio;
  const nh = img.height * ratio;
  targetCtx.save();
  targetCtx.globalAlpha = opacity;
  targetCtx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
  targetCtx.restore();
}

function drawLayer(id) {
  const layer = state.layers[id];
  if (!layer || !layer.visible) return;
  if (layer.type === "text") drawTextLayer(id, layer);
  if (layer.type === "image") drawImageLayer(id, layer);
}

function drawTextLayer(id, layer) {
  const font = `${layer.weight || "700"} ${layer.size}px "${layer.font || "Arial"}", "Nirmala UI", sans-serif`;
  ctx.save();
  ctx.globalAlpha = layer.opacity;
  ctx.font = font;
  ctx.textAlign = layer.align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = layer.color;

  if (id === "headline") {
    ctx.shadowColor = layer.color;
    ctx.shadowBlur = state.glow;
    ctx.lineWidth = Math.max(4, layer.size * 0.06);
    ctx.strokeStyle = "rgba(26, 14, 8, 0.82)";
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 8;
  }

  const lines = wrapText(layer.text, layer.width, font);
  const lineHeight = layer.size * (id === "headline" ? 0.95 : 1.18);
  const start = layer.y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    const y = start + index * lineHeight;
    if (id === "headline") ctx.strokeText(line, layer.x, y);
    ctx.fillText(line, layer.x, y);
  });
  ctx.restore();
}

function wrapText(text, maxWidth, font) {
  ctx.save();
  ctx.font = font;
  const manual = String(text || "").split("\n");
  const lines = [];
  manual.forEach((part) => {
    const words = part.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      return;
    }
    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    lines.push(line);
  });
  ctx.restore();
  return lines;
}

function drawImageLayer(id, layer) {
  const image = state.images[id];
  ctx.save();
  ctx.globalAlpha = layer.opacity;
  if (image) {
    if (id === "hero") {
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 30;
      drawContainImage(image, layer.x, layer.y, layer.w, layer.h, layer.opacity);
    } else {
      drawContainImage(image, layer.x, layer.y, layer.w, layer.h, layer.opacity);
    }
  } else {
    drawPlaceholder(layer, id);
  }
  ctx.restore();
}

function drawPlaceholder(layer, id) {
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.setLineDash([12, 12]);
  ctx.strokeRect(layer.x, layer.y, layer.w, layer.h);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "700 22px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(id === "hero" ? "Upload hero image" : "Logo", layer.x + layer.w / 2, layer.y + layer.h / 2);
  ctx.restore();
}

function drawFinish() {
  const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.42, canvas.width * 0.18, canvas.width / 2, canvas.height / 2, canvas.width * 0.78);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, `rgba(0,0,0,${state.vignette / 100})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.grain > 0) {
    const density = Math.floor((canvas.width * canvas.height * state.grain) / 70000);
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < density; i += 1) {
      ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }
    ctx.restore();
  }
}

function drawLanterns() {
  for (let i = 0; i < 22; i += 1) {
    const x = (i * 157) % canvas.width;
    const y = 160 + ((i * 83) % 470);
    ctx.fillStyle = "rgba(255,189,73,0.24)";
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 36, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLeaves() {
  for (let i = 0; i < 46; i += 1) {
    ctx.fillStyle = "rgba(180,225,155,0.15)";
    ctx.beginPath();
    ctx.ellipse((i * 91) % canvas.width, (i * 139) % canvas.height, 13, 34, i, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDust() {
  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle = "rgba(250,221,170,0.11)";
    ctx.beginPath();
    ctx.arc((i * 47) % canvas.width, 180 + ((i * 67) % 760), 2 + (i % 7), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSkyMarks() {
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 9; i += 1) {
    const y = 150 + i * 76;
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.bezierCurveTo(320, y - 70, 690, y + 80, 980, y - 20);
    ctx.stroke();
  }
}

function drawCandles() {
  for (let i = 0; i < 18; i += 1) {
    const x = 40 + ((i * 112) % (canvas.width - 80));
    const y = canvas.height * 0.45 + ((i * 55) % 440);
    ctx.fillStyle = "rgba(255,198,85,0.33)";
    ctx.beginPath();
    ctx.ellipse(x, y, 14, 34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFlags() {
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 4;
  for (let row = 0; row < 3; row += 1) {
    const y = 120 + row * 110;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(canvas.width / 2, y + 55, canvas.width, y);
    ctx.stroke();
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = i % 2 ? "rgba(255,225,95,0.42)" : "rgba(194,61,69,0.42)";
      ctx.beginPath();
      const x = i * (canvas.width / 15);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 24, y + 42);
      ctx.lineTo(x + 48, y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function render() {
  if (state.aiOnly) {
    if (state.generatedPoster) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCoverImage(state.generatedPoster, 0, 0, canvas.width, canvas.height, 1);
      drawFinish();
    } else {
      drawAiStartScreen();
    }
    if (state.generation.active) drawGenerationOverlay();
    renderGallery();
    return;
  }
  const template = activeTemplate();
  drawBackground(template);
  layerOrder.forEach(drawLayer);
  drawFinish();
  syncLayerButtons();
}

function drawAiStartScreen() {
  const template = activeTemplate();
  drawBackground(template);
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff6de";
  ctx.font = "900 54px Arial";
  ctx.fillText("AI poster will appear here", canvas.width / 2, canvas.height * 0.43);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "700 28px Arial";
  const refs = state.references.length;
  const hero = state.uploadNames.hero ? "Hero photo ready" : "Upload hero/couple photo first";
  ctx.fillText(`${hero} · ${refs} style ref${refs === 1 ? "" : "s"}`, canvas.width / 2, canvas.height * 0.5);
  ctx.fillStyle = "#38d8b5";
  ctx.font = "900 32px Arial";
  ctx.fillText("Press Generate AI poster", canvas.width / 2, canvas.height * 0.57);
  ctx.restore();
}

function drawGenerationOverlay() {
  const progress = Math.max(0, Math.min(100, Math.round(state.generation.progress || 0)));
  const stage = state.generation.stage || "Generating poster";
  const panelW = Math.min(canvas.width * 0.76, 760);
  const panelH = 210;
  const x = (canvas.width - panelW) / 2;
  const y = canvas.height * 0.43 - panelH / 2;

  ctx.save();
  ctx.fillStyle = "rgba(3, 5, 8, 0.58)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(13, 17, 24, 0.92)";
  roundRect(ctx, x, y, panelW, panelH, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(76, 216, 181, 0.42)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff6de";
  ctx.font = "900 42px Arial";
  ctx.fillText("Generating poster", canvas.width / 2, y + 58);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "700 24px Arial";
  ctx.fillText(stage, canvas.width / 2, y + 100);

  const barX = x + 56;
  const barY = y + 140;
  const barW = panelW - 112;
  const barH = 18;
  ctx.fillStyle = "rgba(255,255,255,0.11)";
  roundRect(ctx, barX, barY, barW, barH, 999);
  ctx.fill();
  const fillW = Math.max(12, (barW * progress) / 100);
  const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  gradient.addColorStop(0, "#38d8b5");
  gradient.addColorStop(0.6, "#f4b84f");
  gradient.addColorStop(1, "#ff6b7a");
  ctx.fillStyle = gradient;
  roundRect(ctx, barX, barY, fillW, barH, 999);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "800 22px Arial";
  ctx.fillText(`${progress}%`, canvas.width / 2, y + 178);
  ctx.restore();
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function applyTemplate(id) {
  state.templateId = id;
  const template = activeTemplate();
  state.layers.headline.color = template.title;
  state.layers.date.color = template.accent;
  state.layers.footer.color = template.accent;
  if (id === "forest") state.layers.headline.y = scaleY(235);
  if (id === "romance") state.layers.headline.y = scaleY(250);
  if (["festival", "rural", "palace", "wedding"].includes(id)) state.layers.headline.y = scaleY(770);
  renderControls();
  render();
}

function resetTexts() {
  Object.entries(textDefaults).forEach(([id, value]) => {
    state.layers[id].text = value;
  });
  renderControls();
  render();
}

function randomizePoster() {
  const index = Math.floor(Math.random() * templates.length);
  applyTemplate(templates[index].id);
  const dateOptions = ["COMING SOON", "08 FEB 2026", "30TH MAY", "21 JUNE 2026", "OUT NOW"];
  state.layers.date.text = dateOptions[Math.floor(Math.random() * dateOptions.length)];
  state.layers.headline.size = 116 + Math.floor(Math.random() * 38);
  renderControls();
  render();
}

function clearImages() {
  Object.keys(state.images).forEach((key) => {
    state.images[key] = null;
  });
  state.references = [];
  state.uploadFiles = { hero: null, background: null, logoLeft: null, logoRight: null };
  state.selectedAssetIds = { hero: null, background: null, logoLeft: null, logoRight: null, references: [] };
  state.uploadNames = { hero: "", background: "", logoLeft: "", logoRight: "", references: [] };
  ["heroUpload", "backgroundUpload", "logoLeftUpload", "logoRightUpload", "referenceUpload"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });
  updateAssetSummary();
  render();
}

function renderControls() {
  renderAiControls();
  renderTemplates();
  renderQuickFields();
  renderLayerList();
  renderLayerEditor();
  renderTitleCardControls();
  renderTitleCard();
  updateAssetSummary();
  syncEditorModeUi();
  document.querySelectorAll("[data-size]").forEach((button) => button.classList.toggle("active", button.dataset.size === state.size));
}

function setEditorMode(mode, shouldScroll = true) {
  state.editorMode = ["ai", "overlay", "title", "gallery"].includes(mode) ? mode : "ai";
  syncEditorModeUi();
  if (state.editorMode === "overlay") state.aiOnly = false;
  if (state.editorMode === "ai") state.aiOnly = true;
  render();
  if (!shouldScroll) return;
  const target =
    state.editorMode === "title"
      ? document.querySelector(".title-card-section")
      : state.editorMode === "gallery"
        ? document.querySelector(".gallery-section")
        : state.editorMode === "overlay"
          ? document.querySelector(".layer-section")
          : document.querySelector(".stage-wrap");
  const block = ["title", "gallery"].includes(state.editorMode) ? "start" : "nearest";
  target?.scrollIntoView({ block, behavior: "smooth" });
}

function syncEditorModeUi() {
  document.body.classList.toggle("overlay-mode", state.editorMode === "overlay");
  document.body.classList.toggle("title-mode", state.editorMode === "title");
  document.body.classList.toggle("gallery-mode", state.editorMode === "gallery");
  document.querySelectorAll("[data-editor-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.editorMode === state.editorMode);
  });
}

function renderAiControls() {
  fillSelect("genreSelect", presetOptions.genre, state.ai.genre);
  fillSelect("backgroundSelect", presetOptions.background, state.ai.background);
  fillSelect("poseSelect", presetOptions.pose, state.ai.pose);
  fillSelect("paletteSelect", presetOptions.palette, state.ai.palette);
  fillSelect("typographySelect", presetOptions.typography, state.ai.typography);
  fillSelect("posterStyleSelect", presetOptions.posterStyle, state.ai.posterStyle);
  fillSelect("titleStyleSelect", presetOptions.titleStyle, state.ai.titleStyle);
  fillSelect("layoutPresetSelect", presetOptions.layoutPreset, state.ai.layoutPreset);
  document.getElementById("providerSelect").value = state.ai.provider;
  document.getElementById("modelInput").value = state.ai.model;
  document.getElementById("textPolicySelect").value = state.ai.textPolicy;
  document.getElementById("identityLockSelect").value = state.ai.identityLock;
  document.getElementById("retouchSelect").value = state.ai.retouch;
  document.getElementById("overrideModeSelect").value = state.ai.overrideMode;
  document.getElementById("languageSelect").value = state.ai.language;
  document.getElementById("customPromptInput").value = state.ai.customPrompt;
  document.getElementById("negativePromptInput").value = state.ai.negativePrompt;
}

function fillSelect(id, options, selected) {
  const input = document.getElementById(id);
  if (input.dataset.ready) {
    input.value = selected;
    return;
  }
  input.innerHTML = "";
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option;
    item.textContent = option.replaceAll("_", " ");
    input.appendChild(item);
  });
  input.dataset.ready = "true";
  input.value = selected;
}

function renderTemplates() {
  const root = document.getElementById("templateGrid");
  root.innerHTML = "";
  templates.forEach((template) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `template-card${template.id === state.templateId ? " active" : ""}`;
    button.innerHTML = `<div class="template-swatch" style="background:linear-gradient(135deg,${template.gradient.join(",")})"></div><strong>${template.name}</strong><span>${template.note}</span>`;
    button.addEventListener("click", () => applyTemplate(template.id));
    root.appendChild(button);
  });
}

function renderQuickFields() {
  const root = document.getElementById("quickFields");
  root.innerHTML = "";
  quickTextIds.forEach((id) => {
    const layer = state.layers[id];
    const label = document.createElement("label");
    label.className = "field";
    label.innerHTML = `<span>${layer.label}</span>`;
    const input = id === "credits" ? document.createElement("textarea") : document.createElement("input");
    input.value = layer.text;
    input.addEventListener("input", () => {
      layer.text = input.value;
      render();
    });
    label.appendChild(input);
    root.appendChild(label);
  });
}

function renderTitleCardControls() {
  const text = document.getElementById("titleCardTextInput");
  if (!text) return;
  text.value = state.titleCard.text;
  document.getElementById("titleCardSubInput").value = state.titleCard.sub;
  document.getElementById("titleCardStyleSelect").value = state.titleCard.style;
  document.getElementById("titleCardFillInput").value = state.titleCard.fill;
  document.getElementById("titleCardAccentInput").value = state.titleCard.accent;
  document.getElementById("titleCardPromptInput").value = state.titleCard.prompt;
  document.getElementById("titleCardRemoveBgSelect").value = state.titleCard.removeBg;
  document.getElementById("titleCardBgInput").value = state.titleCard.bgColor;
  document.getElementById("titleCardLetterFamilySelect").value = state.titleCard.letterFamily;
  document.getElementById("titleCardFinishSelect").value = state.titleCard.finish;
  document.getElementById("titleCardOutlineSelect").value = state.titleCard.outline;
  document.getElementById("titleCardOrnamentSelect").value = state.titleCard.ornament;
  document.getElementById("titleCardShadowSelect").value = state.titleCard.shadow;
}

function renderTitleCard() {
  if (!titleCtx || !titleCanvas) return;
  titleCtx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
  if (state.titleCard.aiImage) {
    drawContainImageOn(titleCtx, state.titleCard.aiImage, 0, 0, titleCanvas.width, titleCanvas.height, 1);
    return;
  }
  const style = titleCardStyles[state.titleCard.style] || titleCardStyles.ornate_gold;
  drawTransparentTitle({
    ctx: titleCtx,
    width: titleCanvas.width,
    height: titleCanvas.height,
    text: state.titleCard.text || "SONG TITLE",
    sub: state.titleCard.sub || "",
    fill: state.titleCard.fill || style.fill,
    accent: state.titleCard.accent || style.accent,
    style,
  });
}

const titleCardStyles = {
  ornate_gold: {
    font: "Nirmala UI",
    subFont: "Georgia",
    fill: "#ffe37a",
    accent: "#6a180e",
    shadow: "#160802",
    strokeScale: 0.1,
    glow: 24,
    slant: 0,
    uppercase: false,
  },
  neon_stage: {
    font: "Impact",
    subFont: "Trebuchet MS",
    fill: "#7df7ff",
    accent: "#ff3b9d",
    shadow: "#050b1d",
    strokeScale: 0.075,
    glow: 36,
    slant: -0.05,
    uppercase: true,
  },
  folk_red: {
    font: "Nirmala UI",
    subFont: "Arial",
    fill: "#fff0b0",
    accent: "#c82222",
    shadow: "#220804",
    strokeScale: 0.12,
    glow: 18,
    slant: 0,
    uppercase: false,
  },
  clean_album: {
    font: "Arial Black",
    subFont: "Arial",
    fill: "#ffffff",
    accent: "#111111",
    shadow: "#000000",
    strokeScale: 0.045,
    glow: 8,
    slant: 0,
    uppercase: true,
  },
  metal_film: {
    font: "Impact",
    subFont: "Arial",
    fill: "#d8dde8",
    accent: "#2b3546",
    shadow: "#050505",
    strokeScale: 0.09,
    glow: 22,
    slant: -0.03,
    uppercase: true,
  },
  bhojpuri_banner: {
    font: "Nirmala UI",
    subFont: "Arial Black",
    fill: "#ffe15b",
    accent: "#b31313",
    shadow: "#170403",
    strokeScale: 0.13,
    glow: 22,
    slant: 0,
    uppercase: false,
  },
  chhattisgarhi_folk: {
    font: "Nirmala UI",
    subFont: "Trebuchet MS",
    fill: "#ffd66b",
    accent: "#7a1b10",
    shadow: "#180704",
    strokeScale: 0.11,
    glow: 18,
    slant: 0,
    uppercase: false,
  },
  devotional_glow: {
    font: "Nirmala UI",
    subFont: "Georgia",
    fill: "#fff4a8",
    accent: "#e77923",
    shadow: "#3a1203",
    strokeScale: 0.1,
    glow: 34,
    slant: 0,
    uppercase: false,
  },
  rain_romance: {
    font: "Georgia",
    subFont: "Arial",
    fill: "#d9f7ff",
    accent: "#3674c7",
    shadow: "#06152b",
    strokeScale: 0.08,
    glow: 28,
    slant: -0.02,
    uppercase: false,
  },
  street_album: {
    font: "Impact",
    subFont: "Arial Black",
    fill: "#ffffff",
    accent: "#ffcc22",
    shadow: "#000000",
    strokeScale: 0.12,
    glow: 18,
    slant: -0.07,
    uppercase: true,
  },
  royal_script: {
    font: "Georgia",
    subFont: "Georgia",
    fill: "#ffeaa0",
    accent: "#4d1e08",
    shadow: "#130704",
    strokeScale: 0.095,
    glow: 26,
    slant: -0.03,
    uppercase: false,
  },
  dj_remix: {
    font: "Impact",
    subFont: "Trebuchet MS",
    fill: "#e8fbff",
    accent: "#a600ff",
    shadow: "#050010",
    strokeScale: 0.08,
    glow: 42,
    slant: -0.08,
    uppercase: true,
  },
};

function drawTransparentTitle({ ctx, width, height, text, sub, fill, accent, style }) {
  const title = style.uppercase ? String(text).toUpperCase() : String(text);
  const lines = fitTitleLines(ctx, title, width * 0.88, style.font);
  const baseSize = Math.max(54, Math.min(148, 154 - (lines.length - 1) * 28));
  const lineHeight = baseSize * 0.92;
  const totalTitleHeight = lines.length * lineHeight;
  const startY = height * 0.46 - totalTitleHeight / 2 + lineHeight / 2;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.transform(1, 0, style.slant || 0, 1, 0, 0);
  ctx.translate(-width / 2, -height / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;
    const font = `950 ${baseSize}px "${style.font}", "Nirmala UI", "Arial Black", sans-serif`;
    ctx.font = font;
    ctx.shadowColor = style.shadow;
    ctx.shadowBlur = style.glow;
    ctx.lineWidth = Math.max(5, baseSize * style.strokeScale);
    ctx.strokeStyle = style.shadow;
    ctx.strokeText(line, width / 2 + 6, y + 8);
    ctx.shadowBlur = style.glow * 0.55;
    ctx.strokeStyle = accent;
    ctx.strokeText(line, width / 2, y);
    const gradient = ctx.createLinearGradient(0, y - baseSize / 2, 0, y + baseSize / 2);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.34, fill);
    gradient.addColorStop(1, accent);
    ctx.fillStyle = gradient;
    ctx.fillText(line, width / 2, y);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(line, width / 2 - 2, y - baseSize * 0.15);
    ctx.globalAlpha = 1;
  });
  ctx.restore();

  if (sub) {
    ctx.save();
    ctx.font = `800 34px "${style.subFont}", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "0px";
    ctx.shadowColor = style.shadow;
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(sub).toUpperCase(), width / 2, height - 58);
    ctx.restore();
  }
}

function fitTitleLines(ctx, text, maxWidth, fontFamily) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return ["SONG TITLE"];
  ctx.save();
  ctx.font = `950 132px "${fontFamily}", "Nirmala UI", "Arial Black", sans-serif`;
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  lines.push(line);
  ctx.restore();
  return lines.slice(0, 3);
}

function renderLayerList() {
  const root = document.getElementById("layerList");
  root.innerHTML = "";
  layerOrder.forEach((id) => {
    const layer = state.layers[id];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `layer-button${id === state.activeLayer ? " active" : ""}`;
    button.innerHTML = `<span><span class="layer-dot"></span> ${layer.label}</span><small>${layer.visible ? "on" : "off"}</small>`;
    button.addEventListener("click", () => {
      state.activeLayer = id;
      renderControls();
      render();
    });
    root.appendChild(button);
  });
}

function syncLayerButtons() {
  document.querySelectorAll(".layer-button").forEach((button, index) => {
    const id = layerOrder[index];
    button.classList.toggle("active", id === state.activeLayer);
    const small = button.querySelector("small");
    if (small) small.textContent = state.layers[id].visible ? "on" : "off";
  });
}

function renderLayerEditor() {
  const id = state.activeLayer;
  const layer = state.layers[id];
  document.getElementById("activeLayerTitle").textContent = layer.label;
  document.getElementById("toggleLayerBtn").textContent = layer.visible ? "Hide" : "Show";
  const root = document.getElementById("layerEditor");
  root.innerHTML = "";

  if (layer.type === "text") root.appendChild(textAreaControl("Text", "text", layer.text, (value) => (layer.text = value)));

  const position = document.createElement("div");
  position.className = "two-col";
  position.appendChild(numberControl("X", layer.x, 0, canvas.width, (value) => (layer.x = value)));
  position.appendChild(numberControl("Y", layer.y, 0, canvas.height, (value) => (layer.y = value)));
  root.appendChild(position);

  if (layer.type === "image") {
    const size = document.createElement("div");
    size.className = "two-col";
    size.appendChild(numberControl("Width", layer.w, 20, canvas.width, (value) => (layer.w = value)));
    size.appendChild(numberControl("Height", layer.h, 20, canvas.height, (value) => (layer.h = value)));
    root.appendChild(size);
  }

  if (layer.type === "text") {
    const textSize = document.createElement("div");
    textSize.className = "two-col";
    textSize.appendChild(numberControl("Size", layer.size, 8, 220, (value) => (layer.size = value)));
    textSize.appendChild(numberControl("Width", layer.width, 80, canvas.width, (value) => (layer.width = value)));
    root.appendChild(textSize);
    root.appendChild(colorControl("Color", layer.color, (value) => (layer.color = value)));
    root.appendChild(selectControl("Align", layer.align, ["left", "center", "right"], (value) => (layer.align = value)));
    root.appendChild(selectControl("Font", layer.font, ["Nirmala UI", "Arial", "Arial Black", "Georgia", "Trebuchet MS", "Impact"], (value) => (layer.font = value)));
  }

  root.appendChild(rangeControl("Opacity", Math.round(layer.opacity * 100), 0, 100, (value) => (layer.opacity = value / 100)));
}

function wrapField(labelText, input) {
  const label = document.createElement("label");
  label.className = "field";
  label.appendChild(Object.assign(document.createElement("span"), { textContent: labelText }));
  label.appendChild(input);
  return label;
}

function numberControl(label, value, min, max, onChange) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = min;
  input.max = max;
  input.value = Math.round(value);
  input.addEventListener("input", () => {
    onChange(Number(input.value));
    render();
  });
  return wrapField(label, input);
}

function rangeControl(label, value, min, max, onChange) {
  const input = document.createElement("input");
  input.type = "range";
  input.min = min;
  input.max = max;
  input.value = value;
  input.addEventListener("input", () => {
    onChange(Number(input.value));
    render();
  });
  return wrapField(label, input);
}

function colorControl(label, value, onChange) {
  const input = document.createElement("input");
  input.type = "color";
  input.value = value;
  input.addEventListener("input", () => {
    onChange(input.value);
    render();
  });
  return wrapField(label, input);
}

function selectControl(label, value, options, onChange) {
  const input = document.createElement("select");
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option;
    item.textContent = option;
    item.selected = option === value;
    input.appendChild(item);
  });
  input.addEventListener("change", () => {
    onChange(input.value);
    render();
  });
  return wrapField(label, input);
}

function textAreaControl(label, name, value, onChange) {
  const input = document.createElement("textarea");
  input.name = name;
  input.value = value;
  input.addEventListener("input", () => {
    onChange(input.value);
    renderQuickFields();
    render();
  });
  return wrapField(label, input);
}

function loadImageFromInput(input, key) {
  const file = input.files && input.files[0];
  if (!file) return;
  state.uploadFiles[key] = file;
  if (key in state.selectedAssetIds) state.selectedAssetIds[key] = null;
  state.uploadNames[key] = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.images[key] = img;
      updateAssetSummary();
      render();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function loadGeneratedBackground(dataUrl, galleryItem = null) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      state.generatedPoster = img;
      state.images.background = img;
      addGalleryItem(
        galleryItem || {
          kind: "poster",
          title: state.layers.headline.text || "AI poster",
          dataUrl,
        },
        !galleryItem,
      );
      render();
      resolve(img);
    };
    img.onerror = () => reject(new Error("Generated poster image could not be loaded."));
    img.src = dataUrl;
  });
}

function startPosterProgress(config) {
  stopPosterProgressTimer();
  state.generation.active = true;
  state.generation.progress = 6;
  state.generation.stage = state.uploadFiles.hero || state.selectedAssetIds.hero ? "Uploading source photos" : "Preparing image prompt";
  render();
  state.generation.timer = window.setInterval(() => {
    if (!state.generation.active) return;
    const next = Math.min(88, state.generation.progress + (state.generation.progress < 40 ? 7 : 3));
    state.generation.progress = next;
    if (next > 70) state.generation.stage = "Compositing poster artwork";
    else if (next > 38) state.generation.stage = "Generating with AI model";
    else state.generation.stage = "Uploading and locking face references";
    render();
  }, 900);
}

function setPosterProgress(progress, stage) {
  state.generation.progress = Math.max(state.generation.progress || 0, progress);
  state.generation.stage = stage;
  render();
}

function finishPosterProgress(stage = "Poster ready") {
  stopPosterProgressTimer();
  state.generation.progress = 100;
  state.generation.stage = stage;
  render();
  window.setTimeout(() => {
    state.generation.active = false;
    render();
  }, 450);
}

function failPosterProgress() {
  stopPosterProgressTimer();
  state.generation.active = false;
  render();
}

function stopPosterProgressTimer() {
  if (!state.generation.timer) return;
  window.clearInterval(state.generation.timer);
  state.generation.timer = null;
}

function collectAiConfig() {
  return {
    provider: state.ai.provider,
    model: state.ai.model.trim() || undefined,
    size: state.size === "story" ? "story" : state.size,
    quality: "high",
    controls: {
      genre: state.ai.genre,
      background: state.ai.background,
      pose: state.ai.pose,
      palette: state.ai.palette,
      typography: state.ai.typography,
      posterStyle: state.ai.posterStyle,
      titleStyle: state.ai.titleStyle,
      layoutPreset: state.ai.layoutPreset,
      overrideMode: state.ai.overrideMode,
      language: state.ai.language,
      textPolicy: "baked",
      identityLock: state.ai.identityLock,
      retouch: state.ai.retouch,
      customPrompt: state.ai.customPrompt,
      negativePrompt: state.ai.negativePrompt,
    },
    assetIds: state.selectedAssetIds,
    fields: Object.fromEntries(quickTextIds.map((id) => [id, state.layers[id].text])),
  };
}

function buildLocalPromptPreview(config) {
  const controls = config.controls;
  const fields = config.fields;
  return [
    "Create a premium vertical Indian regional music/video poster artwork.",
    `Genre preset: ${controls.genre}`,
    `Background preset: ${controls.background}`,
    `Pose preset: ${controls.pose}`,
    `Palette preset: ${controls.palette}`,
    `Typography preset: ${controls.typography}`,
    `Poster style: ${controls.posterStyle}`,
    `Title style: ${controls.titleStyle}`,
    `Layout: ${controls.layoutPreset}`,
    `Override mode: ${controls.overrideMode}`,
    `Language/market: ${controls.language}`,
    `Title context: ${fields.headline}`,
    `Cast context: ${fields.leftName} / ${fields.rightName}`,
    `Text policy: ${controls.textPolicy === "overlay" ? "leave clean space for editable app overlays" : "ask model to render title/date text"}`,
    `Identity lock: ${controls.identityLock}; retouch: ${controls.retouch}`,
    "Realism: keep real photographed human faces and natural body proportions; avoid plastic AI skin, synthetic faces, or replacing people with different actors.",
    controls.customPrompt ? `User override: ${controls.customPrompt}` : "",
    controls.negativePrompt ? `Avoid: ${controls.negativePrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function generatePosterArt() {
  const button = document.getElementById("generateBtn");
  const message = document.getElementById("generationMessage");
  const config = collectAiConfig();
  const form = new FormData();
  form.append("config", JSON.stringify(config));
  if (state.uploadFiles.hero) form.append("hero", state.uploadFiles.hero);
  if (state.uploadFiles.background) form.append("background", state.uploadFiles.background);
  if (state.uploadFiles.logoLeft) form.append("logoLeft", state.uploadFiles.logoLeft);
  if (state.uploadFiles.logoRight) form.append("logoRight", state.uploadFiles.logoRight);
  state.references.forEach((file) => form.append("references", file));

  button.disabled = true;
  button.textContent = "Generating...";
  message.className = "generation-message";
  message.textContent = `Generating ${config.controls.genre.replaceAll("_", " ")} poster art with ${config.provider}.`;
  startPosterProgress(config);

  try {
    const response = await fetch("/api/generate", { method: "POST", body: form });
    setPosterProgress(90, "Downloading generated poster");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Generation failed.");
    state.ai.lastPrompt = payload.prompt || buildLocalPromptPreview(config);
    setPosterProgress(96, "Rendering poster preview");
    await loadGeneratedBackground(payload.imageDataUrl, payload.galleryItem || null);
    finishPosterProgress("Poster ready");
    if (payload.galleryItem) window.setTimeout(loadStoredGallery, 800);
    if (config.controls.textPolicy === "baked") {
      layerOrder.forEach((id) => {
        if (state.layers[id]?.type === "text" || id === "hero" || id.startsWith("logo")) state.layers[id].visible = false;
      });
      renderLayerList();
      renderLayerEditor();
      message.textContent = `Generated full poster with ${payload.provider}${payload.model ? ` (${payload.model})` : ""}. Local overlay layers were hidden.`;
    } else {
      message.textContent = `Generated with ${payload.provider}. The image is now the editable background layer.`;
    }
  } catch (error) {
    failPosterProgress();
    message.className = "generation-message error";
    message.textContent = error instanceof Error ? error.message : "Generation failed.";
  } finally {
    button.disabled = false;
    button.textContent = "Generate AI poster";
  }
}

async function generateTitleCardArt() {
  const button = document.getElementById("generateTitleBtn");
  const message = document.getElementById("generationMessage");
  const config = {
    provider: state.ai.provider,
    model: state.ai.model.trim() || undefined,
    title: state.titleCard.text,
    subtitle: state.titleCard.sub,
    style: state.titleCard.style,
    fill: state.titleCard.fill,
    accent: state.titleCard.accent,
    customPrompt: state.titleCard.prompt,
    removeBg: state.titleCard.removeBg,
    bgColor: state.titleCard.bgColor,
    letterFamily: state.titleCard.letterFamily,
    finish: state.titleCard.finish,
    outline: state.titleCard.outline,
    ornament: state.titleCard.ornament,
    shadow: state.titleCard.shadow,
  };

  button.disabled = true;
  button.textContent = "Generating...";
  message.className = "generation-message";
  message.textContent = `Generating AI title card: ${config.title}`;

  try {
    const response = await fetch("/api/generate-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Title generation failed.");
    state.titleCard.lastPrompt = payload.prompt || "";
    const img = new Image();
    img.onload = () => {
      state.titleCard.aiImage = img;
      renderTitleCard();
      addGalleryItem(payload.galleryItem || {
        kind: "title",
        title: state.titleCard.text || "AI title card",
        dataUrl: payload.imageDataUrl,
      }, !payload.galleryItem);
      if (payload.galleryItem) window.setTimeout(loadStoredGallery, 800);
    };
    img.src = payload.imageDataUrl;
    message.textContent = `Generated AI title card with ${payload.provider}${payload.model ? ` (${payload.model})` : ""}. Download exports the transparent title PNG canvas.`;
  } catch (error) {
    message.className = "generation-message error";
    message.textContent = error instanceof Error ? error.message : "Title generation failed.";
  } finally {
    button.disabled = false;
    button.textContent = "AI generate";
  }
}

function resetTitleCardAiImage() {
  state.titleCard.aiImage = null;
  renderTitleCard();
}

function updateAssetSummary() {
  const root = document.getElementById("assetSummary");
  if (!root) return;
  const heroSource = state.selectedAssetIds.hero ? `${state.uploadNames.hero || "selected asset"} (saved)` : state.uploadNames.hero || "not added";
  const backgroundSource = state.selectedAssetIds.background
    ? `${state.uploadNames.background || "selected asset"} (saved)`
    : state.uploadNames.background || "optional";
  const rows = [
    ["Hero", heroSource],
    ["Background", backgroundSource],
    ["Style refs", state.uploadNames.references.length ? `${state.uploadNames.references.length} selected` : "none"],
    ["Logos", [state.uploadNames.logoLeft, state.uploadNames.logoRight].filter(Boolean).length ? `${[state.uploadNames.logoLeft, state.uploadNames.logoRight].filter(Boolean).length} added` : "optional"],
  ];
  root.innerHTML = rows.map(([label, value]) => `<span><b>${label}</b>${value}</span>`).join("");
}

async function loadProductionDesk() {
  await Promise.allSettled([loadAssets(), loadPromptDbStatus(), loadRembgStatus()]);
  if (state.production.promptTemplates.length) await loadActivePromptVersion();
}

async function loadAssets() {
  try {
    const response = await fetch("/api/assets");
    const payload = await response.json();
    state.production.assets = Array.isArray(payload.items) ? payload.items : [];
  } catch (error) {
    console.warn("Could not load assets", error);
    state.production.assets = [];
  }
  renderAssetDesk();
}

async function loadPromptDbStatus() {
  try {
    const [templatesResponse, flowsResponse] = await Promise.all([fetch("/api/prompts/templates"), fetch("/api/flows")]);
    const templatesPayload = await templatesResponse.json();
    const flowsPayload = await flowsResponse.json();
    state.production.promptTemplates = Array.isArray(templatesPayload.items) ? templatesPayload.items : [];
    state.production.flows = Array.isArray(flowsPayload.items) ? flowsPayload.items : [];
  } catch (error) {
    console.warn("Could not load prompt database status", error);
    state.production.promptTemplates = [];
    state.production.flows = [];
  }
  renderPromptDbStatus();
}

async function loadRembgStatus() {
  try {
    const response = await fetch("/api/rembg/health");
    state.production.rembg = await response.json();
  } catch (error) {
    state.production.rembg = { ok: false, configured: false, error: "rembg health check failed" };
  }
  renderAssetDesk();
}

function renderAssetDesk() {
  const status = document.getElementById("assetServiceStatus");
  const grid = document.getElementById("assetGrid");
  if (!status || !grid) return;
  const rembg = state.production.rembg || {};
  status.className = `service-status ${rembg.ok ? "ready" : "warn"}`;
  status.textContent = rembg.ok
    ? `rembg ready (${rembg.model || "u2net"}). Assets are saved on the VPS volume.`
    : `Assets are persistent. Background removal: ${rembg.configured ? rembg.error || "service unavailable" : "not configured locally"}.`;

  if (!state.production.assets.length) {
    grid.innerHTML = `<div class="empty-gallery">Uploaded and processed assets will appear here.</div>`;
    return;
  }

  grid.innerHTML = "";
  state.production.assets.slice(0, 24).forEach((asset) => {
    const card = document.createElement("article");
    card.className = "asset-card";
    card.innerHTML = `
      <img alt="${escapeHtml(asset.title || asset.role)}" src="${asset.url}" />
      <header>
        <strong>${escapeHtml(asset.title || asset.filename)}</strong>
        <span>${escapeHtml(asset.role)} / ${escapeHtml(asset.kind)} / ${formatBytes(asset.bytes)}</span>
      </header>
      <div class="asset-actions">
        <button type="button" data-action="hero">Hero</button>
        <button type="button" data-action="background">BG</button>
        <button type="button" data-action="reference">Ref</button>
        <button type="button" data-action="remove-bg" ${rembg.ok ? "" : "disabled"}>Cutout</button>
      </div>
    `;
    card.querySelector('[data-action="hero"]').addEventListener("click", () => useAssetImage(asset, "hero"));
    card.querySelector('[data-action="background"]').addEventListener("click", () => useAssetImage(asset, "background"));
    card.querySelector('[data-action="reference"]').addEventListener("click", () => useAssetReference(asset));
    card.querySelector('[data-action="remove-bg"]').addEventListener("click", () => removeAssetBackground(asset.id));
    grid.appendChild(card);
  });
}

function useAssetReference(asset) {
  if (!state.selectedAssetIds.references.includes(asset.id)) state.selectedAssetIds.references.push(asset.id);
  const label = asset.title || asset.filename || "saved reference";
  if (!state.uploadNames.references.includes(label)) state.uploadNames.references.push(label);
  updateAssetSummary();
  const message = document.getElementById("generationMessage");
  if (message) {
    message.className = "generation-message";
    message.textContent = `Added saved reference asset: ${label}`;
  }
}

function renderPromptDbStatus() {
  const status = document.getElementById("promptDbStatus");
  const flowSummary = document.getElementById("flowSummary");
  if (!status || !flowSummary) return;
  renderPromptTemplateSelect();
  status.className = `prompt-db-status ${state.production.promptTemplates.length ? "ready" : ""}`;
  status.textContent = `${state.production.promptTemplates.length} prompt template${state.production.promptTemplates.length === 1 ? "" : "s"} and ${state.production.flows.length} workflow${state.production.flows.length === 1 ? "" : "s"} loaded from the production database.`;
  flowSummary.innerHTML = state.production.flows.length
    ? state.production.flows
        .map((flow) => `<div class="flow-pill"><strong>${escapeHtml(flow.name)}</strong><br /><span>${escapeHtml(flow.activeVersionId || "no active version")}</span></div>`)
        .join("")
    : `<div class="empty-gallery">No workflow definitions loaded.</div>`;
}

function renderPromptTemplateSelect() {
  const select = document.getElementById("promptTemplateSelect");
  if (!select) return;
  const previous = select.value;
  select.innerHTML = "";
  state.production.promptTemplates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = `${template.name} (${template.activeVersionId})`;
    select.appendChild(option);
  });
  select.value = previous && state.production.promptTemplates.some((template) => template.id === previous)
    ? previous
    : state.production.promptTemplates[0]?.id || "";
}

async function loadActivePromptVersion() {
  const select = document.getElementById("promptTemplateSelect");
  const content = document.getElementById("promptContentInput");
  const status = document.getElementById("promptEditStatus");
  if (!select?.value || !content || !status) return;
  status.className = "prompt-db-status";
  status.textContent = "Loading active prompt version...";
  try {
    const response = await fetch(`/api/prompts/templates/${encodeURIComponent(select.value)}/active`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not load active prompt.");
    state.production.activePromptVersion = payload.version;
    content.value = payload.version?.content || "";
    const note = document.getElementById("promptChangeNoteInput");
    if (note) note.value = "";
    status.className = "prompt-db-status ready";
    status.textContent = `Loaded ${payload.template.name} ${payload.version.id}.`;
  } catch (error) {
    status.className = "prompt-db-status";
    status.textContent = error instanceof Error ? error.message : "Could not load active prompt.";
  }
}

async function savePromptVersion() {
  const select = document.getElementById("promptTemplateSelect");
  const content = document.getElementById("promptContentInput");
  const note = document.getElementById("promptChangeNoteInput");
  const status = document.getElementById("promptEditStatus");
  if (!select?.value || !content || !status) return;
  status.className = "prompt-db-status";
  status.textContent = "Saving prompt as a new active version...";
  try {
    const response = await fetch(`/api/prompts/templates/${encodeURIComponent(select.value)}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.value,
        changeNote: note?.value || "Edited from Poster Maker UI",
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not save prompt version.");
    status.className = "prompt-db-status ready";
    status.textContent = `Saved active prompt version ${payload.activeVersionId}.`;
    await loadPromptDbStatus();
    await loadActivePromptVersion();
  } catch (error) {
    status.className = "prompt-db-status";
    status.textContent = error instanceof Error ? error.message : "Could not save prompt version.";
  }
}

async function uploadAssetDeskFiles() {
  const input = document.getElementById("assetDeskUpload");
  const role = document.getElementById("assetRoleSelect")?.value || "asset";
  const message = document.getElementById("generationMessage");
  const files = Array.from(input?.files || []);
  if (!files.length) {
    if (message) message.textContent = "Choose one or more image assets first.";
    return;
  }
  const form = new FormData();
  form.append("role", role);
  files.forEach((file) => form.append("assets", file));
  if (message) {
    message.className = "generation-message";
    message.textContent = `Uploading ${files.length} persistent asset${files.length === 1 ? "" : "s"}...`;
  }
  const response = await fetch("/api/assets/upload", { method: "POST", body: form });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Asset upload failed.");
  input.value = "";
  await loadAssets();
  if (message) message.textContent = `Uploaded ${payload.assets?.length || files.length} persistent asset${files.length === 1 ? "" : "s"}.`;
}

async function removeAssetBackground(assetId) {
  const message = document.getElementById("generationMessage");
  if (message) {
    message.className = "generation-message";
    message.textContent = "Removing background with rembg...";
  }
  try {
    const response = await fetch("/api/assets/remove-bg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, trim: true, model: "u2net" }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Background removal failed.");
    await loadAssets();
    if (payload.asset) await useAssetImage(payload.asset, "hero");
    if (message) message.textContent = "Background removed. Cutout added to the poster as the hero layer.";
  } catch (error) {
    if (message) {
      message.className = "generation-message error";
      message.textContent = error instanceof Error ? error.message : "Background removal failed.";
    }
  }
}

function useAssetImage(asset, target) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (target === "background") {
        state.images.background = img;
        state.generatedPoster = null;
        state.uploadFiles.background = null;
        state.selectedAssetIds.background = asset.id;
        state.uploadNames.background = asset.title || asset.filename || "saved asset";
      } else {
        state.images.hero = img;
        state.uploadFiles.hero = null;
        state.selectedAssetIds.hero = asset.id;
        state.uploadNames.hero = asset.title || asset.filename || "asset";
      }
      updateAssetSummary();
      render();
      resolve(img);
    };
    img.onerror = () => reject(new Error("Could not load asset image."));
    img.src = asset.url;
  });
}

function addGalleryItem(item, saveLocal = true) {
  const galleryItem = item.id
    ? item
    : {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAtMs: Date.now(),
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    ...item,
      };
  state.gallery.unshift(galleryItem);
  state.gallery = state.gallery.slice(0, 12);
  renderGallery();
  if (saveLocal) saveGalleryItem(galleryItem);
}

function renderGallery() {
  const root = document.getElementById("galleryGrid");
  if (!root) return;
  if (!state.gallery.length) {
    root.innerHTML = `<div class="empty-gallery">Generated posters and AI title cards will appear here.</div>`;
    return;
  }
  root.innerHTML = "";
  state.gallery.forEach((item) => {
    const card = document.createElement("article");
    card.className = "gallery-card";
    card.innerHTML = `
      <img alt="${item.kind} preview" src="${item.dataUrl || item.url}" />
      <div>
        <strong>${item.kind === "title" ? "Title card" : "Poster"}</strong>
        <span>${item.createdAt}</span>
      </div>
      <button type="button">Download</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      if (item.downloadUrl || item.url) {
        window.open(item.downloadUrl || item.url, "_blank");
      } else {
        downloadDataUrl(item.dataUrl, `${item.kind}-${item.id}.png`);
      }
    });
    root.appendChild(card);
  });
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBytes(bytes = 0) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function openGalleryDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(galleryDbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(galleryStoreName)) db.createObjectStore(galleryStoreName, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveGalleryItem(item) {
  try {
    const db = await openGalleryDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(galleryStoreName, "readwrite");
      tx.objectStore(galleryStoreName).put(item);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    await trimStoredGallery();
  } catch (error) {
    console.warn("Could not save gallery item", error);
  }
}

async function loadStoredGallery() {
  try {
    const response = await fetch("/api/gallery");
    if (response.ok) {
      const payload = await response.json();
      state.gallery = Array.isArray(payload.items) ? payload.items.slice(0, 12) : [];
      renderGallery();
      return;
    }
  } catch (error) {
    console.warn("Could not load server gallery", error);
  }
  try {
    const db = await openGalleryDb();
    const items = await new Promise((resolve, reject) => {
      const tx = db.transaction(galleryStoreName, "readonly");
      const request = tx.objectStore(galleryStoreName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    state.gallery = items.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)).slice(0, 12);
    renderGallery();
  } catch (error) {
    console.warn("Could not load gallery", error);
    renderGallery();
  }
}

async function trimStoredGallery() {
  const db = await openGalleryDb();
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(galleryStoreName, "readonly");
    const request = tx.objectStore(galleryStoreName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  const extra = items.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)).slice(12);
  if (!extra.length) return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(galleryStoreName, "readwrite");
    extra.forEach((item) => tx.objectStore(galleryStoreName).delete(item.id));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function refreshApiStatus() {
  const status = document.getElementById("apiStatus");
  try {
    const response = await fetch("/api/health");
    const payload = await response.json();
    const configured = [];
    if (payload.openaiConfigured) configured.push("OpenAI ready");
    if (payload.googleConfigured) configured.push(payload.classroomCredentials?.secretLoaded || payload.classroomCredentials?.envLoaded ? "Gemini ready from classroom credentials" : "Gemini ready");
    if (!payload.openaiConfigured && payload.googleConfigured && state.ai.provider === "openai") {
      state.ai.provider = "gemini";
      document.getElementById("providerSelect").value = "gemini";
    }
    status.className = `api-status ${configured.length ? "ready" : "missing"}`;
    status.textContent = configured.length
      ? `${configured.join(" · ")}. Defaults: ${payload.defaults.openaiModel}, ${payload.defaults.geminiModel}.`
      : "No API key found. Add OPENAI_API_KEY or GOOGLE_API_KEY in .env, then restart npm start.";
  } catch {
    status.className = "api-status missing";
    status.textContent = "Run npm install, then npm start to enable AI generation.";
  }
}

function resizeCanvas(sizeKey) {
  const [w, h] = sizes[sizeKey];
  const oldW = canvas.width;
  const oldH = canvas.height;
  canvas.width = w;
  canvas.height = h;
  const sx = w / oldW;
  const sy = h / oldH;
  Object.values(state.layers).forEach((layer) => {
    layer.x *= sx;
    layer.y *= sy;
    if (layer.type === "image") {
      layer.w *= sx;
      layer.h *= sy;
    }
    if (layer.type === "text") layer.width *= sx;
  });
  state.size = sizeKey;
  renderControls();
  render();
}

function pointerToCanvas(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function hitTest(point) {
  for (let i = layerOrder.length - 1; i >= 0; i -= 1) {
    const id = layerOrder[i];
    const layer = state.layers[id];
    if (!layer.visible) continue;
    if (layer.type === "image") {
      if (point.x >= layer.x && point.x <= layer.x + layer.w && point.y >= layer.y && point.y <= layer.y + layer.h) return id;
    } else {
      const halfWidth = layer.width / 2;
      const height = layer.size * 1.4;
      const left = layer.align === "left" ? layer.x : layer.align === "right" ? layer.x - layer.width : layer.x - halfWidth;
      if (point.x >= left && point.x <= left + layer.width && point.y >= layer.y - height && point.y <= layer.y + height) return id;
    }
  }
  return null;
}

canvas.addEventListener("pointerdown", (event) => {
  const point = pointerToCanvas(event);
  const id = hitTest(point);
  if (!id) return;
  state.activeLayer = id;
  const layer = state.layers[id];
  drag = { id, dx: point.x - layer.x, dy: point.y - layer.y };
  canvas.setPointerCapture(event.pointerId);
  renderControls();
});

canvas.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const point = pointerToCanvas(event);
  const layer = state.layers[drag.id];
  layer.x = point.x - drag.dx;
  layer.y = point.y - drag.dy;
  renderLayerEditor();
  render();
});

canvas.addEventListener("pointerup", () => {
  drag = null;
});

canvas.addEventListener("pointercancel", () => {
  drag = null;
});

function exportPng() {
  render();
  const link = document.createElement("a");
  link.download = `poster-${state.templateId}-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function exportTitlePng() {
  renderTitleCard();
  const link = document.createElement("a");
  link.download = `title-card-${Date.now()}.png`;
  link.href = titleCanvas.toDataURL("image/png");
  link.click();
}

function fitToDefaults() {
  const selected = state.templateId;
  const texts = Object.fromEntries(quickTextIds.map((id) => [id, state.layers[id].text]));
  const fresh = initialLayers(texts);
  Object.assign(state.layers, fresh);
  state.templateId = selected;
  applyTemplate(selected);
}

function initialLayers(texts = {}) {
  return {
    logoLeft: { label: "Left logo", type: "image", x: 74, y: 58, w: 120, h: 70, visible: true, opacity: 1 },
    logoRight: { label: "Right logo", type: "image", x: 884, y: 54, w: 128, h: 74, visible: true, opacity: 1 },
    presenter: { label: "Presenter", type: "text", text: texts.presenter || textDefaults.presenter, x: 540, y: 92, size: 32, color: "#fff1c6", align: "center", width: 720, visible: true, opacity: 1, weight: "800", font: "Arial" },
    headline: { label: "Main title", type: "text", text: texts.headline || textDefaults.headline, x: 540, y: 770, size: 136, color: activeTemplate().title, align: "center", width: 900, visible: true, opacity: 1, weight: "900", font: "Nirmala UI" },
    subtitle: { label: "Subtitle", type: "text", text: texts.subtitle || textDefaults.subtitle, x: 540, y: 902, size: 34, color: "#ffffff", align: "center", width: 720, visible: true, opacity: 0.9, weight: "700", font: "Georgia" },
    leftName: { label: "Left artist", type: "text", text: texts.leftName || textDefaults.leftName, x: 150, y: 460, size: 34, color: "#fff4cc", align: "left", width: 260, visible: true, opacity: 1, weight: "800", font: "Arial" },
    rightName: { label: "Right artist", type: "text", text: texts.rightName || textDefaults.rightName, x: 930, y: 460, size: 34, color: "#fff4cc", align: "right", width: 260, visible: true, opacity: 1, weight: "800", font: "Arial" },
    release: { label: "Release label", type: "text", text: texts.release || textDefaults.release, x: 540, y: 1036, size: 30, color: "#ffffff", align: "center", width: 640, visible: true, opacity: 1, weight: "800", font: "Arial" },
    date: { label: "Date", type: "text", text: texts.date || textDefaults.date, x: 540, y: 1090, size: 58, color: activeTemplate().accent, align: "center", width: 780, visible: true, opacity: 1, weight: "900", font: "Arial Black" },
    credits: { label: "Credits", type: "text", text: texts.credits || textDefaults.credits, x: 540, y: 1214, size: 22, color: "#ffffff", align: "center", width: 940, visible: true, opacity: 0.92, weight: "700", font: "Arial" },
    footer: { label: "Footer", type: "text", text: texts.footer || textDefaults.footer, x: 540, y: 1280, size: 24, color: activeTemplate().accent, align: "center", width: 960, visible: true, opacity: 1, weight: "800", font: "Arial" },
    hero: { label: "Hero image", type: "image", x: 215, y: 260, w: 650, h: 650, visible: true, opacity: 1 },
  };
}

document.getElementById("heroUpload").addEventListener("change", (event) => loadImageFromInput(event.target, "hero"));
document.getElementById("backgroundUpload").addEventListener("change", (event) => loadImageFromInput(event.target, "background"));
document.getElementById("logoLeftUpload").addEventListener("change", (event) => loadImageFromInput(event.target, "logoLeft"));
document.getElementById("logoRightUpload").addEventListener("change", (event) => loadImageFromInput(event.target, "logoRight"));
document.getElementById("referenceUpload").addEventListener("change", (event) => {
  state.references = Array.from(event.target.files || []);
  state.selectedAssetIds.references = [];
  state.uploadNames.references = state.references.map((file) => file.name);
  updateAssetSummary();
  const message = document.getElementById("generationMessage");
  message.className = "generation-message";
  message.textContent = `${state.references.length} AI reference image${state.references.length === 1 ? "" : "s"} selected.`;
});
document.getElementById("clearImagesBtn").addEventListener("click", clearImages);
document.getElementById("uploadAssetBtn").addEventListener("click", () => {
  uploadAssetDeskFiles().catch((error) => {
    const message = document.getElementById("generationMessage");
    if (message) {
      message.className = "generation-message error";
      message.textContent = error instanceof Error ? error.message : "Asset upload failed.";
    }
  });
});
document.getElementById("refreshAssetsBtn").addEventListener("click", () => {
  loadAssets();
  loadRembgStatus();
});
document.getElementById("refreshPromptDbBtn").addEventListener("click", loadPromptDbStatus);
document.getElementById("loadPromptVersionBtn").addEventListener("click", loadActivePromptVersion);
document.getElementById("savePromptVersionBtn").addEventListener("click", savePromptVersion);
document.getElementById("refreshGalleryBtn").addEventListener("click", loadStoredGallery);
document.getElementById("resetTextBtn").addEventListener("click", resetTexts);
document.getElementById("randomizeBtn").addEventListener("click", randomizePoster);
document.getElementById("exportBtn").addEventListener("click", exportPng);
document.getElementById("generateTitleBtn").addEventListener("click", generateTitleCardArt);
document.getElementById("downloadTitleBtn").addEventListener("click", exportTitlePng);
document.getElementById("applyTitleBtn").addEventListener("click", () => {
  state.layers.headline.text = state.titleCard.text;
  state.layers.subtitle.text = state.titleCard.sub;
  renderControls();
  render();
});
document.getElementById("fitBtn").addEventListener("click", fitToDefaults);
document.getElementById("generateBtn").addEventListener("click", generatePosterArt);
document.getElementById("promptOnlyBtn").addEventListener("click", async () => {
  const config = collectAiConfig();
  const message = document.getElementById("generationMessage");
  message.className = "generation-message";
  message.textContent = "Resolving production prompt from database...";
  try {
    const response = await fetch("/api/generate/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Prompt preview failed.");
    state.ai.lastPrompt = payload.prompt || "";
    message.textContent = [
      `Resolved DB prompt (${payload.referenceCount || 0} saved asset reference${payload.referenceCount === 1 ? "" : "s"}).`,
      "",
      state.ai.lastPrompt,
    ].join("\n");
  } catch (error) {
    state.ai.lastPrompt = buildLocalPromptPreview(config);
    message.className = "generation-message error";
    message.textContent = `${error instanceof Error ? error.message : "Prompt preview failed."}\n\nLocal fallback:\n${state.ai.lastPrompt}`;
  }
});
[
  ["providerSelect", "provider"],
  ["modelInput", "model"],
  ["textPolicySelect", "textPolicy"],
  ["identityLockSelect", "identityLock"],
  ["retouchSelect", "retouch"],
  ["genreSelect", "genre"],
  ["backgroundSelect", "background"],
  ["poseSelect", "pose"],
  ["paletteSelect", "palette"],
  ["typographySelect", "typography"],
  ["posterStyleSelect", "posterStyle"],
  ["titleStyleSelect", "titleStyle"],
  ["layoutPresetSelect", "layoutPreset"],
  ["overrideModeSelect", "overrideMode"],
  ["languageSelect", "language"],
  ["customPromptInput", "customPrompt"],
  ["negativePromptInput", "negativePrompt"],
].forEach(([elementId, stateKey]) => {
  document.getElementById(elementId).addEventListener("input", (event) => {
    state.ai[stateKey] = event.target.value;
  });
  document.getElementById(elementId).addEventListener("change", (event) => {
    state.ai[stateKey] = event.target.value;
  });
});
[
  ["titleCardTextInput", "text"],
  ["titleCardSubInput", "sub"],
  ["titleCardStyleSelect", "style"],
  ["titleCardFillInput", "fill"],
  ["titleCardAccentInput", "accent"],
  ["titleCardPromptInput", "prompt"],
  ["titleCardRemoveBgSelect", "removeBg"],
  ["titleCardBgInput", "bgColor"],
  ["titleCardLetterFamilySelect", "letterFamily"],
  ["titleCardFinishSelect", "finish"],
  ["titleCardOutlineSelect", "outline"],
  ["titleCardOrnamentSelect", "ornament"],
  ["titleCardShadowSelect", "shadow"],
].forEach(([elementId, stateKey]) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.addEventListener("input", (event) => {
    state.titleCard[stateKey] = event.target.value;
    resetTitleCardAiImage();
  });
  element.addEventListener("change", (event) => {
    state.titleCard[stateKey] = event.target.value;
    resetTitleCardAiImage();
  });
});
document.getElementById("toggleLayerBtn").addEventListener("click", () => {
  const layer = state.layers[state.activeLayer];
  layer.visible = !layer.visible;
  renderLayerEditor();
  render();
});
document.getElementById("grainRange").addEventListener("input", (event) => {
  state.grain = Number(event.target.value);
  render();
});
document.getElementById("vignetteRange").addEventListener("input", (event) => {
  state.vignette = Number(event.target.value);
  render();
});
document.getElementById("glowRange").addEventListener("input", (event) => {
  state.glow = Number(event.target.value);
  render();
});
document.querySelectorAll("[data-size]").forEach((button) => {
  button.addEventListener("click", () => resizeCanvas(button.dataset.size));
});
document.querySelectorAll("[data-editor-mode]").forEach((button) => {
  button.addEventListener("click", () => setEditorMode(button.dataset.editorMode));
});

renderControls();
render();
loadStoredGallery();
loadProductionDesk();
refreshApiStatus();

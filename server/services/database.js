import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const now = () => new Date().toISOString();

export function createAppDatabase(dataDir) {
  mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, "postermaker.sqlite");
  const existed = existsSync(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  createSchema(db);
  seedCoreData(db);
  return new AppDatabase(db, dbPath, existed);
}

class AppDatabase {
  constructor(db, dbPath, existed) {
    this.db = db;
    this.dbPath = dbPath;
    this.existed = existed;
  }

  all(sql, params = {}) {
    return runStatement(this.db.prepare(sql), "all", params);
  }

  get(sql, params = {}) {
    return runStatement(this.db.prepare(sql), "get", params);
  }

  run(sql, params = {}) {
    return runStatement(this.db.prepare(sql), "run", params);
  }
}

function runStatement(statement, method, params) {
  if (Array.isArray(params)) return statement[method](...params);
  if (params && typeof params === "object" && Object.keys(params).length) return statement[method](params);
  return statement[method]();
}

function createSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      active_version_id TEXT,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prompt_versions (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      status TEXT NOT NULL,
      model_family TEXT,
      content TEXT NOT NULL,
      variables_json TEXT NOT NULL,
      required_blocks_json TEXT NOT NULL,
      change_note TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(template_id, version)
    );

    CREATE TABLE IF NOT EXISTS prompt_blocks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0,
      content TEXT NOT NULL,
      version INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS preset_prompt_mappings (
      id TEXT PRIMARY KEY,
      preset_id TEXT NOT NULL,
      workflow TEXT NOT NULL,
      prompt_block_ids_json TEXT NOT NULL,
      negative_block_ids_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      active_version_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flow_versions (
      id TEXT PRIMARY KEY,
      flow_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      status TEXT NOT NULL,
      definition_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(flow_id, version)
    );

    CREATE TABLE IF NOT EXISTS generation_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      workflow TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      template_version_ids_json TEXT NOT NULL,
      prompt_block_version_ids_json TEXT NOT NULL,
      resolved_prompt TEXT NOT NULL,
      resolved_negative_prompt TEXT,
      input_asset_ids_json TEXT NOT NULL,
      output_asset_ids_json TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      created_at TEXT NOT NULL,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      parent_asset_id TEXT,
      kind TEXT NOT NULL,
      role TEXT NOT NULL,
      title TEXT,
      mime_type TEXT NOT NULL,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      source TEXT NOT NULL,
      meta_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function seedCoreData(db) {
  const timestamp = now();
  const insertTemplate = db.prepare(`
    INSERT OR IGNORE INTO prompt_templates
    (id, name, type, status, active_version_id, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertVersion = db.prepare(`
    INSERT OR IGNORE INTO prompt_versions
    (id, template_id, version, status, model_family, content, variables_json, required_blocks_json, change_note, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertBlock = db.prepare(`
    INSERT OR IGNORE INTO prompt_blocks
    (id, name, category, status, locked, content, version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFlow = db.prepare(`
    INSERT OR IGNORE INTO flows
    (id, name, status, active_version_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertFlowVersion = db.prepare(`
    INSERT OR IGNORE INTO flow_versions
    (id, flow_id, version, status, definition_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const updateBlockIfOld = db.prepare(`
    UPDATE prompt_blocks
    SET content = ?, locked = ?, version = ?, updated_at = ?
    WHERE id = ? AND version < ?
  `);

  const titleAssetTransparencyBlock =
    "For title-card assets, generate only the lettering/design element on one perfectly flat removable solid background color when chroma mode is requested. Never draw fake checkerboard transparency, texture, gradients, scenes, people, logos, watermarks, or poster mockup rectangles.";

  const posterTemplate = [
    "Create the requested production-ready visual using the resolved system below.",
    "",
    "LOCKED QUALITY AND SAFETY BLOCKS:",
    "{{lockedBlocks}}",
    "",
    "WORKFLOW CONTEXT:",
    "{{workflowContext}}",
    "",
    "BASE CREATIVE PROMPT:",
    "{{basePrompt}}",
    "",
    "DATABASE PRESET BLOCKS:",
    "{{presetBlocks}}",
    "",
    "USER CUSTOM COMMAND:",
    "{{customInstruction}}",
    "",
    "OUTPUT RULE:",
    "{{outputRule}}",
  ].join("\n");

  const titleTemplate = [
    "Generate a reusable design asset using the resolved system below.",
    "",
    "LOCKED QUALITY AND SAFETY BLOCKS:",
    "{{lockedBlocks}}",
    "",
    "BASE TITLE PROMPT:",
    "{{basePrompt}}",
    "",
    "DATABASE STYLE BLOCKS:",
    "{{presetBlocks}}",
    "",
    "USER CUSTOM COMMAND:",
    "{{customInstruction}}",
    "",
    "OUTPUT RULE:",
    "{{outputRule}}",
  ].join("\n");

  const blocks = [
    {
      id: "identity_lock_core",
      name: "Identity Lock Core",
      category: "identity_lock",
      locked: 1,
      content:
        "When uploaded human reference images are provided, preserve face geometry, facial details, body proportions, skin tone, hairline, glasses, jewelry, and recognizable identity. Do not replace real people with generic AI actors.",
    },
    {
      id: "realism_quality_core",
      name: "Realism Quality Core",
      category: "quality",
      locked: 1,
      content:
        "Use realistic photographed human texture, correct anatomy, natural hands, coherent lighting, crisp poster detail, no watermark, no QR code, no fake signatures, no plastic skin, no wax-like face.",
    },
    {
      id: "editable_text_rule",
      name: "Editable Text Rule",
      category: "text_policy",
      locked: 0,
      content:
        "For editor-first workflows, leave clean intentional space for editable overlays and avoid baking small unreadable text into the base image.",
    },
    {
      id: "music_poster_density",
      name: "Music Poster Density",
      category: "composition",
      locked: 0,
      content:
        "Use dense Indian regional music-poster composition, strong hero/heroine presence, cinematic background, commercial color grade, and space for a huge title and credit strip.",
    },
    {
      id: "title_asset_transparency",
      name: "Title Asset Transparency",
      category: "asset_output",
      locked: 1,
      content: titleAssetTransparencyBlock,
    },
  ];

  insertTemplate.run(
    "base_music_poster",
    "Base Music Poster",
    "base_generation",
    "active",
    "base_music_poster_v1",
    "Database-resolved music poster base generation prompt.",
    timestamp,
    timestamp,
  );
  insertVersion.run(
    "base_music_poster_v1",
    "base_music_poster",
    1,
    "published",
    "image",
    posterTemplate,
    JSON.stringify(["lockedBlocks", "workflowContext", "basePrompt", "presetBlocks", "customInstruction", "outputRule"]),
    JSON.stringify(["identity_lock_core", "realism_quality_core"]),
    "Initial production DB prompt wrapper for poster generation.",
    "system",
    timestamp,
  );

  insertTemplate.run(
    "asset_title_card",
    "AI Title Card Asset",
    "asset_generation",
    "active",
    "asset_title_card_v1",
    "Database-resolved title-card prompt.",
    timestamp,
    timestamp,
  );
  insertVersion.run(
    "asset_title_card_v1",
    "asset_title_card",
    1,
    "published",
    "image",
    titleTemplate,
    JSON.stringify(["lockedBlocks", "basePrompt", "presetBlocks", "customInstruction", "outputRule"]),
    JSON.stringify(["title_asset_transparency", "realism_quality_core"]),
    "Initial production DB prompt wrapper for title assets.",
    "system",
    timestamp,
  );

  for (const block of blocks) {
    insertBlock.run(block.id, block.name, block.category, "active", block.locked, block.content, 1, timestamp, timestamp);
  }
  updateBlockIfOld.run(titleAssetTransparencyBlock, 1, 2, timestamp, "title_asset_transparency", 2);

  const flowDefinition = {
    id: "music_poster_ai_base_then_overlay",
    steps: ["choose_format", "collect_assets", "generate_base", "select_variant", "design_overlays", "export"],
    defaultPromptTemplateId: "base_music_poster",
    defaultOverlayKitIds: ["classic_regional_music_poster"],
    requiredAssetRoles: ["hero_or_couple"],
    optionalAssetRoles: ["logo", "background", "style_reference"],
    upgradePolicy: "new_projects_use_active_version_existing_projects_keep_version",
  };
  insertFlow.run(
    "music_poster_ai_base_then_overlay",
    "Music Poster: AI Base + Overlay",
    "active",
    "music_poster_flow_v1",
    timestamp,
    timestamp,
  );
  insertFlowVersion.run(
    "music_poster_flow_v1",
    "music_poster_ai_base_then_overlay",
    1,
    "published",
    JSON.stringify(flowDefinition, null, 2),
    timestamp,
  );
}

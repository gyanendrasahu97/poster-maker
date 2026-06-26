import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const now = () => new Date().toISOString();

export function createAssetStore(dataDir, appDb) {
  const root = join(dataDir, "assets");
  const originalsDir = join(root, "originals");
  const processedDir = join(root, "processed");
  const thumbsDir = join(root, "thumbnails");
  [root, originalsDir, processedDir, thumbsDir].forEach((dir) => mkdirSync(dir, { recursive: true }));

  return {
    root,
    originalsDir,
    processedDir,
    thumbsDir,
    list() {
      return appDb.all(`
        SELECT id, parent_asset_id AS parentAssetId, kind, role, title, mime_type AS mimeType,
               filename, url, bytes, width, height, source, meta_json AS metaJson,
               created_at AS createdAt, updated_at AS updatedAt
        FROM assets
        ORDER BY created_at DESC
        LIMIT 200
      `).map(hydrateAsset);
    },
    get(id) {
      const row = appDb.get(
        `SELECT id, parent_asset_id AS parentAssetId, kind, role, title, mime_type AS mimeType,
                filename, url, bytes, width, height, source, meta_json AS metaJson,
                created_at AS createdAt, updated_at AS updatedAt
         FROM assets
         WHERE id = ?`,
        [id],
      );
      return row ? hydrateAsset(row) : null;
    },
    saveOriginal(file, role = "asset", title = "") {
      const id = makeId("asset");
      const extension = extensionFor(file.originalname, file.mimetype);
      const filename = `${id}${extension}`;
      const absolutePath = join(originalsDir, filename);
      writeFileSync(absolutePath, file.buffer);
      const asset = {
        id,
        parentAssetId: null,
        kind: "original",
        role,
        title: title || file.originalname || "Uploaded asset",
        mimeType: file.mimetype || "application/octet-stream",
        filename,
        url: `/assets/originals/${filename}`,
        bytes: file.buffer.length,
        width: null,
        height: null,
        source: "upload",
        meta: { originalName: file.originalname || "", absolutePath },
      };
      insertAsset(appDb, asset);
      return asset;
    },
    saveProcessed({ parentAsset, bytes, role = "cutout", title = "Removed background", source = "rembg-tool", meta = {} }) {
      const id = makeId("asset");
      const filename = `${id}.png`;
      const absolutePath = join(processedDir, filename);
      writeFileSync(absolutePath, bytes);
      const asset = {
        id,
        parentAssetId: parentAsset?.id || null,
        kind: "processed",
        role,
        title,
        mimeType: "image/png",
        filename,
        url: `/assets/processed/${filename}`,
        bytes: bytes.length,
        width: null,
        height: null,
        source,
        meta: { ...meta, absolutePath },
      };
      insertAsset(appDb, asset);
      return asset;
    },
    absolutePath(asset) {
      const metaPath = asset?.meta?.absolutePath;
      if (metaPath && existsSync(metaPath)) return metaPath;
      if (asset?.kind === "processed") return join(processedDir, asset.filename);
      return join(originalsDir, asset.filename);
    },
    read(asset) {
      return readFileSync(this.absolutePath(asset));
    },
  };
}

function insertAsset(appDb, asset) {
  const timestamp = now();
  appDb.run(
    `INSERT INTO assets
      (id, parent_asset_id, kind, role, title, mime_type, filename, url, bytes, width, height, source, meta_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      asset.id,
      asset.parentAssetId || null,
      asset.kind,
      asset.role,
      asset.title || "",
      asset.mimeType,
      asset.filename,
      asset.url,
      asset.bytes,
      asset.width || null,
      asset.height || null,
      asset.source,
      JSON.stringify(asset.meta || {}),
      timestamp,
      timestamp,
    ],
  );
}

function hydrateAsset(row) {
  const { metaJson, ...asset } = row;
  return {
    ...asset,
    meta: publicMeta(parseJson(row.metaJson, {})),
  };
}

function publicMeta(meta) {
  const { absolutePath: _absolutePath, ...safe } = meta || {};
  return safe;
}

function extensionFor(name = "", mime = "") {
  const fromName = extname(name).toLowerCase();
  if (fromName && /^[.][a-z0-9]+$/.test(fromName)) return fromName;
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  return ".bin";
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseJson(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

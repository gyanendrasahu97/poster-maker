export async function removeBackgroundWithRembg({ rembgUrl, imageBytes, filename, mimeType, options = {} }) {
  if (!rembgUrl) {
    throw Object.assign(new Error("Background removal service unavailable. REMBG_URL is not configured."), { status: 503 });
  }
  const endpoint = `${String(rembgUrl).replace(/\/$/, "")}/remove-background`;
  const form = new FormData();
  form.append("image", new Blob([imageBytes], { type: mimeType || "application/octet-stream" }), filename || "image.png");
  form.append("model", options.model || "u2net");
  form.append("trim", String(options.trim ?? true));
  form.append("alphaMatting", String(options.alphaMatting ?? false));
  if (options.foregroundThreshold !== undefined) form.append("foregroundThreshold", String(options.foregroundThreshold));
  if (options.backgroundThreshold !== undefined) form.append("backgroundThreshold", String(options.backgroundThreshold));
  if (options.erodeSize !== undefined) form.append("erodeSize", String(options.erodeSize));

  const response = await fetch(endpoint, { method: "POST", body: form });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw Object.assign(new Error(message || `rembg service failed with HTTP ${response.status}`), { status: response.status });
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function checkRembgHealth(rembgUrl) {
  if (!rembgUrl) return { ok: false, configured: false, error: "REMBG_URL is not configured" };
  try {
    const response = await fetch(`${String(rembgUrl).replace(/\/$/, "")}/health`);
    const payload = await response.json().catch(() => ({}));
    return { configured: true, ok: response.ok && payload.ok !== false, ...payload };
  } catch (error) {
    return { configured: true, ok: false, error: error instanceof Error ? error.message : "rembg health failed" };
  }
}

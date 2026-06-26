const now = () => new Date().toISOString();

export function listPromptTemplates(appDb) {
  return appDb.all(`
    SELECT id, name, type, status, active_version_id AS activeVersionId, description, created_at AS createdAt, updated_at AS updatedAt
    FROM prompt_templates
    ORDER BY type, name
  `);
}

export function listPromptBlocks(appDb) {
  return appDb.all(`
    SELECT id, name, category, status, locked, content, version, created_at AS createdAt, updated_at AS updatedAt
    FROM prompt_blocks
    ORDER BY category, name
  `);
}

export function listFlows(appDb) {
  return appDb.all(`
    SELECT id, name, status, active_version_id AS activeVersionId, created_at AS createdAt, updated_at AS updatedAt
    FROM flows
    ORDER BY name
  `);
}

export function resolvePrompt(appDb, options) {
  const templateId = options.templateId || "base_music_poster";
  const template = appDb.get(
    `SELECT id, name, type, active_version_id AS activeVersionId FROM prompt_templates WHERE id = ?`,
    [templateId],
  );
  if (!template) throw new Error(`Prompt template not found: ${templateId}`);

  const version = appDb.get(
    `SELECT id, template_id AS templateId, version, content, variables_json AS variablesJson, required_blocks_json AS requiredBlocksJson
     FROM prompt_versions
     WHERE id = ?`,
    [template.activeVersionId],
  );
  if (!version) throw new Error(`Active prompt version missing for template: ${templateId}`);

  const requiredBlockIds = readJson(version.requiredBlocksJson, []);
  const requiredBlocks = requiredBlockIds
    .map((id) =>
      appDb.get(
        `SELECT id, name, category, locked, content, version FROM prompt_blocks WHERE id = ? AND status = 'active'`,
        [id],
      ),
    )
    .filter(Boolean);

  const presetBlocks = resolvePresetBlocks(appDb, options.presetIds || [], options.workflow || template.type);
  const variables = {
    lockedBlocks: formatBlocks(requiredBlocks),
    presetBlocks: formatBlocks(presetBlocks.promptBlocks),
    workflowContext: options.workflowContext || "",
    basePrompt: options.basePrompt || "",
    customInstruction: options.customInstruction || "No extra user override.",
    outputRule: options.outputRule || "Return one complete high-quality image.",
    ...(options.variables || {}),
  };

  const resolvedPrompt = interpolate(version.content, variables).trim();
  const resolvedNegativePrompt = [options.negativePrompt || "", formatBlocks(presetBlocks.negativeBlocks)].filter(Boolean).join("\n").trim();

  return {
    prompt: resolvedPrompt,
    negativePrompt: resolvedNegativePrompt,
    meta: {
      templateId: template.id,
      templateName: template.name,
      templateVersionId: version.id,
      templateVersion: version.version,
      promptBlockVersionIds: [...requiredBlocks, ...presetBlocks.promptBlocks, ...presetBlocks.negativeBlocks].map(
        (block) => `${block.id}@${block.version}`,
      ),
      workflow: options.workflow || template.type,
      resolvedAt: now(),
    },
  };
}

export function logGenerationRun(appDb, run) {
  const id = run.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  appDb.run(
    `INSERT INTO generation_runs
      (id, project_id, workflow, provider, model, template_version_ids_json, prompt_block_version_ids_json,
       resolved_prompt, resolved_negative_prompt, input_asset_ids_json, output_asset_ids_json, status, error, created_at, finished_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      run.projectId || null,
      run.workflow || "generation",
      run.provider || "",
      run.model || "",
      JSON.stringify(run.templateVersionIds || []),
      JSON.stringify(run.promptBlockVersionIds || []),
      run.prompt || "",
      run.negativePrompt || "",
      JSON.stringify(run.inputAssetIds || []),
      JSON.stringify(run.outputAssetIds || []),
      run.status || "done",
      run.error || null,
      run.createdAt || now(),
      run.finishedAt || now(),
    ],
  );
  return id;
}

function resolvePresetBlocks(appDb, presetIds, workflow) {
  const promptBlockIds = [];
  const negativeBlockIds = [];
  for (const presetId of presetIds.filter(Boolean)) {
    const row = appDb.get(
      `SELECT prompt_block_ids_json AS promptIds, negative_block_ids_json AS negativeIds
       FROM preset_prompt_mappings
       WHERE preset_id = ? AND workflow = ?`,
      [presetId, workflow],
    );
    if (!row) continue;
    promptBlockIds.push(...readJson(row.promptIds, []));
    negativeBlockIds.push(...readJson(row.negativeIds, []));
  }
  return {
    promptBlocks: loadBlocks(appDb, [...new Set(promptBlockIds)]),
    negativeBlocks: loadBlocks(appDb, [...new Set(negativeBlockIds)]),
  };
}

function loadBlocks(appDb, ids) {
  return ids
    .map((id) =>
      appDb.get(
        `SELECT id, name, category, locked, content, version FROM prompt_blocks WHERE id = ? AND status = 'active'`,
        [id],
      ),
    )
    .filter(Boolean);
}

function formatBlocks(blocks) {
  if (!blocks.length) return "No additional blocks.";
  return blocks.map((block) => `- ${block.name}: ${block.content}`).join("\n");
}

function interpolate(template, variables) {
  return String(template || "").replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (_match, key) => {
    const value = variables[key];
    return value === undefined || value === null || value === "" ? "" : String(value);
  });
}

function readJson(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

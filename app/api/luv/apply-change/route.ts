import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { createClient } from '@/lib/supabase-server';

// Allowed root keys for soul/chassis data mutations
const ALLOWED_SOUL_ROOTS = new Set([
  'personality', 'voice', 'rules', 'skills', 'background',
  'system_prompt_override', 'facets',
]);
const ALLOWED_CHASSIS_ROOTS = new Set([
  'face', 'body', 'coloring', 'age_appearance', 'distinguishing_features',
  'hair', 'eyes', 'skin', 'skeletal', 'mouth', 'nose', 'body_proportions',
]);

interface SoulChassisProposal {
  type: 'soul_change_proposal' | 'chassis_change_proposal';
  characterId: string;
  field: string;
  path: string;
  proposedValue: unknown;
}

interface ModuleProposal {
  type: 'module_change_proposal';
  moduleId: string;
  moduleSlug: string;
  parameterKey: string;
  proposedValue: unknown;
}

interface BatchModuleProposal {
  type: 'batch_module_change_proposal';
  moduleId: string;
  moduleSlug: string;
  changes: {
    parameterKey: string;
    proposedValue: unknown;
  }[];
  overallReason: string;
}

interface FacetProposal {
  type: 'facet_change_proposal';
  characterId: string;
  action: 'add' | 'update' | 'remove';
  facet: {
    key: string;
    label: string;
    type: 'text' | 'tags' | 'key_value';
    layer: string;
    content: unknown;
    description?: string;
  };
}

type ChangeProposal = SoulChassisProposal | ModuleProposal | BatchModuleProposal | FacetProposal;

/** Infer a basic parameter_schema entry from a key and value */
function inferSchemaEntry(key: string, value: unknown): { key: string; label: string; type: string; tier: string } {
  const label = key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  let type = 'text';
  if (typeof value === 'number') type = 'number';
  else if (typeof value === 'boolean') type = 'boolean';
  else if (typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value)) type = 'color';
  else if (typeof value === 'object' && value !== null) type = 'json';

  return { key, label, type, tier: 'advanced' };
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const proposal = (await request.json()) as ChangeProposal;

  if (!proposal.type) {
    return NextResponse.json(
      { error: 'Invalid proposal: missing type' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Module change proposal — update chassis module parameters
  if (proposal.type === 'module_change_proposal') {
    const { moduleId, parameterKey, proposedValue } = proposal;
    if (!moduleId || !parameterKey) {
      return NextResponse.json(
        { error: 'Invalid module proposal: missing moduleId or parameterKey' },
        { status: 400 }
      );
    }

    const { data: mod, error: fetchError } = await (supabase as any)
      .from('luv_chassis_modules')
      .select('id, parameters, parameter_schema, current_version')
      .eq('id', moduleId)
      .single();

    if (fetchError || !mod) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }

    const updatedParams = {
      ...(mod.parameters as Record<string, unknown>),
      [parameterKey]: proposedValue,
    };
    const newVersion = (mod.current_version as number) + 1;

    // Auto-append schema entry if this is a new parameter
    const schema = Array.isArray(mod.parameter_schema) ? [...mod.parameter_schema] : [];
    const hasSchemaEntry = schema.some((s: { key: string }) => s.key === parameterKey);
    if (!hasSchemaEntry) {
      schema.push(inferSchemaEntry(parameterKey, proposedValue));
    }

    // Update module parameters (and schema if new param added)
    const updatePayload: Record<string, unknown> = {
      parameters: updatedParams,
      current_version: newVersion,
    };
    if (!hasSchemaEntry) {
      updatePayload.parameter_schema = schema;
    }
    const { error: updateError } = await (supabase as any)
      .from('luv_chassis_modules')
      .update(updatePayload)
      .eq('id', moduleId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update module' },
        { status: 500 }
      );
    }

    // Create version snapshot
    await (supabase as any)
      .from('luv_chassis_module_versions')
      .insert({
        module_id: moduleId,
        version: newVersion,
        parameters: updatedParams,
        change_summary: `Chat: updated ${parameterKey}`,
      });

    return NextResponse.json({
      success: true,
      moduleId,
      parameterKey,
      version: newVersion,
    });
  }

  // Batch module change proposal — update multiple parameters at once
  if (proposal.type === 'batch_module_change_proposal') {
    const { moduleId, changes } = proposal as BatchModuleProposal;
    if (!moduleId || !changes || changes.length === 0) {
      return NextResponse.json(
        { error: 'Invalid batch proposal: missing moduleId or changes' },
        { status: 400 }
      );
    }

    const { data: mod, error: fetchError } = await (supabase as any)
      .from('luv_chassis_modules')
      .select('id, parameters, parameter_schema, current_version')
      .eq('id', moduleId)
      .single();

    if (fetchError || !mod) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }

    const updatedParams = {
      ...(mod.parameters as Record<string, unknown>),
    };
    const schema = Array.isArray(mod.parameter_schema) ? [...mod.parameter_schema] : [];
    const existingKeys = new Set(schema.map((s: { key: string }) => s.key));
    let schemaChanged = false;

    for (const c of changes) {
      updatedParams[c.parameterKey] = c.proposedValue;
      if (!existingKeys.has(c.parameterKey)) {
        schema.push(inferSchemaEntry(c.parameterKey, c.proposedValue));
        schemaChanged = true;
      }
    }
    const newVersion = (mod.current_version as number) + 1;

    const updatePayload: Record<string, unknown> = {
      parameters: updatedParams,
      current_version: newVersion,
    };
    if (schemaChanged) {
      updatePayload.parameter_schema = schema;
    }
    const { error: updateError } = await (supabase as any)
      .from('luv_chassis_modules')
      .update(updatePayload)
      .eq('id', moduleId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update module' },
        { status: 500 }
      );
    }

    const changedKeys = changes.map((c) => c.parameterKey).join(', ');
    await (supabase as any)
      .from('luv_chassis_module_versions')
      .insert({
        module_id: moduleId,
        version: newVersion,
        parameters: updatedParams,
        change_summary: `Chat batch: updated ${changedKeys}`,
      });

    return NextResponse.json({
      success: true,
      moduleId,
      changedKeys,
      version: newVersion,
    });
  }

  // Facet change proposal — add/update/remove soul facets
  if (proposal.type === 'facet_change_proposal') {
    const { characterId, action, facet } = proposal as FacetProposal;
    if (!characterId || !facet?.key) {
      return NextResponse.json(
        { error: 'Invalid facet proposal: missing characterId or facet key' },
        { status: 400 }
      );
    }

    const { data: character, error: fetchError } = await (supabase as any)
      .from('luv_character')
      .select('id, soul_data, version')
      .eq('id', characterId)
      .single();

    if (fetchError || !character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    const soulData = { ...(character.soul_data as Record<string, unknown>) };
    const facets = Array.isArray(soulData.facets) ? [...(soulData.facets as Array<Record<string, unknown>>)] : [];

    if (action === 'add') {
      if (facets.some((f) => f.key === facet.key)) {
        return NextResponse.json(
          { error: `Facet "${facet.key}" already exists` },
          { status: 409 }
        );
      }
      facets.push(facet);
    } else if (action === 'update') {
      const idx = facets.findIndex((f) => f.key === facet.key);
      if (idx === -1) {
        return NextResponse.json(
          { error: `Facet "${facet.key}" not found` },
          { status: 404 }
        );
      }
      facets[idx] = facet;
    } else if (action === 'remove') {
      const idx = facets.findIndex((f) => f.key === facet.key);
      if (idx === -1) {
        return NextResponse.json(
          { error: `Facet "${facet.key}" not found` },
          { status: 404 }
        );
      }
      facets.splice(idx, 1);
    }

    soulData.facets = facets;
    const newVersion = (character.version as number) + 1;

    const { error: updateError } = await (supabase as any)
      .from('luv_character')
      .update({ soul_data: soulData, version: newVersion })
      .eq('id', characterId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to apply facet change' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      action,
      facetKey: facet.key,
      version: newVersion,
    });
  }

  // Soul/Chassis change proposal — update character data
  if (!proposal.characterId || !proposal.field) {
    return NextResponse.json(
      { error: 'Invalid proposal: missing characterId or field' },
      { status: 400 }
    );
  }

  const dataColumn =
    proposal.type === 'soul_change_proposal' ? 'soul_data' : 'chassis_data';

  const { data: character, error: fetchError } = await (supabase as any)
    .from('luv_character')
    .select(`id, ${dataColumn}, version`)
    .eq('id', proposal.characterId)
    .single();

  if (fetchError || !character) {
    return NextResponse.json(
      { error: 'Character not found' },
      { status: 404 }
    );
  }

  const currentData = { ...(character[dataColumn] as Record<string, unknown>) };
  const pathParts = proposal.path.split('.');

  // Validate root key against allow-list
  const rootKey = pathParts[0];
  const allowedRoots = dataColumn === 'soul_data' ? ALLOWED_SOUL_ROOTS : ALLOWED_CHASSIS_ROOTS;
  if (!allowedRoots.has(rootKey)) {
    return NextResponse.json(
      { error: `Invalid path root: "${rootKey}"` },
      { status: 400 }
    );
  }

  if (pathParts.length === 1) {
    currentData[pathParts[0]] = proposal.proposedValue;
  } else {
    let cursor = currentData;
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!cursor[pathParts[i]] || typeof cursor[pathParts[i]] !== 'object') {
        cursor[pathParts[i]] = {};
      }
      cursor = cursor[pathParts[i]] as Record<string, unknown>;
    }
    cursor[pathParts[pathParts.length - 1]] = proposal.proposedValue;
  }

  const newVersion = (character.version as number) + 1;
  const { data: updated, error: updateError } = await (supabase as any)
    .from('luv_character')
    .update({
      [dataColumn]: currentData,
      version: newVersion,
    })
    .eq('id', proposal.characterId)
    .eq('version', character.version) // Optimistic lock — fails if version changed
    .select('id')
    .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to apply change' },
      { status: 500 }
    );
  }

  if (!updated) {
    return NextResponse.json(
      { error: 'Conflict: character was modified concurrently. Please retry.' },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, path: proposal.path });
}

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { createClient } from '@/lib/supabase-server';

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

type ChangeProposal = SoulChassisProposal | ModuleProposal | BatchModuleProposal;

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
      .select('id, parameters, current_version')
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

    // Update module parameters
    const { error: updateError } = await (supabase as any)
      .from('luv_chassis_modules')
      .update({ parameters: updatedParams, current_version: newVersion })
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
      .select('id, parameters, current_version')
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
    for (const c of changes) {
      updatedParams[c.parameterKey] = c.proposedValue;
    }
    const newVersion = (mod.current_version as number) + 1;

    const { error: updateError } = await (supabase as any)
      .from('luv_chassis_modules')
      .update({ parameters: updatedParams, current_version: newVersion })
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

  const { error: updateError } = await (supabase as any)
    .from('luv_character')
    .update({
      [dataColumn]: currentData,
      version: (character.version as number) + 1,
    })
    .eq('id', proposal.characterId);

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to apply change' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, path: proposal.path });
}

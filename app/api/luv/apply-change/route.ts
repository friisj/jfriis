import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { createClient } from '@/lib/supabase-server';

interface ChangeProposal {
  type: 'soul_change_proposal' | 'chassis_change_proposal';
  characterId: string;
  field: string;
  path: string;
  proposedValue: unknown;
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const proposal = (await request.json()) as ChangeProposal;

  if (!proposal.characterId || !proposal.field || !proposal.type) {
    return NextResponse.json(
      { error: 'Invalid proposal: missing characterId, field, or type' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const dataColumn =
    proposal.type === 'soul_change_proposal' ? 'soul_data' : 'chassis_data';

  // Fetch current data (luv_character not in generated types)
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

  // Apply the change at the specified path
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

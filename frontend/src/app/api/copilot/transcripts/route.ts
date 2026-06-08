import { NextResponse } from 'next/server';

type TranscriptPayload = {
  source?: string;
  context?: Record<string, unknown>;
  transcript?: {
    id?: string;
    total?: number;
    completed?: number;
    failed?: number;
    aborted?: boolean;
    stopOnFailure?: boolean;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TranscriptPayload;
    const transcriptId = body?.transcript?.id;

    if (!transcriptId) {
      return NextResponse.json({ ok: false, error: 'Missing transcript.id' }, { status: 400 });
    }

    console.info(JSON.stringify({
      ts: new Date().toISOString(),
      category: 'frontend',
      action: 'copilot_transcript_ingested',
      severity: 'info',
      details: {
        source: body.source || 'unknown',
        transcriptId,
        total: body.transcript?.total ?? 0,
        completed: body.transcript?.completed ?? 0,
        failed: body.transcript?.failed ?? 0,
        aborted: Boolean(body.transcript?.aborted),
        stopOnFailure: body.transcript?.stopOnFailure ?? true,
      },
    }));

    return NextResponse.json({ ok: true, transcriptId });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Invalid transcript payload',
      },
      { status: 400 },
    );
  }
}

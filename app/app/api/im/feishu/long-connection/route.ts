import { NextResponse } from 'next/server';
import { getPlatformConfig } from '@/lib/im/config';
import { getFeishuWSClientStatus, startFeishuWSClient, stopFeishuWSClient } from '@/lib/im/feishu-ws-client';

export async function GET() {
  return NextResponse.json({ ok: true, status: getFeishuWSClientStatus() });
}

export async function POST() {
  try {
    const config = getPlatformConfig('feishu');
    if (!config) {
      return NextResponse.json({ ok: false, error: 'Feishu is not configured' }, { status: 422 });
    }

    await startFeishuWSClient(config);
    return NextResponse.json({ ok: true, status: getFeishuWSClientStatus() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to start Feishu long connection' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  stopFeishuWSClient();
  return NextResponse.json({ ok: true, status: getFeishuWSClientStatus() });
}

import { NextRequest, NextResponse } from 'next/server';
import { readIMConfig, writeIMConfig, validatePlatformConfig } from '@/lib/im/config';
import type { IMPlatform } from '@/lib/im/types';

/** GET — return raw config (with secrets masked) */
export async function GET() {
  try {
    const config = readIMConfig();
    // Mask secret values for display
    const masked: Record<string, Record<string, string>> = {};
    for (const [platform, creds] of Object.entries(config.providers)) {
      if (!creds || typeof creds !== 'object') continue;
      const m: Record<string, string> = {};
      for (const [key, val] of Object.entries(creds as Record<string, string>)) {
        if (typeof val === 'string' && val.length > 4) {
          m[key] = val.slice(0, 4) + '••••' + val.slice(-2);
        } else {
          m[key] = typeof val === 'string' ? '••••' : '';
        }
      }
      masked[platform] = m;
    }
    return NextResponse.json({ providers: masked });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 });
  }
}

/** PUT — save config for a specific platform */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { platform, credentials } = body as { platform: string; credentials: Record<string, string> };

    if (!platform || !credentials || typeof credentials !== 'object') {
      return NextResponse.json({ error: 'Missing platform or credentials' }, { status: 400 });
    }

    // Validate before saving
    const validation = validatePlatformConfig(platform as IMPlatform, credentials);
    if (!validation.valid) {
      return NextResponse.json({
        error: `Invalid config: missing ${validation.missing?.join(', ')}`,
        missing: validation.missing,
      }, { status: 422 });
    }

    // Read current config, merge, write
    const config = readIMConfig();
    (config.providers as Record<string, unknown>)[platform] = credentials;
    writeIMConfig(config);

    return NextResponse.json({ ok: true, platform });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save' }, { status: 500 });
  }
}

/** DELETE — remove a platform's config */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform');
    if (!platform) {
      return NextResponse.json({ error: 'Missing platform parameter' }, { status: 400 });
    }

    const config = readIMConfig();
    delete (config.providers as Record<string, unknown>)[platform];
    writeIMConfig(config);

    return NextResponse.json({ ok: true, platform });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete' }, { status: 500 });
  }
}

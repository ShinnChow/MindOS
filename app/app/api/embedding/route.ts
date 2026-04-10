export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { handleRouteErrorSimple } from '@/lib/errors';
import {
  isLocalModelDownloaded,
  downloadLocalModel,
  isOnnxRuntimeAvailable,
  installOnnxRuntime,
  getOnnxInstallState,
  DEFAULT_LOCAL_MODEL,
  LOCAL_MODEL_OPTIONS,
} from '@/lib/core/embedding-provider';
import { getEmbeddingStatus } from '@/lib/core/hybrid-search';

/**
 * GET /api/embedding — Check local model + runtime status.
 * Returns: { downloaded, onnxAvailable, downloading, modelId, models[], status }
 */
export async function GET() {
  try {
    const [downloaded, onnxAvailable] = await Promise.all([
      isLocalModelDownloaded(),
      isOnnxRuntimeAvailable(),
    ]);
    const status = getEmbeddingStatus();
    const installState = getOnnxInstallState();
    return NextResponse.json({
      downloaded,
      onnxAvailable,
      onnxInstalling: installState.installing,
      onnxInstallError: installState.error,
      defaultModel: DEFAULT_LOCAL_MODEL,
      models: LOCAL_MODEL_OPTIONS,
      ...status,
    });
  } catch (err) {
    return handleRouteErrorSimple(err);
  }
}

// Track download state
let _downloading = false;
let _downloadError: string | null = null;

/**
 * POST /api/embedding — Actions for local embedding setup.
 * Body: { action: "download" | "status" | "install-runtime", model?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { action: string; model?: string };

    // ── Install onnxruntime-node on demand ──
    if (body.action === 'install-runtime') {
      const installState = getOnnxInstallState();
      if (installState.installing) {
        return NextResponse.json({ ok: false, error: 'Installation already in progress' });
      }

      // Fire async install — don't block the response
      installOnnxRuntime().catch(() => {});

      return NextResponse.json({ ok: true, message: 'Installing inference runtime...' });
    }

    // ── Check install + download status ──
    if (body.action === 'status') {
      const downloaded = await isLocalModelDownloaded(body.model);
      const onnxAvailable = await isOnnxRuntimeAvailable();
      const installState = getOnnxInstallState();
      return NextResponse.json({
        downloading: _downloading,
        downloaded,
        error: _downloadError,
        onnxAvailable,
        onnxInstalling: installState.installing,
        onnxInstallError: installState.error,
      });
    }

    // ── Download embedding model ──
    if (body.action === 'download') {
      if (_downloading) {
        return NextResponse.json({ ok: false, error: 'Download already in progress' });
      }

      const modelId = body.model || DEFAULT_LOCAL_MODEL;
      _downloading = true;
      _downloadError = null;

      // Run download async — don't block the response
      downloadLocalModel(modelId)
        .then(ok => {
          _downloading = false;
          if (!ok) _downloadError = 'Download failed';
        })
        .catch(err => {
          _downloading = false;
          _downloadError = err instanceof Error ? err.message : 'Unknown error';
        });

      return NextResponse.json({ ok: true, message: `Downloading ${modelId}...` });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return handleRouteErrorSimple(err);
  }
}

/**
 * MindOS API client for mobile.
 * Communicates with the MindOS web server over HTTP.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  FileNode,
  SearchResult,
  HealthResponse,
  ConnectResponse,
  FileSaveResponse,
} from './types';

const STORAGE_KEY = 'mindos_server_url';
const DEFAULT_TIMEOUT = 15_000;

class MindOSClient {
  private _baseUrl = '';

  get baseUrl() {
    return this._baseUrl;
  }

  get isConnected() {
    return this._baseUrl.length > 0;
  }

  /** Load saved server URL from storage. Call once on app start. */
  async init(): Promise<boolean> {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      this._baseUrl = saved;
      return true;
    }
    return false;
  }

  /** Set and persist the server URL. */
  async setServer(url: string): Promise<void> {
    this._baseUrl = url.replace(/\/+$/, '');
    await AsyncStorage.setItem(STORAGE_KEY, this._baseUrl);
  }

  /** Clear the saved server URL. */
  async disconnect(): Promise<void> {
    this._baseUrl = '';
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  // ---------------------------------------------------------------------------
  // Health & discovery
  // ---------------------------------------------------------------------------

  async health(): Promise<HealthResponse | null> {
    try {
      const res = await this.fetch('/api/health', { timeout: 5000 });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async getConnectInfo(): Promise<ConnectResponse | null> {
    try {
      const res = await this.fetch('/api/connect');
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Files
  // ---------------------------------------------------------------------------

  async getFileTree(): Promise<FileNode[]> {
    const res = await this.fetch('/api/files');
    if (!res.ok) throw new ApiError(res.status, 'Failed to load files');
    const data = await res.json();
    return data.tree ?? data;
  }

  async getFileContent(path: string): Promise<{ content: string; mtime?: number }> {
    const res = await this.fetch(`/api/file?path=${enc(path)}&op=read_file`);
    if (!res.ok) throw new ApiError(res.status, `Failed to read ${path}`);
    return res.json();
  }

  async saveFile(
    path: string,
    content: string,
    expectedMtime?: number,
  ): Promise<FileSaveResponse> {
    const res = await this.fetch('/api/file', {
      method: 'POST',
      body: JSON.stringify({
        op: 'save_file',
        path,
        content,
        expectedMtime,
      }),
    });
    const data = await res.json();
    if (res.status === 409) return { ok: false, error: 'conflict', serverMtime: data.serverMtime };
    if (!res.ok) throw new ApiError(res.status, data.error || 'Save failed');
    return { ok: true, mtime: data.mtime };
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async search(query: string): Promise<SearchResult[]> {
    const res = await this.fetch(`/api/search?q=${enc(query)}`);
    if (!res.ok) throw new ApiError(res.status, 'Search failed');
    const data = await res.json();
    return data.results ?? data;
  }

  // ---------------------------------------------------------------------------
  // Internal fetch wrapper
  // ---------------------------------------------------------------------------

  private fetch(
    path: string,
    opts: { method?: string; body?: string; timeout?: number } = {},
  ): Promise<Response> {
    const { method = 'GET', body, timeout = DEFAULT_TIMEOUT } = opts;
    const headers: Record<string, string> = {};
    if (body) headers['Content-Type'] = 'application/json';

    return fetch(`${this._baseUrl}${path}`, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(timeout),
    });
  }
}

function enc(s: string) {
  return encodeURIComponent(s);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Singleton API client */
export const mindosClient = new MindOSClient();

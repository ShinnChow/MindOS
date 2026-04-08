'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Inbox,
  Sparkles,
  FileText,
  Table,
  AlertCircle,
  Loader2,
  Upload,
  FolderInput,
  Check,
  Clock,
  ChevronDown,
  X,
  ExternalLink,
  Copy,
  Trash2,
  ArrowLeft,
  History,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { useLocale } from '@/lib/stores/locale-store';
import { encodePath } from '@/lib/utils';
import { quickDropToInbox } from '@/lib/inbox-upload';
import { loadHistory, type OrganizeHistoryEntry, type OrganizeSource } from '@/lib/organize-history';

interface InboxFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
  isAging: boolean;
}

const HISTORY_VISIBLE = 5;

export default function InboxView() {
  const { t } = useLocale();
  const router = useRouter();
  const [files, setFiles] = useState<InboxFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizing, setOrganizing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<OrganizeHistoryEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.files)) setFiles(data.files);
    } catch (err) {
      console.warn('[InboxView] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshHistory = useCallback(() => {
    setHistory(loadHistory());
  }, []);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const debouncedRefresh = useCallback(() => {
    clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      fetchInbox();
      refreshHistory();
    }, 80);
  }, [fetchInbox, refreshHistory]);

  useEffect(() => {
    fetchInbox();
    refreshHistory();

    const onOrganizeDone = () => { setOrganizing(false); debouncedRefresh(); };
    const resetDrag = () => { dragCounterRef.current = 0; setDragOver(false); };

    window.addEventListener('mindos:files-changed', debouncedRefresh);
    window.addEventListener('mindos:inbox-updated', debouncedRefresh);
    window.addEventListener('mindos:organize-done', onOrganizeDone);
    window.addEventListener('mindos:organize-history-update', refreshHistory);
    window.addEventListener('drop', resetDrag, true);
    window.addEventListener('dragend', resetDrag, true);
    return () => {
      clearTimeout(refreshTimerRef.current);
      window.removeEventListener('mindos:files-changed', debouncedRefresh);
      window.removeEventListener('mindos:inbox-updated', debouncedRefresh);
      window.removeEventListener('mindos:organize-done', onOrganizeDone);
      window.removeEventListener('mindos:organize-history-update', refreshHistory);
      window.removeEventListener('drop', resetDrag, true);
      window.removeEventListener('dragend', resetDrag, true);
    };
  }, [fetchInbox, debouncedRefresh, refreshHistory]);

  const handleOrganize = useCallback(() => {
    if (files.length === 0 || organizing) return;
    setOrganizing(true);
    window.dispatchEvent(
      new CustomEvent('mindos:inbox-organize', { detail: { files } }),
    );
  }, [files, organizing]);

  const handleDeleteFile = useCallback(async (name: string) => {
    try {
      const res = await fetch('/api/inbox', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: [name] }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setFiles(prev => prev.filter(f => f.name !== name));
      window.dispatchEvent(new Event('mindos:inbox-updated'));
      toast.success(t.inbox.fileRemoved);
    } catch {
      toast.error(t.inbox.fileRemoveFailed);
    }
  }, [t]);

  const handleUpload = useCallback((selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    quickDropToInbox(Array.from(selected), t);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      quickDropToInbox(Array.from(e.dataTransfer.files), t);
    }
  }, [t]);

  const agingCount = useMemo(() => files.filter(f => f.isAging).length, [files]);
  const hasFiles = files.length > 0;
  const visibleHistory = useMemo(() => history.slice(0, HISTORY_VISIBLE), [history]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="sticky top-[52px] md:top-0 z-20 border-b border-border px-4 md:px-6 py-3 bg-background">
          <div className="max-w-[780px] mx-auto">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 px-4 md:px-6 py-8">
          <div className="max-w-[780px] mx-auto space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md,.txt,.csv,.json,.pdf"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {/* ─── Sticky Top Bar ─── */}
      <div className="sticky top-[52px] md:top-0 z-20 border-b border-border bg-background">
        <div className="max-w-[780px] mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Back */}
            <button
              onClick={() => router.push('/wiki')}
              className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>

            {/* Title area */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--amber-subtle)] text-[var(--amber)]">
                <Inbox size={15} />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-foreground tracking-tight leading-tight">
                  {t.inbox.title}
                </h1>
                {hasFiles && (
                  <p className="text-2xs text-muted-foreground/60 leading-tight mt-0.5">
                    {files.length} {files.length === 1 ? 'file' : 'files'}
                    {agingCount > 0 && (
                      <span className="text-[var(--amber)]/70"> · {agingCount} {t.inbox.agingHint}</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                title={t.inbox.uploadButton}
              >
                <Upload size={13} />
                <span className="hidden sm:inline">{t.inbox.uploadButton}</span>
              </button>
              {hasFiles && (
                <button
                  onClick={handleOrganize}
                  disabled={organizing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all bg-[var(--amber)] text-[var(--amber-foreground)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={organizing ? t.inbox.organizing : t.inbox.organizeButton}
                >
                  {organizing ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>{organizing ? t.inbox.organizing : t.inbox.organizeButton}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 px-4 md:px-6 py-6">
        <div className="max-w-[780px] mx-auto">

          {/* ─── Drop Zone ─── */}
          <div
            className={`rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer mb-6 ${
              dragOver
                ? 'border-[var(--amber)] bg-[var(--amber-subtle)] scale-[1.01]'
                : hasFiles
                  ? 'border-border/50 hover:border-[var(--amber)]/40 px-4 py-4'
                  : 'border-border hover:border-[var(--amber)]/40 px-4 py-10'
            } ${dragOver ? 'px-4 py-6' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={t.inbox.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragEnter={(e) => {
              if (!e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              e.stopPropagation();
              dragCounterRef.current++;
              if (dragCounterRef.current === 1) setDragOver(true);
            }}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
              if (dragCounterRef.current === 0) setDragOver(false);
            }}
            onDrop={handleDrop}
          >
            {hasFiles ? (
              <div className="flex items-center justify-center gap-2 text-center">
                <FolderInput size={16} className={`shrink-0 ${dragOver ? 'text-[var(--amber)]' : 'text-muted-foreground/30'}`} />
                <p className="text-xs text-muted-foreground/60">
                  {t.fileImport.dropzoneCompact}{' '}
                  <span className="text-[var(--amber)] hover:underline">{t.fileImport.dropzoneCompactButton}</span>
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--amber-subtle)]">
                  <FolderInput size={24} className={dragOver ? 'text-[var(--amber)]' : 'text-[var(--amber)]/40'} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground/70">
                    {t.inbox.emptyTitle}
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    {t.inbox.emptyDesc}
                  </p>
                </div>
                <p className="text-2xs text-muted-foreground/30">{t.inbox.dropOverlayFormats}</p>
              </div>
            )}
          </div>

          {/* ─── File List ─── */}
          {hasFiles && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xs font-medium text-muted-foreground/50 uppercase tracking-wider">
                  {t.inbox.title}
                </span>
                <span className="text-2xs text-muted-foreground/40 tabular-nums">
                  {t.inbox.count(files.length)}
                </span>
              </div>
              <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/50">
                {files.map((file) => (
                  <InboxFileRow
                    key={file.path}
                    file={file}
                    onDelete={handleDeleteFile}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── History Section ─── */}
          {visibleHistory.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <History size={12} className="text-muted-foreground/40" />
                <span className="text-2xs font-medium text-muted-foreground/50 uppercase tracking-wider">
                  {t.importHistory.title}
                </span>
                {history.length > HISTORY_VISIBLE && (
                  <Link
                    href="/inbox/history"
                    className="ml-auto text-2xs text-muted-foreground/50 hover:text-[var(--amber)] transition-colors"
                  >
                    {t.inbox.viewAllHistory(history.length)}
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                {visibleHistory.map((entry) => (
                  <HistoryRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          )}

          {/* ─── Empty + No History ─── */}
          {!hasFiles && visibleHistory.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <p className="text-xs text-muted-foreground/40">
                {t.inbox.dropOverlayFormats}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── File Row ─── */

function InboxFileRow({ file, onDelete }: { file: InboxFile; onDelete: (name: string) => void }) {
  const { t } = useLocale();
  const router = useRouter();
  const isCSV = file.name.endsWith('.csv');
  const isPDF = file.name.endsWith('.pdf');
  const age = formatRelativeTime(file.modifiedAt, t.home.relativeTime);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const sizeLabel = formatSize(file.size);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => router.push(`/view/${encodePath(file.path)}`)}
        onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/view/${encodePath(file.path)}`); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
        className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent transition-colors duration-100 cursor-pointer group"
      >
        {/* Status dot */}
        <span
          className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
            file.isAging ? 'bg-[var(--amber)]/50' : 'bg-[var(--amber)]'
          }`}
        />

        {/* File icon */}
        {isCSV ? (
          <Table size={14} className="shrink-0 text-success" />
        ) : isPDF ? (
          <FileText size={14} className="shrink-0 text-[var(--error)]/60" />
        ) : (
          <FileText size={14} className="shrink-0 text-muted-foreground" />
        )}

        {/* File name */}
        <span
          className="text-sm text-foreground truncate flex-1 min-w-0"
          title={file.name}
          suppressHydrationWarning
        >
          {file.name}
        </span>

        {/* Meta — hidden on hover, replaced by delete */}
        <span className="text-2xs text-muted-foreground/40 tabular-nums shrink-0 group-hover:hidden">
          {sizeLabel}
        </span>
        <span className="text-2xs text-muted-foreground/40 tabular-nums shrink-0 group-hover:hidden">
          {age}
        </span>
        {file.isAging && (
          <span title={t.inbox.agingHint} className="group-hover:hidden shrink-0">
            <AlertCircle size={12} className="text-[var(--amber)]/50" />
          </span>
        )}

        {/* Hover: delete */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(file.name); }}
          className="hidden group-hover:flex items-center justify-center w-6 h-6 rounded shrink-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
          title={t.inbox.removeFile}
        >
          <X size={13} />
        </button>
      </div>

      {ctxMenu && (
        <FileContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          file={file}
          onDelete={() => { setCtxMenu(null); onDelete(file.name); }}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );
}

/* ─── Context Menu ─── */

function FileContextMenu({ x, y, file, onDelete, onClose }: {
  x: number; y: number; file: InboxFile; onDelete: () => void; onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [onClose]);

  const adjX = typeof window !== 'undefined' ? Math.min(x, window.innerWidth - 200) : x;
  const adjY = typeof window !== 'undefined' ? Math.min(y, window.innerHeight - 120) : y;
  const itemCls = 'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors text-left';

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] bg-card border border-border rounded-lg shadow-lg py-1"
      style={{ top: adjY, left: adjX }}
    >
      <button className={itemCls} onClick={() => { router.push(`/view/${encodePath(file.path)}`); onClose(); }}>
        <ExternalLink size={14} className="shrink-0" /> {t.inbox.openFile}
      </button>
      <button className={itemCls} onClick={() => { navigator.clipboard.writeText(file.name); toast.copy(); onClose(); }}>
        <Copy size={14} className="shrink-0" /> {t.inbox.copyName}
      </button>
      <div className="border-t border-border my-1" />
      <button className={`${itemCls} text-destructive hover:text-destructive`} onClick={onDelete}>
        <Trash2 size={14} className="shrink-0" /> {t.inbox.removeFile}
      </button>
    </div>
  );
}

/* ─── History Row ─── */

function HistoryRow({ entry }: { entry: OrganizeHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isUndone = entry.status === 'undone';
  const sourceBadge = getSourceBadge(entry.source);
  const duration = entry.durationMs ? formatDuration(entry.durationMs) : null;
  const age = formatRelativeTime(new Date(entry.timestamp).toISOString(), {
    justNow: 'just now',
    minutesAgo: (n: number) => `${n}m ago`,
    hoursAgo: (n: number) => `${n}h ago`,
    daysAgo: (n: number) => `${n}d ago`,
  });
  const successCount = entry.files.filter(f => f.ok && !f.undone).length;

  return (
    <div className="rounded-lg border border-border/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-muted/20 transition-colors"
      >
        {isUndone ? (
          <AlertCircle size={13} className="text-muted-foreground/40 shrink-0" />
        ) : (
          <Check size={13} className="text-success/70 shrink-0" />
        )}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className={`text-xs truncate ${isUndone ? 'text-muted-foreground/50 line-through' : 'text-foreground/80'}`}>
            {entry.sourceFiles.length === 1 ? entry.sourceFiles[0] : `${entry.sourceFiles.length} files`}
          </span>
          {sourceBadge && (
            <span className={`text-2xs px-1.5 py-0.5 rounded shrink-0 ${sourceBadge.className}`}>
              {sourceBadge.label}
            </span>
          )}
          {successCount > 0 && (
            <span className="text-2xs text-muted-foreground/40 shrink-0">
              → {successCount} {successCount === 1 ? 'change' : 'changes'}
            </span>
          )}
        </div>
        <span className="text-2xs text-muted-foreground/40 tabular-nums shrink-0">
          {duration && `${duration} · `}{age}
        </span>
        {entry.files.length > 0 && (
          <ChevronDown
            size={10}
            className={`text-muted-foreground/30 shrink-0 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {expanded && entry.files.length > 0 && (
        <div className="border-t border-border/20 px-3.5 py-2 space-y-0.5">
          {entry.files.map((f, idx) => {
            const parts = f.path.split('/');
            const fileName = parts.pop() ?? f.path;
            const dirPath = parts.length > 0 ? parts.join('/') : null;
            const isClickable = !f.undone && f.ok;
            const rowClass = `flex items-center gap-2 py-1 text-2xs${f.undone ? ' opacity-40' : ''}${isClickable ? ' rounded -mx-1 px-1 hover:bg-muted/20 transition-colors' : ''}`;
            const rowContent = (
              <>
                <span className={`w-1 h-1 rounded-full shrink-0 ${f.ok && !f.undone ? 'bg-success/60' : 'bg-muted-foreground/30'}`} />
                <span className={`truncate flex-1 min-w-0 ${f.undone ? 'line-through text-muted-foreground' : ''}`}>
                  {dirPath && <span className="text-muted-foreground/30">{dirPath}/</span>}
                  <span className={f.undone ? '' : 'text-foreground/70'}>{fileName}</span>
                </span>
                <span className="text-muted-foreground/40 shrink-0">
                  {f.undone ? 'undone' : f.action === 'create' ? 'created' : 'updated'}
                </span>
              </>
            );
            return isClickable ? (
              <Link key={`${f.path}-${idx}`} href={`/view/${encodePath(f.path)}`} className={rowClass}>
                {rowContent}
              </Link>
            ) : (
              <div key={`${f.path}-${idx}`} className={rowClass}>
                {rowContent}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */

function getSourceBadge(source?: OrganizeSource): { label: string; className: string } | null {
  switch (source) {
    case 'drag-drop':      return { label: 'drop',   className: 'bg-muted/50 text-muted-foreground/50' };
    case 'inbox-organize': return { label: 'inbox',  className: 'bg-[var(--amber)]/10 text-[var(--amber)]/70' };
    case 'import-modal':   return { label: 'import', className: 'bg-blue-500/10 text-blue-500/70' };
    case 'plugin':         return { label: 'plugin', className: 'bg-violet-500/10 text-violet-500/70' };
    case 'upload':         return { label: 'upload', className: 'bg-teal-500/10 text-teal-500/70' };
    case 'web-clipper':    return { label: 'clip',   className: 'bg-emerald-500/10 text-emerald-500/70' };
    default: return null;
  }
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m${rem > 0 ? `${rem}s` : ''}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface RelativeTimeStrings {
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  daysAgo: (n: number) => string;
}

function formatRelativeTime(isoString: string, rt: RelativeTimeStrings): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return rt.justNow;
  if (minutes < 60) return rt.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rt.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  return rt.daysAgo(days);
}

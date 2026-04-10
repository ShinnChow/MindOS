'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Eye,
  EyeOff,
  Settings2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Inbox,
  Clock3,
} from 'lucide-react';
import { useLocale } from '@/lib/stores/locale-store';
import { getPlatform, type PlatformStatus } from '@/lib/im/platforms';
import type { IMActivity } from '@/lib/im/types';
import { maskForLog } from '@/lib/im/format';

type DetailLoadState = 'loading' | 'ready' | 'error';

function formatRelativeTime(timestamp?: string, fallback?: string) {
  if (!timestamp) return fallback ?? '—';
  const value = new Date(timestamp).getTime();
  if (Number.isNaN(value)) return fallback ?? timestamp;

  const diffMs = Date.now() - value;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return new Date(timestamp).toLocaleString();
}

function ChannelLoadingSkeleton() {
  return (
    <div className="max-w-3xl animate-pulse">
      <div className="h-5 w-28 rounded bg-muted mb-6" />
      <div className="flex items-start gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-36 rounded bg-muted" />
          <div className="h-5 w-24 rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map(index => (
          <div key={index} className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function formatActivityType(type: IMActivity['type'], labels: { test: string; agent: string; manual: string }) {
  switch (type) {
    case 'test':
      return labels.test;
    case 'agent':
      return labels.agent;
    default:
      return labels.manual;
  }
}

function SectionCard({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function AgentsContentChannelDetail({ platformId }: { platformId: string }) {
  const { t, locale } = useLocale();
  const im = t.panels.im;
  const platform = getPlatform(platformId);

  const [loadState, setLoadState] = useState<DetailLoadState>('loading');
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [activities, setActivities] = useState<IMActivity[]>([]);

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conversationEnabled, setConversationEnabled] = useState(false);
  const [conversationTransport, setConversationTransport] = useState<'webhook' | 'long_connection'>('webhook');
  const [conversationEncryptKey, setConversationEncryptKey] = useState('');
  const [conversationVerificationToken, setConversationVerificationToken] = useState('');
  const [conversationPublicBaseUrl, setConversationPublicBaseUrl] = useState('');
  const [conversationAllowMentions, setConversationAllowMentions] = useState(true);
  const [conversationSaving, setConversationSaving] = useState(false);
  const [conversationResult, setConversationResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [testRecipient, setTestRecipient] = useState('');
  const [testMsg, setTestMsg] = useState('Hello from MindOS');
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState('');

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const quickTestRef = useRef<HTMLElement | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoadState('loading');
    try {
      const [statusRes, activityRes] = await Promise.all([
        fetch('/api/im/status'),
        fetch(`/api/im/activity?platform=${platformId}&limit=5`),
      ]);

      if (!statusRes.ok || !activityRes.ok) {
        setLoadState('error');
        return;
      }

      const statusData = await statusRes.json();
      const activityData = await activityRes.json();
      const platforms: PlatformStatus[] = statusData.platforms ?? [];
      const nextStatus = platforms.find((item) => item.platform === platformId) ?? null;
      const nextActivities: IMActivity[] = activityData.activities ?? [];

      setStatus(nextStatus);
      setActivities(nextActivities);
      if (platformId === 'feishu') {
        setConversationEnabled(nextStatus?.webhook?.state !== 'disabled');
        setConversationTransport(nextStatus?.webhook?.transport ?? 'webhook');
        setConversationPublicBaseUrl(nextStatus?.webhook?.publicBaseUrl ?? '');
      }
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [platformId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (!testRecipient.trim() && activities[0]?.recipient) {
      setTestRecipient(activities[0].recipient);
    }
  }, [activities, testRecipient]);

  if (!platform) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground">Unknown platform: {platformId}</p>
        <Link href="/agents?tab=channels" className="text-xs text-[var(--amber)] hover:underline mt-2 inline-block">
          ← {im.backToChannels}
        </Link>
      </div>
    );
  }

  const isConnected = status?.connected ?? false;
  const isFormComplete = platform.fields.every(field => formValues[field.key]?.trim());
  const isFeishu = platformId === 'feishu';
  const webhookState = status?.webhook?.state ?? 'disabled';
  const conversationModeLabel = isFeishu && webhookState === 'ready'
    ? im.twoWayConversation
    : im.notificationsOnly;
  const latestActivity = activities[0] ?? null;
  const lastSuccess = activities.find(item => item.status === 'success') ?? null;
  const lastFailure = activities.find(item => item.status === 'failed') ?? null;
  const relativeLastActivity = latestActivity
    ? locale === 'zh' ? new Date(latestActivity.timestamp).toLocaleString('zh-CN') : formatRelativeTime(latestActivity.timestamp)
    : im.notAvailable;

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch('/api/im/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId, credentials: formValues }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaveResult({ ok: true, msg: im.saved });
        setFormValues({});
        setSettingsOpen(false);
        await fetchDetail();
      } else {
        setSaveResult({ ok: false, msg: data.error || 'Failed' });
      }
    } catch (err) {
      setSaveResult({ ok: false, msg: err instanceof Error ? err.message : 'Network error' });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testRecipient.trim() || !testMsg.trim()) return;
    setTestStatus('sending');
    setTestResult('');
    try {
      const res = await fetch('/api/im/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId, recipient_id: testRecipient, message: testMsg }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestStatus('success');
        setTestResult(data.messageId ? `Sent (ID: ${data.messageId})` : im.sentOk);
        await fetchDetail();
      } else {
        setTestStatus('error');
        setTestResult(data.error || 'Failed');
        await fetchDetail();
      }
    } catch (err) {
      setTestStatus('error');
      setTestResult(err instanceof Error ? err.message : 'Network error');
    }
  };

  const handleDisconnect = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setConfirmDelete(false);
    try {
      const res = await fetch(`/api/im/config?platform=${platformId}`, { method: 'DELETE' });
      if (res.ok) {
        setActivities([]);
        setSettingsOpen(false);
        await fetchDetail();
      }
    } catch {
      // keep silent in UI, fetchDetail handles next render state
    }
    setDeleting(false);
  };

  const purpose = locale === 'zh' ? (platform.purposeZh ?? platform.purpose ?? im.emptyDesc) : (platform.purpose ?? im.emptyDesc);
  const useCases = locale === 'zh' ? (platform.useCasesZh ?? platform.useCases ?? []) : (platform.useCases ?? []);
  const recipientExample = locale === 'zh' ? (platform.recipientExampleZh ?? platform.recipientExample) : platform.recipientExample;
  const recipientHint = recipientExample ? `${im.recipientHint} ${recipientExample}` : im.recipientHint;

  const isLongConnection = conversationTransport === 'long_connection';
  const webhookStateLabel = webhookState === 'ready'
    ? im.conversationReady
    : webhookState === 'pending'
      ? im.conversationWaiting
      : webhookState === 'error'
        ? ((status?.webhook?.lastError ?? '').includes('Public base URL') ? im.conversationNeedsPublicUrl : im.conversationNeedsEncryptKey)
        : im.conversationDisabled;

  const handleSaveConversation = async () => {
    setConversationSaving(true);
    setConversationResult(null);
    try {
      const res = await fetch('/api/im/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'feishu',
          conversation: {
            enabled: conversationEnabled,
            transport: conversationTransport,
            encrypt_key: conversationEncryptKey.trim() || undefined,
            verification_token: conversationVerificationToken.trim() || undefined,
            public_base_url: isLongConnection ? undefined : (conversationPublicBaseUrl || undefined),
            allow_group_mentions: conversationAllowMentions,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setConversationResult({ ok: true, msg: im.conversationSaved });
        setConversationEncryptKey('');
        setConversationVerificationToken('');
        await fetchDetail();
      } else {
        setConversationResult({ ok: false, msg: data.error || 'Failed' });
      }
    } catch (err) {
      setConversationResult({ ok: false, msg: err instanceof Error ? err.message : 'Network error' });
    }
    setConversationSaving(false);
  };

  return (
    <div className="max-w-3xl">
      <Link
        href="/agents?tab=channels"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        {im.backToChannels}
      </Link>

      {loadState === 'loading' ? (
        <ChannelLoadingSkeleton />
      ) : loadState === 'error' ? (
        <div className="rounded-lg border border-border bg-card p-8 shadow-sm text-center">
          <AlertCircle size={24} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-foreground mb-1">{im.fetchError}</p>
          <p className="text-xs text-muted-foreground mb-4">{im.thisIsNotChat}</p>
          <button
            type="button"
            onClick={fetchDetail}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw size={14} />
            {im.retry}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <header className="flex items-start gap-3">
            <span className="text-3xl shrink-0" suppressHydrationWarning>{platform.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h2 className="text-xl font-semibold text-foreground">{platform.name}</h2>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md bg-success/10 text-success">
                    <CheckCircle2 size={14} /> {im.statusConnected}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                    {im.notConfigured}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-6 max-w-prose">{purpose}</p>
            </div>
          </header>

          <SectionCard title={im.howItWorks} icon={<Info size={16} className="text-[var(--amber)]" />}>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-6 max-w-prose">{purpose}</p>
              {useCases.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{im.useCasesTitle}</p>
                  <ul className="space-y-1.5 text-sm text-foreground">
                    {useCases.map(item => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--amber)] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="rounded-md border border-border/70 bg-muted/30 px-3 py-3">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{im.currentMode}</span>
                  <span className="inline-flex items-center rounded-md bg-[var(--amber-dim)] px-2 py-1 text-xs font-medium text-[var(--amber)]">{conversationModeLabel}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-6 max-w-prose">{isFeishu && webhookState === 'ready' ? im.conversationHint : im.workInMindosHint}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <p className="text-xs text-muted-foreground">{im.thisIsNotChat}</p>
                {platform.guideUrl && (
                  <Link
                    href={platform.guideUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs bg-[var(--amber-dim)] text-[var(--amber)] hover:bg-[var(--amber-dim)]/80 transition-colors"
                  >
                    {im.guideLink}
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            </div>
          </SectionCard>

          {isConnected ? (
            <>
              {isFeishu && (
                <SectionCard title={im.conversationTitle} icon={<Inbox size={16} className="text-[var(--amber)]" />}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3 rounded-md border border-border/70 px-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{im.conversationEnable}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-5 max-w-prose">{im.conversationHint}</p>
                      </div>
                      <label className="inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={conversationEnabled}
                          onChange={e => setConversationEnabled(e.target.checked)}
                          aria-label={im.conversationEnable}
                        />
                        <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${conversationEnabled ? 'bg-[var(--amber)]' : 'bg-muted'}`}>
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${conversationEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                        </span>
                      </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">Transport</label>
                        <select
                          value={conversationTransport}
                          onChange={e => setConversationTransport(e.target.value as 'webhook' | 'long_connection')}
                          className="h-11 w-full px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="webhook">Webhook</option>
                          <option value="long_connection">Long Connection</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-5">
                          {isLongConnection ? 'Use long connection for local validation without a public URL.' : im.conversationReachabilityHint}
                        </p>
                      </div>
                      {!isLongConnection && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1.5">{im.conversationPublicBaseUrl}</label>
                          <input
                            type="url"
                            placeholder="https://mindos.example.com"
                            value={conversationPublicBaseUrl}
                            onChange={e => setConversationPublicBaseUrl(e.target.value)}
                            className="h-11 w-full px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5 leading-5">{im.conversationReachabilityHint}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">{im.conversationEncryptKey}</label>
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          placeholder={im.conversationSecretPlaceholder}
                          value={conversationEncryptKey}
                          onChange={e => setConversationEncryptKey(e.target.value)}
                          className="h-11 w-full px-3 text-sm font-mono bg-background border border-border rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <p className="text-xs text-muted-foreground mt-1.5 leading-5">{isLongConnection ? 'Optional for long connection. WebSocket delivery does not require webhook decrypt settings.' : im.conversationConfigHint}</p>
                      </div>
                      {!isLongConnection && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1.5">{im.conversationVerificationToken}</label>
                          <input
                            type={showSecrets ? 'text' : 'password'}
                            placeholder={im.conversationSecretPlaceholder}
                            value={conversationVerificationToken}
                            onChange={e => setConversationVerificationToken(e.target.value)}
                            className="h-11 w-full px-3 text-sm font-mono bg-background border border-border rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <p className="text-xs text-muted-foreground mt-1.5 leading-5">{im.conversationVerificationTokenHint}</p>
                        </div>
                      )}
                    </div>

                    <label className="flex items-start gap-3 rounded-md border border-border/70 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={conversationAllowMentions}
                        onChange={e => setConversationAllowMentions(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-[var(--amber)] focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <span>
                        <span className="text-sm font-medium text-foreground">{im.conversationGroupMentions}</span>
                        <span className="block text-xs text-muted-foreground mt-1">{im.conversationHint}</span>
                      </span>
                    </label>

                    <div className={`grid gap-3 ${isLongConnection ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}`}>
                      <div className="rounded-md bg-muted/40 px-3 py-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">{im.conversationStatus}</p>
                        <p className="text-sm text-foreground">{webhookStateLabel}</p>
                        {status?.webhook?.lastError && <p className="text-xs text-error mt-1 leading-5">{status.webhook.lastError}</p>}
                      </div>
                      {!isLongConnection && (
                        <div className="rounded-md bg-muted/40 px-3 py-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{im.conversationWebhookUrl}</p>
                          <p className="text-sm font-mono text-foreground break-all">{status?.webhook?.webhookUrl ?? im.notAvailable}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveConversation}
                        disabled={conversationSaving}
                        className="h-11 px-4 text-sm rounded-md inline-flex items-center gap-1.5 bg-[var(--amber)] text-[var(--amber-foreground)] shadow-sm hover:opacity-90 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {conversationSaving ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
                        {im.conversationSave}
                      </button>
                      {platform.guideUrl && (
                        <Link
                          href={platform.guideUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          {im.conversationOpenPlatform}
                          <ExternalLink size={12} />
                        </Link>
                      )}
                    </div>

                    {conversationResult && (
                      <div role="alert" aria-live="polite" className={`flex items-start gap-1.5 text-sm ${conversationResult.ok ? 'text-success' : 'text-error'}`}>
                        {conversationResult.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
                        <span className="break-all">{conversationResult.msg}</span>
                      </div>
                    )}
                  </div>
                </SectionCard>
              )}

              <SectionCard title={im.statusSummaryTitle} icon={<Clock3 size={16} className="text-muted-foreground" />}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-muted/40 px-3 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Bot</p>
                    <p className="text-sm font-mono text-foreground">{status?.botName || im.notAvailable}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{im.lastActivity}</p>
                    <p className="text-sm text-foreground">{relativeLastActivity}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{im.lastRecipient}</p>
                    <p className="text-sm font-mono text-foreground">{latestActivity ? maskForLog(latestActivity.recipient) : im.notAvailable}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{im.tabStatus}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(status?.capabilities ?? []).length > 0 ? status?.capabilities.map(cap => (
                        <span key={cap} className="text-xs px-2 py-1 rounded-md bg-card text-muted-foreground border border-border">{cap}</span>
                      )) : <span className="text-sm text-muted-foreground">{im.notAvailable}</span>}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 mt-3">
                  <div className="rounded-md border border-border/70 px-3 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{im.latestSuccess}</p>
                    <p className="text-sm text-foreground">{lastSuccess ? (locale === 'zh' ? new Date(lastSuccess.timestamp).toLocaleString('zh-CN') : formatRelativeTime(lastSuccess.timestamp)) : im.noRecentActivity}</p>
                  </div>
                  <div className="rounded-md border border-border/70 px-3 py-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{im.latestFailure}</p>
                    <p className="text-sm text-foreground">{lastFailure ? (locale === 'zh' ? new Date(lastFailure.timestamp).toLocaleString('zh-CN') : formatRelativeTime(lastFailure.timestamp)) : im.noRecentActivity}</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title={im.recentActivity} icon={<Inbox size={16} className="text-muted-foreground" />}>
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <Inbox size={22} className="mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-foreground mb-1">{im.noActivityYet}</p>
                    <p className="text-xs text-muted-foreground max-w-prose mx-auto">{im.noActivityHint}</p>
                    <button
                      type="button"
                      onClick={() => quickTestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm bg-[var(--amber-dim)] text-[var(--amber)] hover:bg-[var(--amber-dim)]/80 transition-colors"
                    >
                      <Send size={14} />
                      {im.sendSample}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map(activity => (
                      <div key={activity.id} className="rounded-md border border-border/70 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              {activity.status === 'success' ? (
                                <CheckCircle2 size={15} className="text-success shrink-0" />
                              ) : (
                                <XCircle size={15} className="text-error shrink-0" />
                              )}
                              <p className="text-sm text-foreground truncate">{activity.messageSummary}</p>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>{formatActivityType(activity.type, {
                                test: im.activityTypeTest,
                                agent: im.activityTypeAgent,
                                manual: im.activityTypeManual,
                              })}</span>
                              <span>{maskForLog(activity.recipient)}</span>
                              {activity.error && <span className="text-error">{activity.error}</span>}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {locale === 'zh' ? new Date(activity.timestamp).toLocaleString('zh-CN') : formatRelativeTime(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <section ref={quickTestRef}>
                <SectionCard title={im.sendSample} icon={<Send size={16} className="text-[var(--amber)]" />}>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-6 max-w-prose">{im.sampleHint}</p>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">{im.recipientPlaceholder}</label>
                    <input
                      type="text"
                      placeholder={recipientExample || im.recipientPlaceholder}
                      value={testRecipient}
                      onChange={e => setTestRecipient(e.target.value)}
                      className="h-11 w-full px-3 text-sm font-mono bg-background border border-border rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label={im.recipientPlaceholder}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5 leading-5">{recipientHint}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">{im.messagePlaceholder}</label>
                    <input
                      type="text"
                      placeholder={im.messagePlaceholder}
                      value={testMsg}
                      onChange={e => setTestMsg(e.target.value)}
                      className="h-11 w-full px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label={im.messagePlaceholder}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleTest}
                      disabled={testStatus === 'sending' || !testRecipient.trim()}
                      className="h-11 px-4 text-sm rounded-md inline-flex items-center gap-1.5 bg-[var(--amber)] text-[var(--amber-foreground)] shadow-sm hover:opacity-90 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {testStatus === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {im.sendSample}
                    </button>
                  </div>
                  {testResult && (
                    <div role="alert" aria-live="polite" className={`flex items-start gap-1.5 text-sm ${testStatus === 'success' ? 'text-success' : 'text-error'}`}>
                      {testStatus === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
                      <span className="break-all">{testResult}</span>
                    </div>
                  )}
                </div>
                </SectionCard>
              </section>

              <section className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(prev => !prev)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left hover:bg-muted/40 transition-colors"
                  aria-expanded={settingsOpen}
                >
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{im.settingsTitle}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{im.settingsHint}</p>
                  </div>
                  {settingsOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </button>
                {settingsOpen && (
                  <div className="border-t border-border px-4 py-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">{im.editCredentials}</h4>
                      <p className="text-sm text-muted-foreground leading-6 mb-3 max-w-prose">{platform.editHint || im.editCredentialsHint}</p>
                      <p className="text-xs text-muted-foreground/80 leading-5 mb-4 max-w-prose">{im.savedValuesHint}</p>
                    </div>
                    {platform.fields.map(field => (
                      <div key={field.key} className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground">
                          {field.label}
                          <span className="text-muted-foreground/50 font-normal"> ({im.required})</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showSecrets ? 'text' : 'password'}
                            placeholder={field.placeholder}
                            value={formValues[field.key] ?? ''}
                            onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="h-11 w-full px-3 pr-10 text-sm font-mono bg-background border border-border rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            autoComplete="off"
                            aria-required="true"
                            aria-describedby={field.hint ? `connected-hint-${field.key}` : undefined}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecrets(prev => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                            aria-label={showSecrets ? im.hideSecret : im.showSecret}
                            title={showSecrets ? im.hideSecret : im.showSecret}
                          >
                            {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {field.hint && <span id={`connected-hint-${field.key}`} className="text-xs text-muted-foreground">{field.hint}</span>}
                      </div>
                    ))}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !isFormComplete}
                        className="h-11 px-4 text-sm rounded-md inline-flex items-center gap-1.5 bg-[var(--amber)] text-[var(--amber-foreground)] shadow-sm hover:opacity-90 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
                        {saving ? im.saving : im.saveConfig}
                      </button>
                    </div>
                    {saveResult && (
                      <div role="alert" aria-live="polite" className={`flex items-start gap-1.5 text-sm ${saveResult.ok ? 'text-success' : 'text-error'}`}>
                        {saveResult.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
                        <span className="break-all">{saveResult.msg}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <SectionCard title={im.disconnect} icon={<AlertTriangle size={16} className="text-error" />}>
                <p className="text-xs text-muted-foreground mb-3">{im.disconnectHint}</p>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={deleting}
                  className={`h-11 px-4 text-sm rounded-md inline-flex items-center gap-1.5 border transition-colors ${
                    confirmDelete
                      ? 'text-error border-error/40 bg-error/5 hover:bg-error/10'
                      : 'text-muted-foreground border-border hover:text-error hover:border-error/30'
                  }`}
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : confirmDelete ? <><AlertTriangle size={14} /> {im.confirmDisconnect}</> : <Trash2 size={14} />}
                  {!confirmDelete && !deleting && im.disconnect}
                </button>
              </SectionCard>
            </>
          ) : (
            <div className="space-y-6">
              {platform.guide && (
                <SectionCard title={im.setupGuide} icon={<Info size={16} className="text-[var(--amber)]" />}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="text-sm text-muted-foreground leading-7 space-y-1.5 max-w-prose">
                      {platform.guide.split('\n').map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                    {platform.guideUrl && (
                      <Link
                        href={platform.guideUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs bg-[var(--amber-dim)] text-[var(--amber)] hover:bg-[var(--amber-dim)]/80 shrink-0 transition-colors"
                      >
                        {im.guideLink}
                        <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>
                </SectionCard>
              )}

              <SectionCard title={im.tabConfigure} icon={<Settings2 size={16} className="text-[var(--amber)]" />}>
                <div className="space-y-4">
                  {platform.fields.map(field => (
                    <div key={field.key} className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        {field.label}
                        <span className="text-muted-foreground/50 font-normal"> ({im.required})</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          placeholder={field.placeholder}
                          value={formValues[field.key] ?? ''}
                          onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="h-11 w-full px-3 pr-10 text-sm font-mono bg-background border border-border rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          autoComplete="off"
                          aria-required="true"
                          aria-describedby={field.hint ? `hint-${field.key}` : undefined}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets(prev => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                          aria-label={showSecrets ? im.hideSecret : im.showSecret}
                          title={showSecrets ? im.hideSecret : im.showSecret}
                        >
                          {showSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {field.hint && <span id={`hint-${field.key}`} className="text-xs text-muted-foreground">{field.hint}</span>}
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || !isFormComplete}
                      className="h-11 px-4 text-sm rounded-md inline-flex items-center gap-1.5 bg-[var(--amber)] text-[var(--amber-foreground)] shadow-sm hover:opacity-90 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
                      {saving ? im.saving : im.saveConfig}
                    </button>
                  </div>
                  {saveResult && (
                    <div role="alert" aria-live="polite" className={`flex items-start gap-1.5 text-sm ${saveResult.ok ? 'text-success' : 'text-error'}`}>
                      {saveResult.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <XCircle size={16} className="shrink-0 mt-0.5" />}
                      <span className="break-all">{saveResult.msg}</span>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

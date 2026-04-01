'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Bot, ChevronDown, ChevronUp, Wifi, WifiOff, Zap, ArrowRight } from 'lucide-react';
import { useMcpDataOptional } from '@/hooks/useMcpData';
import { useLocale } from '@/lib/LocaleContext';
import type { AgentInfo } from '@/components/settings/types';

/* ── Constants ── */

const COLLAPSE_KEY = 'mindos:pulse-collapsed';
const VISIBLE_AGENTS = 3;

/* ── Helpers ── */

/** Sort: connected first (by recent activity), then detected, then rest */
function sortAgents(agents: AgentInfo[]): AgentInfo[] {
  return [...agents].sort((a, b) => {
    const score = (ag: AgentInfo) => {
      if (ag.installed) return 3;
      if (ag.present) return 2;
      return 0;
    };
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    // Within same tier, sort by last activity
    const ta = a.runtimeLastActivityAt ? new Date(a.runtimeLastActivityAt).getTime() : 0;
    const tb = b.runtimeLastActivityAt ? new Date(b.runtimeLastActivityAt).getTime() : 0;
    return tb - ta;
  });
}

function activityAge(isoStr?: string): string | null {
  if (!isoStr) return null;
  const ms = Date.now() - new Date(isoStr).getTime();
  if (ms < 60_000) return '<1m';
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h`;
  return `${Math.floor(ms / 86400_000)}d`;
}

/** First letter(s) for avatar */
function initials(name: string): string {
  const words = name.split(/[\s-]+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/* ── Tiny sub-components ── */

function AgentDot({ agent }: { agent: AgentInfo }) {
  const isActive = agent.installed;
  const isDetected = agent.present && !agent.installed;
  return (
    <div
      className={`relative w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold font-display shrink-0 transition-all duration-150 ${
        isActive
          ? 'bg-[var(--amber)]/10 text-[var(--amber-text)] ring-1 ring-[var(--amber)]/20'
          : isDetected
            ? 'bg-muted/80 text-muted-foreground ring-1 ring-border'
            : 'bg-muted/40 text-muted-foreground/50 ring-1 ring-border/50'
      }`}
      title={agent.name}
    >
      {initials(agent.name)}
      {/* Live indicator */}
      {isActive && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-card" />
      )}
    </div>
  );
}

function AgentRow({ agent, pulse }: { agent: AgentInfo; pulse: Record<string, any> }) {
  const isActive = agent.installed;
  const isDetected = agent.present && !agent.installed;
  const age = activityAge(agent.runtimeLastActivityAt);

  return (
    <div className="flex items-center gap-3 py-1.5">
      <AgentDot agent={agent} />
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium block truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
          {agent.name}
        </span>
        <span className="text-xs text-muted-foreground/60 block">
          {isActive ? pulse.active : isDetected ? pulse.detected : pulse.notFound}
          {age && isActive ? ` · ${age}` : ''}
          {isActive && agent.installedSkillCount ? ` · ${agent.installedSkillCount} skills` : ''}
        </span>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 min-w-0">
      <span className="shrink-0 text-muted-foreground/60">{icon}</span>
      <div className="min-w-0">
        <span className="text-sm font-semibold tabular-nums text-foreground block">{value}</span>
        <span className="text-xs text-muted-foreground/60 block">{label}</span>
      </div>
    </div>
  );
}

/* ── Main Component ── */

export default function SystemPulse() {
  const mcp = useMcpDataOptional();
  const { t } = useLocale();
  const pulse = t.pulse;
  const [collapsed, setCollapsed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Hydrate collapse state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored !== null) setCollapsed(stored === '1');
  }, []);

  // All hooks MUST be above any early return (Rules of Hooks)
  const agents = mcp?.agents ?? [];
  const status = mcp?.status ?? null;
  const skills = mcp?.skills ?? [];
  const sorted = useMemo(() => sortAgents(agents), [agents]);
  const connectedAgents = sorted.filter(a => a.installed);
  const otherAgents = sorted.filter(a => !a.installed && a.present);
  const mcpRunning = status?.running ?? false;
  const enabledSkills = skills.filter(s => s.enabled).length;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
  };

  // Don't render while loading
  if (!mcp || mcp.loading) return null;

  // ── State 0: No agents detected at all ──
  if (agents.every(a => !a.present)) {
    return (
      <div className="mb-8 rounded-xl border border-dashed border-border/60 bg-gradient-to-r from-card to-card/60 p-5 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--amber)]/10 flex items-center justify-center shrink-0">
            <Bot size={18} className="text-[var(--amber)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground font-display">{pulse.connectTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{pulse.connectDesc}</p>
          </div>
          <Link
            href="/agents"
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--amber)] text-[var(--amber-foreground)] transition-all duration-150 hover:opacity-90 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {pulse.connectAction}
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    );
  }

  // Count for summary
  const totalConnected = connectedAgents.length;
  const totalDetected = otherAgents.length;

  // ── Collapsed: elegant single-line ──
  if (collapsed) {
    return (
      <button
        onClick={toggleCollapsed}
        className="mb-8 w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm transition-all duration-150 hover:border-[var(--amber)]/30 hover:bg-card hover:shadow-sm cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Agent avatars stack */}
        <div className="flex items-center -space-x-1.5">
          {connectedAgents.slice(0, 3).map(agent => (
            <div
              key={agent.key}
              className="relative w-6 h-6 rounded-md bg-[var(--amber)]/10 text-[var(--amber-text)] ring-1 ring-[var(--amber)]/20 ring-offset-1 ring-offset-card flex items-center justify-center text-2xs font-bold font-display"
              title={agent.name}
            >
              {initials(agent.name)}
            </div>
          ))}
          {totalConnected > 3 && (
            <div className="w-6 h-6 rounded-md bg-muted text-muted-foreground ring-1 ring-border ring-offset-1 ring-offset-card flex items-center justify-center text-2xs font-medium">
              +{totalConnected - 3}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 flex-1">
          <span className="font-medium text-foreground/80">
            {pulse.summary(totalConnected, enabledSkills)}
          </span>
          {mcpRunning && (
            <>
              <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-muted-foreground/50 hidden sm:inline">MCP</span>
            </>
          )}
        </div>

        <ChevronDown size={14} className="text-muted-foreground/30 group-hover:text-[var(--amber)] transition-colors shrink-0" />
      </button>
    );
  }

  // ── Expanded: polished card ──
  const visibleAgents = showAll ? connectedAgents : connectedAgents.slice(0, VISIBLE_AGENTS);
  const hiddenCount = connectedAgents.length - VISIBLE_AGENTS;

  return (
    <div className="mb-8 rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm transition-all duration-200">

      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--amber)]/10 flex items-center justify-center">
            <Bot size={12} className="text-[var(--amber)]" />
          </div>
          <span className="text-xs font-semibold font-display text-foreground tracking-wide">
            {pulse.title}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Link
            href="/agents"
            className="text-xs font-medium text-[var(--amber)] hover:opacity-80 transition-opacity font-display hidden sm:inline"
          >
            {pulse.manage} →
          </Link>
          <button
            onClick={toggleCollapsed}
            className="p-1.5 -mr-1 rounded-md hover:bg-muted transition-colors text-muted-foreground/60 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Collapse"
          >
            <ChevronUp size={14} />
          </button>
        </div>
      </div>

      {/* ── Agent list (max 3, expandable) ── */}
      <div className="px-4 pb-2">
        <div className="space-y-0.5">
          {visibleAgents.map(agent => (
            <AgentRow key={agent.key} agent={agent} pulse={pulse} />
          ))}
        </div>

        {/* Show more / less toggle */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-[var(--amber)] hover:opacity-80 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <ChevronDown size={12} className={`transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`} />
            <span>{showAll ? pulse.showLess : pulse.showMore(hiddenCount)}</span>
          </button>
        )}

        {/* Detected but not connected */}
        {otherAgents.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/20">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-2xs font-medium text-muted-foreground/50 uppercase tracking-wider">{pulse.otherDetected}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {otherAgents.map(agent => (
                <span
                  key={agent.key}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40 text-xs text-muted-foreground/70"
                  title={agent.name}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0" />
                  {agent.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Stats footer ── */}
      <div className="px-4 py-2.5 border-t border-border/20 bg-muted/10">
        <div className="flex items-center gap-3 text-xs">
          {/* MCP status */}
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            {mcpRunning
              ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span>MCP {pulse.running}</span></>
              : <><WifiOff size={11} className="text-muted-foreground/40" /><span>MCP {pulse.offline}</span></>
            }
          </span>

          <span className="w-px h-3 bg-border/40" aria-hidden="true" />

          {/* Skills */}
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Zap size={11} className="text-[var(--amber)]/60" />
            <span className="tabular-nums">{pulse.skillCount(enabledSkills, skills.length)}</span>
          </span>

          {status?.port && (
            <>
              <span className="w-px h-3 bg-border/40 hidden sm:block" aria-hidden="true" />
              <span className="tabular-nums text-muted-foreground/30 hidden sm:inline">:{status.port}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

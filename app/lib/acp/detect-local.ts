import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { findUserOverride, getDetectableAgents, resolveAgentCommand } from './agent-descriptors';
import { readSettings } from '@/lib/settings';

export interface InstalledAgent {
  id: string;
  name: string;
  binaryPath: string;
  resolvedCommand: {
    cmd: string;
    args: string[];
    source: 'user-override' | 'descriptor' | 'registry';
  };
}

export interface NotInstalledAgent {
  id: string;
  name: string;
  installCmd: string;
  packageName?: string;
}

function expandHome(filePath: string): string {
  if (filePath === '~') return os.homedir();
  if (filePath.startsWith('~/')) return `${os.homedir()}/${filePath.slice(2)}`;
  return filePath;
}

function isPathLikeCommand(command: string): boolean {
  return command.startsWith('~/') || command.startsWith('/') || command.startsWith('./') || command.startsWith('../') || command.includes('\\') || /^[A-Za-z]:[\\/]/.test(command);
}

function resolveDirectCommandPath(command: string | undefined): string | null {
  if (!command) return null;
  const trimmed = command.trim();
  if (!trimmed || !isPathLikeCommand(trimmed)) return null;
  const expanded = expandHome(trimmed);
  return fs.existsSync(expanded) ? expanded : null;
}

function resolveExistingPresenceDir(paths: string[] | undefined): string | null {
  if (!paths || paths.length === 0) return null;
  for (const candidate of paths) {
    const expanded = expandHome(candidate);
    if (fs.existsSync(expanded)) return expanded;
  }
  return null;
}

function lookupCommandPath(command: string): Promise<string | null> {
  const trimmed = command.trim();
  if (!trimmed || isPathLikeCommand(trimmed)) return Promise.resolve(null);

  return new Promise((resolve) => {
    execFile(process.platform === 'win32' ? 'where' : 'which', [trimmed], { encoding: 'utf-8', timeout: 3000 }, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      const firstMatch = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);
      resolve(firstMatch ?? null);
    });
  });
}

async function lookupCommandPaths(commands: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(commands.map((command) => command.trim()).filter(Boolean))];
  const entries = await Promise.all(unique.map(async (command) => [command, await lookupCommandPath(command)] as const));
  return new Map(entries);
}

export async function detectLocalAcpAgents(settings = readSettings()): Promise<{ installed: InstalledAgent[]; notInstalled: NotInstalledAgent[] }> {
  const agents = getDetectableAgents();

  const plans = agents.map((agent) => {
    const userOverride = findUserOverride(agent.id, settings.acpAgents);
    const resolved = resolveAgentCommand(agent.id, undefined, userOverride);
    const directPath = resolveDirectCommandPath(userOverride?.command);
    const commandCandidates = [...new Set([
      ...(agent.detectCommands ?? [agent.binary]),
      ...(userOverride?.command && !isPathLikeCommand(userOverride.command) ? [userOverride.command] : []),
    ])];
    return { agent, resolved, directPath, commandCandidates };
  });

  const commandLookup = await lookupCommandPaths(plans.flatMap((plan) => plan.commandCandidates));

  const installed: InstalledAgent[] = [];
  const notInstalled: NotInstalledAgent[] = [];

  for (const { agent, resolved, directPath, commandCandidates } of plans) {
    const binaryPath = directPath
      ?? commandCandidates.map((command) => commandLookup.get(command) ?? null).find(Boolean)
      ?? resolveExistingPresenceDir(agent.presenceDirs);

    if (binaryPath) {
      installed.push({
        id: agent.id,
        name: agent.name,
        binaryPath,
        resolvedCommand: { cmd: resolved.cmd, args: resolved.args, source: resolved.source },
      });
    } else {
      const packageName = agent.installCmd?.match(/npm install -g (.+)/)?.[1];
      notInstalled.push({
        id: agent.id,
        name: agent.name,
        installCmd: agent.installCmd ?? (packageName ? `npm install -g ${packageName}` : ''),
        packageName,
      });
    }
  }

  return { installed, notInstalled };
}

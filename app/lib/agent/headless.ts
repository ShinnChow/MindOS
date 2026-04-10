import os from 'os';
import path from 'path';
import type { AgentTool, AgentToolResult } from '@mariozechner/pi-agent-core';
import type { AgentSessionEvent as AgentEvent } from '@mariozechner/pi-coding-agent';
import {
  AuthStorage,
  convertToLlm,
  createAgentSession,
  DefaultResourceLoader,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  bashTool,
  type Skill,
  type ToolDefinition,
} from '@mariozechner/pi-coding-agent';
import { getFileContent, getMindRoot } from '@/lib/fs';
import { getModelConfig, hasImages } from '@/lib/agent/model';
import { isProviderId, type ProviderId, toPiProvider } from '@/lib/agent/providers';
import { findCustomProvider, isCustomProviderId } from '@/lib/custom-endpoints';
import { AGENT_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT, ORGANIZE_SYSTEM_PROMPT } from '@/lib/agent/prompt';
import { getChatTools, getOrganizeTools, getRequestScopedTools, truncate, WRITE_TOOLS } from '@/lib/agent/tools';
import { toAgentMessages } from '@/lib/agent/to-agent-messages';
import { logAgentOp } from '@/lib/agent/log';
import { readSettings } from '@/lib/settings';
import { scanExtensionPaths } from '@/lib/pi-integration/extensions';
import { assertNotProtected } from '@/lib/core';
import { generateSkillsXml } from '@/lib/agent/skills-xml';
import {
  getTextDelta,
  getThinkingDelta,
  getToolExecutionEnd,
  getToolExecutionStart,
  isTextDeltaEvent,
  isThinkingDeltaEvent,
  isToolExecutionEndEvent,
  isToolExecutionStartEvent,
} from '@/lib/sse/events';
import type { AskModeApi, Message as FrontendMessage } from '@/lib/types';

function readKnowledgeFile(filePath: string): string | null {
  try {
    return truncate(getFileContent(filePath));
  } catch {
    return null;
  }
}

function textToolResult(text: string): AgentToolResult<Record<string, never>> {
  return { content: [{ type: 'text', text }], details: {} };
}

function getProtectedPaths(toolName: string, args: Record<string, unknown>): string[] {
  const pathsToCheck: string[] = [];
  if (toolName === 'batch_create_files' && Array.isArray(args.files)) {
    (args.files as Array<{ path?: string }>).forEach((f) => { if (f.path) pathsToCheck.push(f.path); });
  } else {
    const singlePath = (args.path ?? args.from_path) as string | undefined;
    if (typeof singlePath === 'string') pathsToCheck.push(singlePath);
  }
  return pathsToCheck;
}

function toPiCustomToolDefinitions(tools: AgentTool<any>[]): ToolDefinition<any, unknown>[] {
  return tools.map((tool) => ({
    name: tool.name,
    label: tool.label,
    description: tool.description,
    parameters: tool.parameters as Record<string, unknown>,
    execute: async (toolCallId, params, signal, onUpdate) => {
      const args = (params ?? {}) as Record<string, unknown>;
      if (WRITE_TOOLS.has(tool.name)) {
        for (const filePath of getProtectedPaths(tool.name, args)) {
          try {
            assertNotProtected(filePath, 'modified by AI agent');
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return textToolResult(`Write-protection error: ${errorMsg}`);
          }
        }
      }

      const result = await tool.execute(toolCallId, params, signal, onUpdate as any);
      const outputText = result?.content
        ?.filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('') ?? '';

      try {
        logAgentOp({
          ts: new Date().toISOString(),
          tool: tool.name,
          params: args,
          result: outputText.startsWith('Error:') ? 'error' : 'ok',
          message: outputText.slice(0, 200),
          agentName: 'MindOS',
        });
      } catch {
        // ignore logging failures
      }

      return result;
    },
  }));
}

function buildSystemPrompt(mode: AskModeApi): string {
  const base = mode === 'organize'
    ? ORGANIZE_SYSTEM_PROMPT
    : mode === 'chat'
      ? CHAT_SYSTEM_PROMPT
      : AGENT_SYSTEM_PROMPT;

  const parts: string[] = [base, `---\n\nmind_root=${getMindRoot()}`];
  const readme = readKnowledgeFile('README.md');
  if (readme && readme.trim().length > 10) {
    parts.push(`---\n\n## Knowledge Base Structure\n\n${readme}`);
  }
  return parts.join('\n\n');
}

export interface HeadlessAgentRunOptions {
  userMessage: string;
  historyMessages?: FrontendMessage[];
  mode?: AskModeApi;
  maxSteps?: number;
  providerOverride?: string;
  modelOverride?: string;
}

export interface HeadlessAgentRunResult {
  text: string;
  thinking: string;
  toolCalls: Array<{ toolCallId: string; toolName: string; output: string; isError: boolean }>;
}

export async function runHeadlessAgent(options: HeadlessAgentRunOptions): Promise<HeadlessAgentRunResult> {
  const askMode: AskModeApi = options.mode === 'organize' ? 'organize' : options.mode === 'chat' ? 'chat' : 'agent';
  const historyMessages = Array.isArray(options.historyMessages) ? options.historyMessages : [];
  const currentMessage: FrontendMessage = { role: 'user', content: options.userMessage, timestamp: Date.now() };
  const allMessages = [...historyMessages, currentMessage];
  const serverSettings = readSettings();
  const agentConfig = serverSettings.agent ?? {};

  let provOverride: ProviderId | undefined;
  let customProviderConfig: { apiKey: string; model: string; baseUrl: string } | undefined;
  if (options.providerOverride) {
    if (isCustomProviderId(options.providerOverride)) {
      const customProvider = findCustomProvider(serverSettings.ai.providers ?? [], options.providerOverride);
      if (!customProvider) throw new Error('Custom provider not found');
      provOverride = customProvider.protocol;
      customProviderConfig = {
        apiKey: customProvider.apiKey,
        model: customProvider.model,
        baseUrl: customProvider.baseUrl,
      };
    } else if (isProviderId(options.providerOverride)) {
      provOverride = options.providerOverride;
    }
  }

  const { model, apiKey, provider } = getModelConfig({
    provider: provOverride,
    apiKey: customProviderConfig?.apiKey,
    model: options.modelOverride?.trim() || customProviderConfig?.model,
    baseUrl: customProviderConfig?.baseUrl,
    hasImages: hasImages(allMessages),
  });

  const systemPrompt = buildSystemPrompt(askMode);
  const projectRoot = process.env.MINDOS_PROJECT_ROOT || path.resolve(process.cwd(), '..');
  const requestTools = askMode === 'organize' ? getOrganizeTools() : askMode === 'chat' ? getChatTools() : getRequestScopedTools();
  const customTools = toPiCustomToolDefinitions(requestTools);
  const authStorage = AuthStorage.create();
  authStorage.setRuntimeApiKey(toPiProvider(provider), apiKey);
  const modelRegistry = new ModelRegistry(authStorage);
  const enableThinking = agentConfig.enableThinking ?? false;
  const thinkingBudget = agentConfig.thinkingBudget ?? 5000;
  const contextStrategy = agentConfig.contextStrategy ?? 'auto';
  const settingsManager = SettingsManager.inMemory({
    enableSkillCommands: true,
    ...(enableThinking && provider === 'anthropic' ? { thinkingBudgets: { medium: thinkingBudget } } : {}),
    ...(contextStrategy === 'off' ? { compaction: { enabled: false } } : {}),
  });

  const CORE_SKILL_NAMES = new Set(['mindos', 'mindos-zh', 'mindos-max', 'mindos-max-zh']);
  let promptForLoader = systemPrompt;
  const resourceLoader = new DefaultResourceLoader({
    cwd: projectRoot,
    settingsManager,
    systemPromptOverride: () => promptForLoader,
    appendSystemPromptOverride: () => [],
    agentsFilesOverride: () => ({ agentsFiles: [] }),
    skillsOverride: (result) => ({
      ...result,
      skills: result.skills.filter((s) => !CORE_SKILL_NAMES.has(s.name)),
    }),
    additionalSkillPaths: [
      path.join(projectRoot, 'app', 'data', 'skills'),
      path.join(projectRoot, 'skills'),
      path.join(getMindRoot(), '.skills'),
      path.join(os.homedir(), '.mindos', 'skills'),
    ],
    additionalExtensionPaths: [
      ...scanExtensionPaths(),
      path.join(projectRoot, 'app', 'node_modules', 'pi-mcp-adapter', 'index.ts'),
      path.join(projectRoot, 'app', 'lib', 'im', 'index.ts'),
    ],
  });
  await resourceLoader.reload();

  if (askMode === 'agent') {
    const { skills: discoveredSkills } = resourceLoader.getSkills();
    const thirdPartySkills = discoveredSkills.filter((s: Skill) => !s.disableModelInvocation);
    if (thirdPartySkills.length > 0) {
      promptForLoader += '\n\n---\n\n' + generateSkillsXml(thirdPartySkills);
      await resourceLoader.reload();
    }
  }

  const { session } = await createAgentSession({
    cwd: projectRoot,
    model,
    thinkingLevel: (enableThinking && provider === 'anthropic') ? 'medium' : 'off',
    authStorage,
    modelRegistry,
    resourceLoader,
    sessionManager: SessionManager.inMemory(),
    settingsManager,
    tools: askMode === 'agent' ? [bashTool] : [],
    customTools,
  });

  const llmHistoryMessages = convertToLlm(toAgentMessages(historyMessages));
  await session.newSession({
    setup: async (sessionManager) => {
      for (const message of llmHistoryMessages) {
        sessionManager.appendMessage(message);
      }
    },
  });

  let text = '';
  let thinking = '';
  const toolCalls: Array<{ toolCallId: string; toolName: string; output: string; isError: boolean }> = [];

  session.subscribe((event: AgentEvent) => {
    if (isTextDeltaEvent(event)) {
      text += getTextDelta(event);
    } else if (isThinkingDeltaEvent(event)) {
      thinking += getThinkingDelta(event);
    } else if (isToolExecutionStartEvent(event)) {
      const { toolCallId, toolName } = getToolExecutionStart(event);
      toolCalls.push({ toolCallId, toolName, output: '', isError: false });
    } else if (isToolExecutionEndEvent(event)) {
      const { toolCallId, output, isError } = getToolExecutionEnd(event);
      const index = toolCalls.findIndex((call) => call.toolCallId === toolCallId);
      if (index >= 0) {
        toolCalls[index] = { ...toolCalls[index], output, isError };
      } else {
        toolCalls.push({ toolCallId, toolName: 'unknown', output, isError });
      }
    }
  });

  await session.prompt(options.userMessage);

  return {
    text: text.trim(),
    thinking: thinking.trim(),
    toolCalls,
  };
}

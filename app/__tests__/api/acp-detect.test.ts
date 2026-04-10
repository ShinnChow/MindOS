import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import { execFile } from 'child_process';
import { detectLocalAcpAgents } from '../../lib/acp/detect-local';

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

const mockExecFile = vi.mocked(execFile);

describe('detectLocalAcpAgents', () => {
  let existsSyncSpy: ReturnType<typeof vi.spyOn>;
  const originalPlatform = process.platform;

  beforeEach(() => {
    existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    mockExecFile.mockReset();
  });

  afterEach(() => {
    existsSyncSpy.mockRestore();
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('detects installed agents from PATH lookups', async () => {
    mockExecFile.mockImplementation((command, args, _options, callback) => {
      const binary = String(args?.[0] ?? '');
      const stdout = binary === 'gemini' ? '/usr/local/bin/gemini\n' : '';
      callback?.(stdout ? null : new Error('not found'), stdout, '');
      return {} as never;
    });

    const result = await detectLocalAcpAgents({ acpAgents: {} } as any);

    expect(result.installed.some((agent) => agent.id === 'gemini' && agent.binaryPath === '/usr/local/bin/gemini')).toBe(true);
  });

  it('falls back to presence directories when PATH lookup fails', async () => {
    mockExecFile.mockImplementation((_command, _args, _options, callback) => {
      callback?.(new Error('not found'), '', '');
      return {} as never;
    });
    existsSyncSpy.mockImplementation((filePath: fs.PathLike) => String(filePath).includes('.cursor/extensions'));

    const result = await detectLocalAcpAgents({ acpAgents: {} } as any);

    expect(result.installed.some((agent) => agent.id === 'cursor' && agent.binaryPath.includes('.cursor/extensions'))).toBe(true);
  });

  it('treats an override command path as installed even when it is outside PATH', async () => {
    mockExecFile.mockImplementation((_command, _args, _options, callback) => {
      callback?.(new Error('not found'), '', '');
      return {} as never;
    });
    existsSyncSpy.mockImplementation((filePath: fs.PathLike) => String(filePath) === '/opt/tools/claude');

    const result = await detectLocalAcpAgents({
      acpAgents: {
        claude: {
          command: '/opt/tools/claude',
        },
      },
    } as any);

    expect(result.installed.some((agent) => agent.id === 'claude' && agent.binaryPath === '/opt/tools/claude')).toBe(true);
  });

  it('tries the Windows where command on win32', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    mockExecFile.mockImplementation((command, args, _options, callback) => {
      const binary = String(args?.[0] ?? '');
      const stdout = binary === 'gemini' ? 'C:\\Tools\\gemini.cmd\r\n' : '';
      callback?.(stdout ? null : new Error('not found'), stdout, '');
      return {} as never;
    });

    const result = await detectLocalAcpAgents({ acpAgents: {} } as any);

    expect(mockExecFile).toHaveBeenCalledWith('where', ['gemini'], expect.any(Object), expect.any(Function));
    expect(result.installed.some((agent) => agent.id === 'gemini' && agent.binaryPath === 'C:\\Tools\\gemini.cmd')).toBe(true);
  });

  it('probes alternate command names such as qwen when the canonical binary is different', async () => {
    mockExecFile.mockImplementation((_command, args, _options, callback) => {
      const binary = String(args?.[0] ?? '');
      const stdout = binary === 'qwen' ? '/usr/local/bin/qwen\n' : '';
      callback?.(stdout ? null : new Error('not found'), stdout, '');
      return {} as never;
    });

    const result = await detectLocalAcpAgents({ acpAgents: {} } as any);

    expect(result.installed.some((agent) => agent.id === 'qwen-code' && agent.binaryPath === '/usr/local/bin/qwen')).toBe(true);
  });
});

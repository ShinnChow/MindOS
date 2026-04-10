import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { bold, dim, red } from '../lib/colors.js';

export const meta = {
  name: 'feishu-ws',
  group: 'IM Integration',
  summary: 'Start Feishu long connection client',
  usage: 'mindos feishu-ws',
  examples: [
    'mindos feishu-ws',
  ],
};

export async function run() {
  const appCwd = resolve(process.cwd(), 'app');

  console.log();
  console.log(bold('Starting Feishu long connection'));
  console.log(dim('This keeps a WSClient process running for local event validation.'));
  console.log(dim(`App cwd: ${appCwd}`));
  console.log();

  const child = spawn('npx', ['tsx', 'scripts/feishu-long-connection.ts'], {
    cwd: appCwd,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error(red(`Failed to start Feishu long connection: ${error.message}`));
    process.exit(1);
  });
}

import type { NextConfig } from "next";
import path from "path";

// When MindOS is installed globally via npm, the entire project lives
// under node_modules/@geminilight/mindos/. Next.js skips tsconfig path
// resolution and SWC TypeScript compilation for files inside node_modules.
// We detect this at config time and apply the necessary overrides.
const projectDir = path.resolve(__dirname);
const inNodeModules = projectDir.includes('node_modules');

const nextConfig: NextConfig = {
  transpilePackages: [
    'github-slugger',
    // Self-reference: ensures the SWC loader compiles our own TypeScript
    // when the project is inside node_modules (global npm install).
    ...(inNodeModules ? ['@geminilight/mindos'] : []),
  ],
  serverExternalPackages: [
    'chokidar', 'openai', 'discord.js',
    '@mariozechner/pi-ai', '@mariozechner/pi-agent-core', '@mariozechner/pi-coding-agent', 'pi-mcp-adapter',
    // Heavy packages excluded from bundle — dynamically imported at runtime.
    '@huggingface/transformers', 'onnxruntime-node',
    'sharp', '@img/sharp-linux-x64', '@img/sharp-darwin-arm64', '@img/sharp-win32-x64',
  ],
  output: 'standalone',
  outputFileTracingRoot: projectDir,
  // Exclude heavy native packages from standalone trace to reduce runtime archive.
  // onnxruntime-node (355MB) is only needed for local embedding and will be
  // installed on-demand. @img/sharp-* (33MB) is optional for image processing.
  outputFileTracingExcludes: {
    '*': [
      './node_modules/onnxruntime-node/**',
      './node_modules/@img/**',
      './node_modules/sharp/**',
    ],
  },
  outputFileTracingIncludes: {
    // extract-pdf.cjs is spawned at runtime (not bundled) — ensure it's
    // copied into .next/standalone/scripts/ so standalone builds work.
    '/api/extract-pdf': ['./scripts/extract-pdf.cjs'],
  },
  turbopack: {
    root: projectDir,
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  webpack: (config) => {
    if (inNodeModules) {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = config.resolve.alias ?? {};
      (config.resolve.alias as Record<string, string>)['@'] = projectDir;
    }
    return config;
  },
};

export default nextConfig;

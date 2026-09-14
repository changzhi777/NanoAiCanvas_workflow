#!/usr/bin/env node
/**
 * nanoai-video — AI-powered video composition CLI
 *
 * Usage:
 *   nanoai-video compose -c clip1.mp4 clip2.mp4 --bgm music.mp3
 *   nanoai-video concat -i a.mp4 b.mp4 -o out.mp4
 *   nanoai-video compare --original raw.mp4 --result final.mp4
 *   nanoai-video subtitle -i video.mp4 -s subs.json
 *   nanoai-video bgm -i video.mp4 -b music.mp3
 *   nanoai-video mcp      # Start MCP Server (stdio)
 *   nanoai-video serve    # Start HTTP API server
 */

import { Command } from 'commander'
import { registerComposeCommand } from './cli/commands/compose.js'
import { registerConcatCommand } from './cli/commands/concat.js'
import { registerCompareCommand } from './cli/commands/compare.js'
import { registerSubtitleCommand } from './cli/commands/subtitle.js'
import { registerBgmCommand } from './cli/commands/bgm.js'
import { registerSetupCommand } from './cli/commands/setup.js'
import { startMcpServer } from './mcp/server.js'
import { startApiServer } from './api/server.js'

const program = new Command()
  .name('nanoai-video')
  .description('AI-powered video composition CLI — FFmpeg + MCP + Agent chat')
  .version('0.1.0')

// Register CLI commands
registerSetupCommand(program)
registerComposeCommand(program)
registerConcatCommand(program)
registerCompareCommand(program)
registerSubtitleCommand(program)
registerBgmCommand(program)

// MCP Server mode
program
  .command('mcp')
  .description('Start MCP Server (stdio transport)')
  .action(async () => {
    await startMcpServer()
  })

// HTTP API mode
program
  .command('serve')
  .description('Start HTTP API server')
  .option('-p, --port <port>', 'Port number', '3100')
  .action(async (opts) => {
    await startApiServer(Number(opts.port))
  })

program.parse()

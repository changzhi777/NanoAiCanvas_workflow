import chalk from 'chalk'

// chalk may not be installed, fallback to plain
const c = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
}

export function logInfo(msg: string): void {
  console.log(c.blue('ℹ') + ` ${msg}`)
}

export function logSuccess(msg: string): void {
  console.log(c.green('✔') + ` ${msg}`)
}

export function logError(msg: string): void {
  console.error(c.red('✖') + ` ${msg}`)
}

export function logWarn(msg: string): void {
  console.warn(c.yellow('⚠') + ` ${msg}`)
}

/** 简易进度条 */
export function progressBar(stage: string, pct: number, width = 30): void {
  const filled = Math.round((pct / 100) * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  process.stdout.write(`\r  ${c.dim(stage)} [${bar}] ${pct}%`)
  if (pct >= 100) process.stdout.write('\n')
}

/** 生成文件名时间戳 (YYYYMMDD_HHMMSS) */
export function fileTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

// dsh-deslop — persistent settings (custom rules, default mode) for CLI use.
// Stored at ~/.config/dsh-deslop/settings.json
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'

const SETTINGS_DIR = join(homedir(), '.config', 'dsh-deslop')
const SETTINGS_FILE = join(SETTINGS_DIR, 'settings.json')

export function loadSettings() {
  try {
    if (!existsSync(SETTINGS_FILE)) return { mode: 'normal', custom: [], disable: [] }
    return JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'))
  } catch {
    return { mode: 'normal', custom: [], disable: [] }
  }
}

export function saveSettings(s) {
  mkdirSync(dirname(SETTINGS_FILE), { recursive: true })
  writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2) + '\n')
}

export { SETTINGS_FILE }

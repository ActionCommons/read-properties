/**
 * © 2026-present Action Commons (https://github.com/ActionCommons)
 */

import { readFileSync } from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A resolved file entry with its deduped output name and property filter. */
export interface FileSpec {
  /** Absolute or relative path to the .properties file. */
  filePath: string
  /**
   * Property keys to include in outputs.
   * `undefined` means "all keys" (the `all` default).
   */
  propertyFilter?: string[]
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parses the raw text content of a Java-style .properties file into a
 * key-value record.
 *
 * Supported syntax:
 *  - `key=value` and `key: value` assignment forms
 *  - `#` and `!` line comments
 *  - Backslash (`\`) line-continuation
 *  - Leading whitespace stripped from keys and values
 *
 * @param content Raw UTF-8 text of the .properties file.
 * @returns A plain object mapping every parsed key to its value.
 */
export function parsePropertiesContent(
  content: string
): Record<string, string> {
  const result: Record<string, string> = {}
  const rawLines = content.split(/\r?\n/)

  let i = 0
  while (i < rawLines.length) {
    // Strip leading whitespace before checking for comments / emptiness.
    let line = rawLines[i].trimStart()
    i++

    // Skip blank lines and comment lines.
    if (line === '' || line.startsWith('#') || line.startsWith('!')) continue

    // Accumulate continuation lines (trailing backslash).
    while (line.endsWith('\\') && i < rawLines.length) {
      line = line.slice(0, -1) + rawLines[i].trimStart()
      i++
    }

    // Match   key = value   or   key: value   (separator may be surrounded by spaces).
    const match = line.match(/^([^=:\s][^=:]*?)\s*[=:]\s*(.*)$/)
    if (!match) continue

    result[match[1].trim()] = match[2].trim()
  }

  return result
}

/**
 * Reads and parses a .properties file from disk.
 *
 * @param filePath Path to the .properties file.
 * @returns Parsed key-value record.
 * @throws If the file cannot be read.
 */
export function parsePropertiesFile(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, 'utf-8')
  return parsePropertiesContent(content)
}

// ---------------------------------------------------------------------------
// Output-name helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the stem (filename without extension) from a path.
 *
 * @example getFileStem('/path/to/config.properties') // → 'config'
 * @example getFileStem('app')                        // → 'app'
 */
export function getFileStem(filePath: string): string {
  const base = path.basename(filePath)
  const dotIndex = base.lastIndexOf('.')
  return dotIndex > 0 ? base.slice(0, dotIndex) : base
}

/**
 * Assigns a unique output-group name to each file path.
 *
 * The first file with a given stem keeps the plain stem; subsequent files
 * with the same stem receive a 1-based numeric suffix.
 *
 * @example
 *   assignOutputNames(['a/config.properties', 'b/config.properties', 'app.properties'])
 *   // → ['config', 'config1', 'app']
 *
 * @param filePaths Ordered list of file paths.
 * @returns Parallel array of unique output-group names.
 */
export function assignOutputNames(filePaths: string[]): string[] {
  const stemCount = new Map<string, number>()
  const names: string[] = []

  for (const filePath of filePaths) {
    const stem = getFileStem(filePath)
    const count = stemCount.get(stem) ?? 0
    stemCount.set(stem, count + 1)
    // First occurrence → plain stem; second → stem1; third → stem2; etc.
    names.push(count === 0 ? stem : `${stem}${count}`)
  }

  return names
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Returns only the requested subset of a properties record.
 *
 * When `keys` is `undefined` or empty the full record is returned unchanged
 * (this implements the `all` default behaviour).
 *
 * @param properties The parsed properties record.
 * @param keys       Keys to keep; `undefined` means keep all.
 * @returns Filtered key-value record.
 */
export function filterProperties(
  properties: Record<string, string>,
  keys?: string[]
): Record<string, string> {
  if (!keys || keys.length === 0) return { ...properties }

  return Object.fromEntries(
    keys
      .filter((k) => Object.prototype.hasOwnProperty.call(properties, k))
      .map((k) => [k, properties[k]])
  )
}

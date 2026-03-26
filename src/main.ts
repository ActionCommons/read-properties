/**
 * © 2026-present Action Commons (https://github.com/ActionCommons)
 */

import * as core from '@actions/core'
import {
  assignOutputNames,
  filterProperties,
  parsePropertiesFile
} from './properties.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the property filter from the `properties` input.
 *
 *  - Empty / omitted → `undefined` (read all properties, the default)
 *  - One or more newline-delimited keys → array of keys to include
 *
 * @param properties Raw value of the `properties` input.
 * @returns An array of keys to include, or `undefined` for "all".
 */
function resolveFilter(properties: string): string[] | undefined {
  const lines = properties
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  return lines.length > 0 ? lines : undefined
}

/**
 * Parses a newline-delimited multiline input into an array of non-empty paths.
 *
 * @param input Raw value from `core.getInput`.
 * @returns Trimmed, non-empty path strings.
 */
function splitPaths(input: string): string[] {
  return input
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean)
}

// ---------------------------------------------------------------------------
// Action entry-point
// ---------------------------------------------------------------------------

/**
 * Main action logic.
 *
 * Reads one or more .properties files and exposes each property as a step
 * output keyed by `<outputName>.<propertyKey>`, where `outputName` is derived
 * from the file's stem (deduplicated with a numeric suffix when two files
 * share the same stem).
 *
 * Input schema
 * ────────────
 * files                Newline-separated list of one or more .properties file paths
 * properties           Newline-separated list of property keys to read (default: all)
 *
 * Output schema
 * ─────────────
 * <stem>.<key>  e.g. config.host, config.port
 *
 * When two files share the same stem the second receives a "1" suffix, the
 * third "2", and so on:
 *   config.host   ← first  config.properties
 *   config1.host  ← second config.properties
 *
 * @returns Resolves when all outputs have been set.
 */
export async function run(): Promise<void> {
  try {
    const filesInput = core.getInput('files')

    if (!filesInput.trim()) {
      core.setFailed('The "files" input must be provided.')
      return
    }

    const filePaths = splitPaths(filesInput)
    const propertyFilter = resolveFilter(core.getInput('properties'))
    const outputNames = assignOutputNames(filePaths)

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i]
      const outputName = outputNames[i]

      core.debug(`Processing "${filePath}" → output group "${outputName}"`)

      const allProps = parsePropertiesFile(filePath)
      const props = filterProperties(allProps, propertyFilter)

      const totalCount = Object.keys(allProps).length
      const totalLabel = totalCount === 1 ? 'property' : 'properties'
      core.info(
        `"${outputName}": setting ${Object.keys(props).length} output(s) ` +
          `(${totalCount} ${totalLabel} total)`
      )

      for (const [key, value] of Object.entries(props)) {
        const outputKey = `${outputName}.${key}`
        core.debug(`  ${outputKey}=${value}`)
        core.setOutput(outputKey, value)
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

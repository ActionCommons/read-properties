/**
 * © 2026-present Action Commons (https://github.com/ActionCommons)
 */

import { jest } from '@jest/globals'
import type { parsePropertiesFile as ParseFn } from '../src/properties.js'

export const parsePropertiesFile = jest.fn<typeof ParseFn>()

// Re-export the real (non-I/O) helpers so callers that only mock
// parsePropertiesFile still get the correct implementations.
export {
  parsePropertiesContent,
  assignOutputNames,
  filterProperties,
  getFileStem
} from '../src/properties.js'

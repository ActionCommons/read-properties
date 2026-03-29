/**
 * © 2026-present Action Commons (https://github.com/ActionCommons)
 *
 * Unit tests for src/properties.ts
 *
 * parsePropertiesContent, getFileStem, assignOutputNames and filterProperties
 * are pure functions and tested directly.
 *
 * parsePropertiesFile uses readFileSync; it is tested against the real
 * fixture files in __fixtures__/.
 */

import { resolve } from 'path'
import { fileURLToPath } from 'url'
import {
  assignOutputNames,
  filterProperties,
  getFileStem,
  parsePropertiesContent,
  parsePropertiesFile
} from '../src/properties.js'

// Resolve the fixtures directory so tests work from any cwd.
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const fixturesDir = resolve(__dirname, '../__fixtures__')
const fixture = (name: string): string => resolve(fixturesDir, name)

// ---------------------------------------------------------------------------
// parsePropertiesContent
// ---------------------------------------------------------------------------
describe('parsePropertiesContent', () => {
  it('parses key=value pairs', () => {
    const result = parsePropertiesContent('host=localhost\nport=5432')
    expect(result).toEqual({ host: 'localhost', port: '5432' })
  })

  it('parses key: value (colon separator)', () => {
    const result = parsePropertiesContent('host: localhost\nport: 5432')
    expect(result).toEqual({ host: 'localhost', port: '5432' })
  })

  it('ignores # comment lines', () => {
    const result = parsePropertiesContent('# comment\nkey=value')
    expect(result).toEqual({ key: 'value' })
  })

  it('ignores ! comment lines', () => {
    const result = parsePropertiesContent('! comment\nkey=value')
    expect(result).toEqual({ key: 'value' })
  })

  it('ignores empty lines', () => {
    const result = parsePropertiesContent('\n\nkey=value\n\n')
    expect(result).toEqual({ key: 'value' })
  })

  it('trims leading whitespace from keys', () => {
    const result = parsePropertiesContent('  key=value')
    expect(result).toEqual({ key: 'value' })
  })

  it('trims whitespace around the separator', () => {
    const result = parsePropertiesContent('key = value')
    expect(result).toEqual({ key: 'value' })
  })

  it('handles continuation lines with backslash', () => {
    const content = 'long=first part \\\n  second part \\\n  third part'
    const result = parsePropertiesContent(content)
    expect(result['long']).toBe('first part second part third part')
  })

  it('handles empty values', () => {
    const result = parsePropertiesContent('empty=')
    expect(result).toEqual({ empty: '' })
  })

  it('allows equals signs inside the value', () => {
    const result = parsePropertiesContent('conn=host=localhost;port=5432')
    expect(result['conn']).toBe('host=localhost;port=5432')
  })

  it('handles Windows-style CRLF line endings', () => {
    const result = parsePropertiesContent('key1=val1\r\nkey2=val2')
    expect(result).toEqual({ key1: 'val1', key2: 'val2' })
  })

  it('returns an empty object for empty content', () => {
    expect(parsePropertiesContent('')).toEqual({})
  })

  it('returns an empty object for content with only comments', () => {
    expect(parsePropertiesContent('# nothing\n! nothing')).toEqual({})
  })

  it('skips lines that have no valid separator (no = or :)', () => {
    // Covers the `if (!match) continue` branch - a non-comment, non-blank line
    // that doesn't contain a key=value or key:value pattern is silently ignored.
    const result = parsePropertiesContent(
      'validKey=validValue\njustakeynovalue\nanotherValid=yes'
    )
    expect(result).toEqual({ validKey: 'validValue', anotherValid: 'yes' })
    expect(result['justakeynovalue']).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// parsePropertiesFile
// ---------------------------------------------------------------------------
describe('parsePropertiesFile', () => {
  it('reads and parses a real .properties file', () => {
    const result = parsePropertiesFile(fixture('config.properties'))
    expect(result['db.host']).toBe('localhost')
    expect(result['db.port']).toBe('5432')
    expect(result['app.name']).toBe('My Application')
  })

  it('handles edge-case syntax in a real file', () => {
    const result = parsePropertiesFile(fixture('edge-cases.properties'))
    expect(result['server']).toBe('example.com') // colon separator
    expect(result['timeout']).toBe('30') // spaces around =
    expect(result['long.value']).toBe('first part second part third part') // continuation
    expect(result['empty.key']).toBe('') // empty value
    expect(result['connection.string']).toBe('host=localhost;port=5432')
  })

  it('throws when the file does not exist', () => {
    expect(() => parsePropertiesFile('/no/such/file.properties')).toThrow()
  })
})

// ---------------------------------------------------------------------------
// getFileStem
// ---------------------------------------------------------------------------
describe('getFileStem', () => {
  it('strips a single extension', () => {
    expect(getFileStem('config.properties')).toBe('config')
  })

  it('strips only the last extension for dotted filenames', () => {
    expect(getFileStem('app.config.properties')).toBe('app.config')
  })

  it('works with absolute paths', () => {
    expect(getFileStem('/path/to/settings.properties')).toBe('settings')
  })

  it('returns the whole basename when there is no extension', () => {
    expect(getFileStem('Makefile')).toBe('Makefile')
  })

  it('handles a leading dot (hidden file without extension)', () => {
    // ".env" → the dot is at index 0, so there is no extension; return full base
    expect(getFileStem('.env')).toBe('.env')
  })
})

// ---------------------------------------------------------------------------
// assignOutputNames
// ---------------------------------------------------------------------------
describe('assignOutputNames', () => {
  it('returns the plain stem for a single file', () => {
    expect(assignOutputNames(['config.properties'])).toEqual(['config'])
  })

  it('deduplicates same-stem files with a numeric suffix', () => {
    const paths = [
      'a/config.properties',
      'b/config.properties',
      'c/config.properties'
    ]
    expect(assignOutputNames(paths)).toEqual(['config', 'config1', 'config2'])
  })

  it('does not clash different-stem files', () => {
    const paths = ['app.properties', 'config.properties']
    expect(assignOutputNames(paths)).toEqual(['app', 'config'])
  })

  it('handles an empty list', () => {
    expect(assignOutputNames([])).toEqual([])
  })

  it('handles mixed duplicate and unique stems', () => {
    const paths = ['config.properties', 'app.properties', 'config.properties']
    expect(assignOutputNames(paths)).toEqual(['config', 'app', 'config1'])
  })
})

// ---------------------------------------------------------------------------
// filterProperties
// ---------------------------------------------------------------------------
describe('filterProperties', () => {
  const props = { host: 'localhost', port: '5432', name: 'mydb' }

  it('returns all properties when keys is undefined', () => {
    expect(filterProperties(props)).toEqual(props)
  })

  it('returns all properties when keys is an empty array', () => {
    expect(filterProperties(props, [])).toEqual(props)
  })

  it('filters to a single requested key', () => {
    expect(filterProperties(props, ['host'])).toEqual({ host: 'localhost' })
  })

  it('filters to multiple requested keys', () => {
    expect(filterProperties(props, ['host', 'name'])).toEqual({
      host: 'localhost',
      name: 'mydb'
    })
  })

  it('ignores keys that do not exist in the source', () => {
    expect(filterProperties(props, ['host', 'nonexistent'])).toEqual({
      host: 'localhost'
    })
  })

  it('returns an empty object when none of the requested keys exist', () => {
    expect(filterProperties(props, ['missing'])).toEqual({})
  })

  it('does not mutate the original object', () => {
    const original = { host: 'localhost' }
    filterProperties(original, ['host'])
    expect(original).toEqual({ host: 'localhost' })
  })
})

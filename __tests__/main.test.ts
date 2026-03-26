/**
 * © 2026-present Action Commons (https://github.com/ActionCommons)
 *
 * Unit tests for src/main.ts
 *
 * @actions/core is mocked via __fixtures__/core.ts so no real outputs are set.
 * src/properties.ts is mocked via __fixtures__/properties.ts so no real files
 * are read from disk.
 */

import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import * as propertiesMock from '../__fixtures__/properties.js'

// ── Module mocks (must be declared before the module under test is imported) ──
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('../src/properties.js', () => propertiesMock)

// Dynamic import ensures mocks are in place before the module executes.
const { run } = await import('../src/main.js')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Configures core.getInput to return different values by input name. */
function mockInputs(inputs: Record<string, string>): void {
  core.getInput.mockImplementation((name: string) => inputs[name] ?? '')
}

/** Collects all calls to core.setOutput as a plain object. */
function capturedOutputs(): Record<string, string> {
  return Object.fromEntries(
    (core.setOutput.mock.calls as [string, string][]).map(([k, v]) => [k, v])
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('run()', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  // ── Validation ────────────────────────────────────────────────────────────
  describe('input validation', () => {
    it('fails when files is not provided', async () => {
      mockInputs({})
      await run()
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('"files"')
      )
      expect(core.setOutput).not.toHaveBeenCalled()
    })

    it('fails when files is blank whitespace', async () => {
      mockInputs({ files: '   ' })
      await run()
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('"files"')
      )
      expect(core.setOutput).not.toHaveBeenCalled()
    })
  })

  // ── All properties (no filter) ────────────────────────────────────────────
  describe('reading all properties', () => {
    it('reads all properties from a single file', async () => {
      mockInputs({ files: 'config.properties' })
      propertiesMock.parsePropertiesFile.mockReturnValue({
        'db.host': 'localhost',
        'db.port': '5432'
      })

      await run()

      expect(propertiesMock.parsePropertiesFile).toHaveBeenCalledWith(
        'config.properties'
      )
      expect(capturedOutputs()).toEqual({
        'config.db.host': 'localhost',
        'config.db.port': '5432'
      })
    })

    it('reads all properties from multiple files', async () => {
      mockInputs({ files: 'config.properties\napp.properties' })
      propertiesMock.parsePropertiesFile
        .mockReturnValueOnce({ 'db.host': 'localhost' })
        .mockReturnValueOnce({ version: '1.0.0' })

      await run()

      expect(capturedOutputs()).toEqual({
        'config.db.host': 'localhost',
        'app.version': '1.0.0'
      })
    })

    it('ignores blank lines in the files input', async () => {
      mockInputs({ files: '\n  \na.properties\n\nb.properties\n' })
      propertiesMock.parsePropertiesFile
        .mockReturnValueOnce({ x: '1' })
        .mockReturnValueOnce({ x: '2' })

      await run()

      expect(propertiesMock.parsePropertiesFile).toHaveBeenCalledTimes(2)
    })
  })

  // ── Property filter ───────────────────────────────────────────────────────
  describe('properties filter', () => {
    it('reads only the listed properties from a single file', async () => {
      mockInputs({
        files: 'config.properties',
        properties: 'db.host\ndb.port'
      })
      propertiesMock.parsePropertiesFile.mockReturnValue({
        'db.host': 'localhost',
        'db.port': '5432',
        'app.name': 'X'
      })

      await run()

      const out = capturedOutputs()
      expect(out).toEqual({
        'config.db.host': 'localhost',
        'config.db.port': '5432'
      })
      expect(out['config.app.name']).toBeUndefined()
    })

    it('applies the same filter to every file', async () => {
      mockInputs({
        files: 'a.properties\nb.properties',
        properties: 'host\nport'
      })
      propertiesMock.parsePropertiesFile
        .mockReturnValueOnce({ host: 'alpha', port: '80', extra: 'x' })
        .mockReturnValueOnce({ host: 'beta', port: '81', extra: 'y' })

      await run()

      const out = capturedOutputs()
      expect(out['a.host']).toBe('alpha')
      expect(out['a.port']).toBe('80')
      expect(out['a.extra']).toBeUndefined()
      expect(out['b.host']).toBe('beta')
      expect(out['b.port']).toBe('81')
      expect(out['b.extra']).toBeUndefined()
    })

    it('sets no outputs (but does not fail) when the property key does not exist', async () => {
      mockInputs({ files: 'config.properties', properties: 'missing' })
      propertiesMock.parsePropertiesFile.mockReturnValue({
        'db.host': 'localhost'
      })

      await run()

      expect(core.setFailed).not.toHaveBeenCalled()
      expect(core.setOutput).not.toHaveBeenCalled()
    })

    it('ignores blank lines in the properties input', async () => {
      mockInputs({
        files: 'config.properties',
        properties: '\n  \ndb.host\n\ndb.port\n'
      })
      propertiesMock.parsePropertiesFile.mockReturnValue({
        'db.host': 'localhost',
        'db.port': '5432',
        'app.name': 'X'
      })

      await run()

      expect(capturedOutputs()).toEqual({
        'config.db.host': 'localhost',
        'config.db.port': '5432'
      })
    })
  })

  // ── Stem deduplication ────────────────────────────────────────────────────
  describe('stem deduplication', () => {
    it('deduplicates output group names when files share the same stem', async () => {
      mockInputs({
        files: [
          'path/a/config.properties',
          'path/b/config.properties',
          'app.properties'
        ].join('\n')
      })
      propertiesMock.parsePropertiesFile
        .mockReturnValueOnce({ host: 'a-host' })
        .mockReturnValueOnce({ host: 'b-host' })
        .mockReturnValueOnce({ name: 'myapp' })

      await run()

      expect(capturedOutputs()).toEqual({
        'config.host': 'a-host',
        'config1.host': 'b-host',
        'app.name': 'myapp'
      })
    })
  })

  // ── Error handling ────────────────────────────────────────────────────────
  describe('error handling', () => {
    it('calls core.setFailed when parsePropertiesFile throws', async () => {
      mockInputs({ files: 'missing.properties' })
      propertiesMock.parsePropertiesFile.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        'ENOENT: no such file or directory'
      )
    })

    it('does not call core.setFailed when a non-Error value is thrown', async () => {
      // Covers the `if (error instanceof Error)` false-branch in the catch block.
      mockInputs({ files: 'config.properties' })
      propertiesMock.parsePropertiesFile.mockImplementation(() => {
        throw 'unexpected non-Error rejection'
      })

      await run()

      expect(core.setFailed).not.toHaveBeenCalled()
    })
  })
})

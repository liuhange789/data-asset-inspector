import { describe, expect, it } from 'vitest'
import * as invariantModule from '../src/invariant.js'

describe('invariant', () => {
  it('exports the package name and a no-op install', () => {
    expect(invariantModule.invariant).toBe('data-packaging')
    expect(() => invariantModule.install()).not.toThrow()
  })
})
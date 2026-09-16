import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import DependencyResolver from '../../src/reactivity/dependency-resolver.js'

const { findMatchingDependencies } = DependencyResolver

const dependencies = {
    'firstName': ['fullName'],
    'lastName': ['fullName'],
    'wage': ['showWage', 'fullInfo'],
    'fullName': ['fullInfo'],
    'model.rawPersonData': ['beautifiedPersonData']
}

describe('findMatchingDependencies', () => {
    test('returns direct dependency match', () => {
        const result = findMatchingDependencies('firstName', dependencies)
        assert.ok(result.includes('fullName'))
    })

    test('returns multiple direct matches', () => {
        const result = findMatchingDependencies('wage', dependencies)
        assert.ok(result.includes('showWage'))
        assert.ok(result.includes('fullInfo'))
    })

    test('resolves transitive dependencies (A → B → C)', () => {
        const result = findMatchingDependencies('firstName', dependencies)
        assert.ok(result.includes('fullName'))
        assert.ok(result.includes('fullInfo'))
    })

    test('resolves subpath match with suffix appended', () => {
        const result = findMatchingDependencies('model.rawPersonData.0.name', dependencies)
        assert.ok(result.includes('beautifiedPersonData.0.name'))
    })

    test('returns empty array when no dependencies match', () => {
        const result = findMatchingDependencies('unknownKey', dependencies)
        assert.deepEqual(result, [])
    })

    test('returns no duplicates', () => {
        const result = findMatchingDependencies('wage', dependencies)
        const unique = [...new Set(result)]
        assert.deepEqual(result, unique)
    })

    test('prevents infinite loop on circular dependencies', () => {
        const circularDependencies = {
            'a': ['b'],
            'b': ['a']
        }
        assert.doesNotThrow(() => findMatchingDependencies('a', circularDependencies))
    })

    test('returns empty array for empty dependencies', () => {
        const result = findMatchingDependencies('firstName', {})
        assert.deepEqual(result, [])
    })
})
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import AliasResolver from '../../src/resolution/alias-resolver.js'

describe('resolveEachAlias', () => {
    test('returns alias unchanged without #', () => {
        assert.equal(AliasResolver.resolveEachAlias('item', new Map()), 'item')
    })

    test('creates level-based alias for # suffix', () => {
        const contextStack = new Map([
            ['item-level-0', { data: {}, fullKey: 'items' }]
        ])

        assert.equal(AliasResolver.resolveEachAlias('item#', contextStack), 'item-level-1')
    })
})

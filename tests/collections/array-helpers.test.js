import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import ArrayHelpers from '../../src/collections/array-helpers.js'

describe('removeByReference', () => {
    test('removes matching object from array and returns index', () => {
        const a = { id: 1 }
        const b = { id: 2 }
        const list = [a, b]

        const index = ArrayHelpers.removeByReference(list, b)

        assert.equal(index, 1)
        assert.deepEqual(list, [a])
    })

    test('returns -1 and keeps array unchanged when item is missing', () => {
        const a = { id: 1 }
        const b = { id: 2 }
        const c = { id: 3 }
        const list = [a, b]

        const index = ArrayHelpers.removeByReference(list, c)

        assert.equal(index, -1)
        assert.deepEqual(list, [a, b])
    })

    test('throws for non-array input', () => {
        assert.throws(
            () => ArrayHelpers.removeByReference(null, {}),
            /expects an array as the first argument/
        )
    })
})

describe('getParentContext', () => {
    test('returns parent context entry from contextStack', () => {
        const parentEntry = { data: { children: [] } }
        const contextStack = new Map([
            ['item-level-0', parentEntry],
            ['item-level-1', { data: {} }],
            ['x', 1]
        ])

        const result = ArrayHelpers.getParentContext(contextStack)

        assert.strictEqual(result, parentEntry)
    })

    test('works with custom aliasBase', () => {
        const parentEntry = { data: { items: [] } }
        const contextStack = new Map([
            ['node-level-0', parentEntry],
            ['node-level-1', { data: {} }],
            ['x', 1]
        ])

        const result = ArrayHelpers.getParentContext(contextStack, 'node')

        assert.strictEqual(result, parentEntry)
    })

    test('returns undefined when contextStack is null', () => {
        assert.equal(ArrayHelpers.getParentContext(null), undefined)
    })

    test('composes cleanly with removeByReference', () => {
        const childA = { id: 'a' }
        const childB = { id: 'b' }
        const contextStack = new Map([
            ['item-level-0', { data: { children: [childA, childB] } }],
            ['item-level-1', { data: childA }],
            ['x', 1]
        ])

        ArrayHelpers.removeByReference(ArrayHelpers.getParentContext(contextStack)?.data?.children, childB)

        assert.deepEqual(contextStack.get('item-level-0').data.children, [childA])
    })
})

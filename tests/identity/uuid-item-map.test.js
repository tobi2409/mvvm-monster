import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import UuidItemMap from '../../src/identity/uuid-item-map.js'

describe('UuidItemMap', () => {
    test('stores and retrieves item by uuid', () => {
        const item = { name: 'Alice' }
        const uuid = UuidItemMap.ensureUuidForItem(item)

        assert.ok(uuid.startsWith('__uuid__'))
        assert.strictEqual(UuidItemMap.getItemByUuid(uuid), item)
        assert.strictEqual(UuidItemMap.getUuidByItem(item), uuid)
    })

    test('returns undefined for primitive items', () => {
        assert.equal(UuidItemMap.ensureUuidForItem('John'), undefined)
    })
})
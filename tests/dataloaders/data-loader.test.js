import test from 'node:test'
import assert from 'node:assert/strict'

import DataLoader from '../../src/dataloaders/data-loader.js'
import JournalControl from '../../src/reactivity/journal-control.js'

test('loads data into one direct-model array', () => {
    const data = [{ id: 1, name: 'old' }]

    const splice = data.splice
    
    Object.defineProperty(data, 'splice', {
        value: function (...args) {
            assert.equal(JournalControl.isJournalingDisabled(), true)
            return splice.apply(this, args)
        }
    })

    const result = DataLoader.loadNextData(
        [{ id: 2, name: 'new' }],
        data,
        false
    )

    assert.strictEqual(result, data)
    assert.deepEqual(data, [{ id: 2, name: 'new' }])
    assert.equal(JournalControl.isJournalingDisabled(), false)
})

test('resolves and appends nested direct-mode data', () => {
    const parent = { children: { data: [{ id: 1 }] } }

    DataLoader.load(
        [{ id: 2 }],
        parent,
        { data: [] },
        true
    )

    assert.deepEqual(parent.children.data, [{ id: 1 }, { id: 2 }])
})

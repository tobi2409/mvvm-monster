import test from 'node:test'
import assert from 'node:assert/strict'

import MVVMDataLoader from '../../src/dataloaders/mvvm-data-loader.js'
import JournalControl from '../../src/reactivity/journal-control.js'
import ModelSynchronization from '../../src/model/model-synchronization.js'

function setMetadata(viewModelArrayData, modelArray, transform) {
    Object.defineProperties(viewModelArrayData, {
        __modelArray__: { value: modelArray },
        __transform__: { value: transform }
    })
}

test('loads data into model and transformed view model arrays', async () => {
    const modelArray = []
    const viewModelArray = []

    setMetadata(viewModelArray, modelArray, (item) => {
        assert.equal(JournalControl.isJournalingDisabled(), true)
        assert.equal(ModelSynchronization.isModelSynchronizationDisabled(), true)
        return { id: item.id, label: item.name.toUpperCase() }
    })

    await MVVMDataLoader.loadData(
        [{ id: 1, name: 'alpha' }],
        viewModelArray
    )

    assert.deepEqual(modelArray, [{ id: 1, name: 'alpha' }])
    assert.deepEqual(viewModelArray, [{ id: 1, label: 'ALPHA' }])
    assert.strictEqual(viewModelArray[0].__modelItem__, modelArray[0])
    assert.equal(JournalControl.isJournalingDisabled(), false)
    assert.equal(ModelSynchronization.isModelSynchronizationDisabled(), false)
})

test('loadData appends model and transformed view model items', async () => {
    const modelArray = [{ id: 1, name: 'alpha' }]
    const viewModelArray = [{ id: 1, name: 'ALPHA' }]

    setMetadata(viewModelArray, modelArray, (item) => ({ id: item.id, name: item.name.toUpperCase() }))

    await MVVMDataLoader.loadData(
        [{ id: 2, name: 'beta' }],
        viewModelArray,
        true
    )

    assert.deepEqual(modelArray, [
        { id: 1, name: 'alpha' },
        { id: 2, name: 'beta' }
    ])

    assert.deepEqual(viewModelArray, [
        { id: 1, name: 'ALPHA' },
        { id: 2, name: 'BETA' }
    ])
    
    assert.strictEqual(viewModelArray[1].__modelItem__, modelArray[1])
})

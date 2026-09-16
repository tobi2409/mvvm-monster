import test from 'node:test'
import assert from 'node:assert/strict'

import MVVMDataLoader from '../../src/dataloaders/mvvm-data-loader.js'
import JournalControl from '../../src/reactivity/journal-control.js'
import ModelSynchronization from '../../src/model/model-synchronization.js'

function setTransform(viewModelArrayData, transform) {
    Object.defineProperty(viewModelArrayData, '__transform__', { value: transform })
}

test('getLoadTargets returns root arrays when no parent item exists', () => {
    const rootModelArray = [{ id: 1, children: [] }]
    const rootViewModelArray = [{ id: 1, children: [] }]

    const result = MVVMDataLoader.getLoadTargets(undefined, undefined, rootViewModelArray, rootModelArray)

    assert.equal(result.viewModelArray, rootViewModelArray)
    assert.equal(result.modelItem, undefined)
    assert.equal(result.modelArray, rootModelArray)
})

test('getLoadTargets resolves nested child arrays using the model parent', () => {
    const rootModelArray = [{ id: 1, children: [] }]
    const rootViewModelArray = [{ id: 1, children: [] }]
    const parent = { id: 7, children: [{ id: 9, children: [] }] }

    const result = MVVMDataLoader.getLoadTargets(parent, parent, rootViewModelArray, rootModelArray)

    assert.deepEqual(result.modelItem, parent)
    assert.deepEqual(result.modelArray, parent.children)
    assert.deepEqual(result.viewModelArray, parent.children)
})

test('loads data into model and transformed view model arrays', async () => {
    const modelArray = []
    const viewModelArray = []

    setTransform(viewModelArray, (item) => {
        assert.equal(JournalControl.isJournalingDisabled(), true)
        assert.equal(ModelSynchronization.isModelSynchronizationDisabled(), true)
        return { id: item.id, label: item.name.toUpperCase() }
    })

    await MVVMDataLoader.loadNextData(
        [{ id: 1, name: 'alpha' }],
        viewModelArray,
        modelArray
    )

    assert.deepEqual(modelArray, [{ id: 1, name: 'alpha' }])
    assert.deepEqual(viewModelArray, [{ id: 1, label: 'ALPHA' }])
    assert.equal(JournalControl.isJournalingDisabled(), false)
    assert.equal(ModelSynchronization.isModelSynchronizationDisabled(), false)
})

test('loadNextData appends model and transformed view model items', async () => {
    const modelArray = [{ id: 1, name: 'alpha' }]
    const viewModelArray = [{ id: 1, name: 'ALPHA' }]

    setTransform(viewModelArray, (item) => ({ id: item.id, name: item.name.toUpperCase() }))

    await MVVMDataLoader.loadNextData(
        [{ id: 2, name: 'beta' }],
        viewModelArray,
        modelArray,
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
})

test('load resolves nested targets and replaces their data', async () => {
    const modelParent = { children: [{ id: 1, name: 'old' }] }
    const viewModelParent = { children: { data: [{ id: 1, label: 'OLD' }] } }
    const nextData = [{ id: 2, name: 'new' }]

    setTransform(viewModelParent.children.data, (item) => ({ id: item.id, label: item.name.toUpperCase() }))

    const result = await MVVMDataLoader.load(
        nextData,
        viewModelParent,
        modelParent,
        { data: [] },
        []
    )

    assert.deepEqual(modelParent.children, nextData)
    assert.deepEqual(viewModelParent.children.data, [{ id: 2, label: 'NEW' }])
    assert.strictEqual(result, viewModelParent.children.data)
})

test('load accepts append before target options', async () => {
    const modelParent = { descendants: [{ id: 1, name: 'old' }] }
    const viewModelParent = { descendants: { data: [{ id: 1, label: 'OLD' }] } }

    setTransform(viewModelParent.descendants.data, (item) => ({ id: item.id, label: item.name.toUpperCase() }))

    await MVVMDataLoader.load(
        [{ id: 2, name: 'new' }],
        viewModelParent,
        modelParent,
        { data: [] },
        [],
        true,
        {
            viewModelChildrenKey: 'descendants',
            modelChildrenKey: 'descendants'
        }
    )

    assert.deepEqual(modelParent.descendants, [
        { id: 1, name: 'old' },
        { id: 2, name: 'new' }
    ])

    assert.deepEqual(viewModelParent.descendants.data, [
        { id: 1, label: 'OLD' },
        { id: 2, label: 'NEW' }
    ])
})
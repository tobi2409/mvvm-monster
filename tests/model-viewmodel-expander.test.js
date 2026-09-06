import test from 'node:test'
import assert from 'node:assert/strict'

import ModelViewModelExpander from '../src/model-viewmodel-expander.js'
import JournalControl from '../src/components/reactivity-helpers/journal-control.js'

function setTransform(viewModelArrayData, transform) {
    Object.defineProperty(viewModelArrayData, '__transform__', { value: transform })
}

test('getExpandTargets returns root arrays when no parent item exists', () => {
    const rootModelArray = [{ id: 1, children: [] }]
    const rootViewModelArray = [{ id: 1, children: [] }]

    const result = ModelViewModelExpander.getExpandTargets(undefined, undefined, rootViewModelArray, rootModelArray)

    assert.equal(result.viewModelArray, rootViewModelArray)
    assert.equal(result.modelItem, undefined)
    assert.equal(result.modelArray, rootModelArray)
})

test('getExpandTargets resolves nested child arrays using the model parent', () => {
    const rootModelArray = [{ id: 1, children: [] }]
    const rootViewModelArray = [{ id: 1, children: [] }]
    const parent = { id: 7, children: [{ id: 9, children: [] }] }
    const result = ModelViewModelExpander.getExpandTargets(parent, parent, rootViewModelArray, rootModelArray)

    assert.deepEqual(result.modelItem, { id: 7, children: [{ id: 9, children: [] }] })
    assert.deepEqual(result.modelArray, [{ id: 9, children: [] }])
    assert.deepEqual(result.viewModelArray, [{ id: 9, children: [] }])
})

test('expandNextData replaces model and view model arrays', () => {
    const modelArray = [{ id: 1, name: 'old' }]
    const viewModelArray = [{ id: 1, name: 'OLD' }]
    const nextData = [{ id: 2, name: 'beta' }, { id: 3, name: 'gamma' }]
    setTransform(viewModelArray, (item) => {
        assert.equal(JournalControl.isJournalingDisabled(), true)
        return { id: item.id, name: item.name.toUpperCase() }
    })

    const result = ModelViewModelExpander.expandNextData(
        nextData,
        viewModelArray,
        modelArray
    )

    assert.deepEqual(modelArray, nextData)
    assert.deepEqual(viewModelArray, [
        { id: 2, name: 'BETA' },
        { id: 3, name: 'GAMMA' }
    ])
    assert.equal(result, viewModelArray)
    assert.equal(JournalControl.isJournalingDisabled(), false)
})

test('expandNextData appends model and transformed view model items', () => {
    const modelArray = [{ id: 1, name: 'alpha' }]
    const viewModelArray = [{ id: 1, name: 'ALPHA' }]
    const nextData = [{ id: 2, name: 'beta' }]
    setTransform(viewModelArray, (item) => ({ id: item.id, name: item.name.toUpperCase() }))

    ModelViewModelExpander.expandNextData(
        nextData,
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
    assert.equal(JournalControl.isJournalingDisabled(), false)
})

test('expand resolves nested targets and replaces their data', () => {
    const modelParent = { children: [{ id: 1, name: 'old' }] }
    const viewModelParent = { children: { data: [{ id: 1, label: 'OLD' }] } }
    const rootModelArray = []
    const rootViewModelArray = { data: [] }
    const nextData = [{ id: 2, name: 'new' }]
    setTransform(viewModelParent.children.data, (item) => ({ id: item.id, label: item.name.toUpperCase() }))

    const result = ModelViewModelExpander.expand(
        nextData,
        viewModelParent,
        modelParent,
        rootViewModelArray,
        rootModelArray
    )

    assert.deepEqual(modelParent.children, nextData)
    assert.deepEqual(viewModelParent.children.data, [{ id: 2, label: 'NEW' }])
    assert.strictEqual(result, viewModelParent.children.data)
})

test('expand accepts append before target options', () => {
    const modelParent = { descendants: [{ id: 1, name: 'old' }] }
    const viewModelParent = { descendants: { data: [{ id: 1, label: 'OLD' }] } }
    setTransform(viewModelParent.descendants.data, (item) => ({ id: item.id, label: item.name.toUpperCase() }))

    ModelViewModelExpander.expand(
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

test('createExpandHandler loads children once and toggles expansion', () => {
    // Captures calls to the loader passed into the handler factory.
    const viewModelArray = []
    const expand = ModelViewModelExpander.createExpandHandler((viewModelParent) => viewModelArray.push(viewModelParent))
    const viewModelParent = { expanded: false, childrenLoaded: false }

    // The first expansion loads the children and marks the item as expanded.
    expand(undefined, viewModelParent)

    assert.deepEqual(viewModelArray, [viewModelParent])
    assert.deepEqual(viewModelParent, { expanded: true, childrenLoaded: true })

    // Later expansions only toggle visibility; they must not load again.
    expand(undefined, viewModelParent)

    assert.deepEqual(viewModelArray, [viewModelParent])
    assert.deepEqual(viewModelParent, { expanded: false, childrenLoaded: true })
})

test('createExpandHandler supports custom expand options', () => {
    let loadCount = 0
    const expand = ModelViewModelExpander.createExpandHandler(() => loadCount++, {
        expandedAttribute: 'isExpanded',
        childrenLoadedAttribute: 'hasLoadedChildren'
    })
    const viewModelParent = { isExpanded: false, hasLoadedChildren: false }

    expand(undefined, viewModelParent)
    expand(undefined, viewModelParent)

    assert.equal(loadCount, 1)
    assert.deepEqual(viewModelParent, { isExpanded: false, hasLoadedChildren: true })
})
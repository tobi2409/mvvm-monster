import test from 'node:test'
import assert from 'node:assert/strict'

import MvvmAdapter from '../../src/datasources/mvvm-adapter.js'
import DataSource from '../../src/datasources/datasource.js'

test('loads and transforms root data through MVVMDataLoader', async () => {
    const dataSource = DataSource.create([], undefined, () => ({
        items: [{ id: 1, name: 'Ada' }],
        hasMore: false
    }))

    const viewModel = MvvmAdapter.create(
        dataSource,
        (item) => ({ id: item.id, label: item.name.toUpperCase() }),
        (item) => ({ id: () => item.id, name: () => item.label.toLowerCase() })
    )

    await viewModel.items.state.loadData()

    assert.deepEqual(dataSource.data, [{ id: 1, name: 'Ada' }])
    assert.deepEqual(viewModel.items.data, [{ id: 1, label: 'ADA' }])
})

test('inserts prepared view model items into model and view model', () => {
    const dataSource = DataSource.create(
        [],
        { id: 2, label: 'GRACE' },
        () => ({ items: [], hasMore: false })
    )

    const viewModel = MvvmAdapter.create(
        dataSource,
        (item) => ({ id: item.id, label: item.name.toUpperCase() }),
        (item) => ({ id: () => item.id, name: () => item.label.toLowerCase() })
    )

    viewModel.items.state.addNewItem(undefined, viewModel)

    assert.deepEqual(dataSource.data, [{ id: 2, name: 'grace' }])
    assert.deepEqual(viewModel.items.data, [{ id: 2, label: 'GRACE' }])
})

test('loads nested model and view model children through MVVMDataLoader', async () => {
    const parent = { id: 1, name: 'Parent', children: [] }

    const dataSource = DataSource.create([parent], undefined, ({ modelParent }) => ({
        items: [{ id: modelParent.id + 1, name: 'Child', children: [] }],
        hasMore: false
    }))

    const viewModel = MvvmAdapter.create(
        dataSource,
        (item) => ({ id: item.id, label: item.name.toUpperCase() }),
        (item) => ({ id: () => item.id, name: () => item.label.toLowerCase() }),
        { expander: true }
    )

    const viewModelParent = viewModel.items.data[0]

    await viewModelParent.children.state.loadData(viewModelParent)

    assert.deepEqual(parent.children, [{ id: 2, name: 'Child', children: [] }])
    assert.equal(viewModelParent.children.data[0].label, 'CHILD')
})

test('provides view-model and model parents as adapter state context', () => {
    const parent = { id: 1, name: 'Parent', children: [] }

    const contexts = []

    const dataSource = DataSource.create(
        [parent],
        undefined,
        () => ({ items: [], hasMore: false }),
        undefined,
        {
            state: (context) => { // da state eine Fabrikfunktion ist, wird sie bei jeder Erstellung eines Collection-States aufgerufen
                // DataSource calls this factory whenever an adapter creates a collection state.
                contexts.push(context)
                return {}
            }
        }
    )
    
    const viewModel = MvvmAdapter.create(
        dataSource,
        (item) => ({ id: item.id, label: item.name }),
        (item) => ({ id: () => item.id, name: () => item.label }),
        { expander: true }
    )

    // Reading the root collection creates its state first:
    // contexts[0] = { state: rootState, viewModel, modelParent: undefined }.
    // Transforming the first item then creates its children collection:
    // contexts[1] = { state: childrenState, viewModel, modelParent: parent }.
    const viewModelParent = viewModel.items.data[0]

    assert.equal(contexts[0].modelParent, undefined)
    assert.strictEqual(contexts[0].viewModel, viewModel)
    assert.strictEqual(contexts[1].modelParent, parent)
    assert.deepEqual(Object.keys(contexts[1]).sort(), ['modelParent', 'state', 'viewModel'])
    assert.strictEqual(viewModelParent.children.state, contexts[1].state)
})

import test from 'node:test'
import assert from 'node:assert/strict'

import MvvmDataSource from '../../src/datasources/mvvm-data-source.js'

test('creates a directly usable MVVM datasource', async () => {
    const model = []
    const persons = MvvmDataSource.create(
        model,
        undefined,
        () => ({ items: [{ id: 1, name: 'Ada' }], hasMore: false }),
        undefined,
        (item) => ({ id: item.id, label: item.name.toUpperCase() }),
        (item) => ({ id: () => item.id, name: () => item.label.toLowerCase() })
    )

    await persons.state.loadData()

    assert.deepEqual(model, [{ id: 1, name: 'Ada' }])
    assert.deepEqual(persons.data, [{ id: 1, label: 'ADA' }])
})

test('inserts prepared view-model items into both arrays', () => {
    const model = []
    const persons = MvvmDataSource.create(
        model,
        { id: 2, label: 'GRACE' },
        () => ({ items: [], hasMore: false }),
        undefined,
        (item) => ({ id: item.id, label: item.name.toUpperCase() }),
        (item) => ({ id: () => item.id, name: () => item.label.toLowerCase() })
    )

    persons.state.addNewItem()

    assert.deepEqual(model, [{ id: 2, name: 'grace' }])
    assert.deepEqual(persons.data, [{ id: 2, label: 'GRACE' }])
})

test('loads nested model and view-model children', async () => {
    const parent = { id: 1, name: 'Parent', children: [] }
    const persons = MvvmDataSource.create(
        [parent],
        undefined,
        ({ modelParent }) => ({
            items: [{ id: modelParent.id + 1, name: 'Child', children: [] }],
            hasMore: false
        }),
        undefined,
        (item) => ({ id: item.id, label: item.name.toUpperCase() }),
        (item) => ({ id: () => item.id, name: () => item.label.toLowerCase() }),
        { expander: true }
    )

    await persons.data[0].children.state.loadData()

    assert.equal(parent.children[0].name, 'Child')
    assert.equal(persons.data[0].children.data[0].label, 'CHILD')
})
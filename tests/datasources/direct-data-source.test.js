import test from 'node:test'
import assert from 'node:assert/strict'

import DirectDataSource from '../../src/datasources/direct-data-source.js'
import ModelJournal from '../../src/reactivity/model-journal.js'

test('creates a directly usable datasource', async () => {
    const initialData = []
    const data = DirectDataSource.create(
        initialData,
        undefined,
        () => ({ items: [{ id: 1, children: [] }], hasMore: false }),
        undefined,
        { expander: true }
    )

    await data.items.state.loadData()

    assert.strictEqual(data.model, initialData)
    assert.equal(data.items.data[0].id, 1)
    assert.equal(typeof data.items.data[0].expand, 'function')
})

test('loads and prepares nested tree data', async () => {
    const requests = []
    const data = DirectDataSource.create(
        [],
        undefined,
        ({ dataParent }) => {
            requests.push(dataParent?.id)
            return {
                items: [{ id: dataParent ? 2 : 1, children: [] }],
                hasMore: false
            }
        },
        undefined,
        { expander: true }
    )

    await data.items.state.loadData()
    await data.items.data[0].children.state.loadData()

    assert.deepEqual(requests, [undefined, 1])
    assert.equal(data.items.data[0].children.data[0].id, 2)
})

test('inserts prepared items and exposes direct parent state context', () => {
    const parent = { id: 1, children: [] }
    const contexts = []
    const data = DirectDataSource.create(
        [parent],
        { id: 2, children: [] },
        () => ({ items: [], hasMore: false }),
        undefined,
        {
            expander: true,
            state: (context) => contexts.push(context) && {}
        }
    )

    data.items.data[0].children.state.addNewItem()

    assert.equal(data.items.data[0].children.data[0].id, 2)
    assert.equal(data.items.data[0].children.data[0].childrenLoaded, true)
    assert.strictEqual(contexts[1].dataParent, parent)
})

test('saves and clears journal changes only after a successful save', async () => {
    const saved = []
    const data = DirectDataSource.create(
        [{ id: 1, name: 'Old' }],
        undefined,
        () => ({ items: [], hasMore: false }),
        async (model, journal) => saved.push({ model, size: journal.size }),
        { journalize: true }
    )

    data.model[0].name = 'New'

    assert.equal(await data.items.state.saveChanges(), true)
    assert.equal(saved[0].size, 1)
    assert.equal(ModelJournal.getJournal(data.model).size, 0)
    assert.equal(await data.items.state.saveChanges(), false)
})
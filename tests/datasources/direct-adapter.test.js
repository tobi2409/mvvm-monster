import test from 'node:test'
import assert from 'node:assert/strict'

import DirectAdapter from '../../src/datasources/direct-adapter.js'
import DataSource from '../../src/datasources/datasource.js'

test('exposes the original data without a separate view model', () => {
    const initialData = [{ id: 1, children: [] }]

    const dataSource = DataSource.create(initialData, undefined, () => ({
        items: [],
        hasMore: false
    }))

    const data = DirectAdapter.create(dataSource)

    assert.strictEqual(data.model, initialData)
    assert.strictEqual(data.items.data, initialData)
})

test('loads and prepares root and nested tree data', async () => {
    const requests = []

    const dataSource = DataSource.create([], undefined, ({ dataParent }) => {
        requests.push(dataParent?.id)
        return {
            items: [{ id: dataParent ? 2 : 1, children: [] }],
            hasMore: false
        }
    })

    const data = DirectAdapter.create(dataSource, { expander: true })

    await data.items.state.loadData()
    const parent = data.items.data[0]
    await parent.children.state.loadData()

    assert.deepEqual(requests, [undefined, 1])
    assert.equal(parent.id, 1)
    assert.equal(parent.children.data[0].id, 2)
    assert.equal(typeof parent.expand, 'function')
    assert.deepEqual(Object.keys(parent), [
        'id',
        'children',
        'expanded',
        'childrenLoaded',
        'expand'
    ])
})

test('inserts and prepares new tree items through the collection state', () => {
    const parent = { id: 1, children: [] }

    const dataSource = DataSource.create(
        [parent],
        { id: 2, children: [] },
        () => ({ items: [], hasMore: false })
    )

    const data = DirectAdapter.create(dataSource, { expander: true })
    const dataParent = data.items.data[0]

    dataParent.children.state.addNewItem()

    const child = dataParent.children.data[0]
    assert.equal(child.id, 2)
    assert.deepEqual(child.children.data, [])
    assert.equal(child.childrenLoaded, true)
    assert.equal(typeof child.expand, 'function')
})

test('provides only the direct parent as adapter state context', () => {
    const parent = { id: 1, children: [] }

    const contexts = []
    
    const dataSource = DataSource.create(
        [parent],
        undefined,
        () => ({ items: [], hasMore: false }),
        undefined,
        { state: (context) => contexts.push(context) && {} }
    )

    DirectAdapter.create(dataSource, { expander: true })

    assert.equal(contexts[0].dataParent, undefined)
    assert.strictEqual(contexts[1].dataParent, parent)
    assert.deepEqual(Object.keys(contexts[1]).sort(), ['dataParent', 'state'])
})

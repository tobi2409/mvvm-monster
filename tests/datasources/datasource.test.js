import test from 'node:test'
import assert from 'node:assert/strict'

import DataSource from '../../src/datasources/datasource.js'
import ModelJournal from '../../src/reactivity/model-journal.js'

test('coordinates paged loading through an adapter state', async () => {
    const requests = []

    const dataSource = DataSource.create([], undefined, ({ start, limit }) => {
        requests.push({ start, limit })
        return {
            items: [{ id: start + 1 }],
            hasMore: start === 0
        }
    }, undefined, { limit: 1 })

    const loadedItems = []

    const state = dataSource.createState({
        applyLoadedItems: ({ items, nextDataBucket }) => {
            if (!nextDataBucket) {
                loadedItems.length = 0
            }

            loadedItems.push(...items)
        }
    })

    await state.loadData()
    await state.loadNextPage()
    await state.reloadData({ type: 'input' })

    assert.deepEqual(requests, [
        { start: 0, limit: 1 },
        { start: 1, limit: 1 },
        { start: 0, limit: 1 }
    ])
    assert.deepEqual(loadedItems, [{ id: 1 }])
    assert.equal(state.hasMore, true)
})

test('creates a fresh item snapshot and delegates insertion', () => {
    const insertedItems = []

    const dataSource = DataSource.create(
        [],
        { name: 'New' },
        () => ({ items: [], hasMore: false })
    )

    const state = dataSource.createState({
        applyLoadedItems: () => {},
        insertNewItem: (item) => {
            insertedItems.push(item)
            return item
        }
    })

    const newItemState = state.newItem
    state.newItem.name = 'Ada'
    const insertedItem = state.addNewItem()

    assert.deepEqual(insertedItems, [{ name: 'Ada' }])
    assert.strictEqual(insertedItem, insertedItems[0])
    assert.strictEqual(state.newItem, newItemState)
    assert.deepEqual(state.newItem, { name: 'New' })
})

test('saves and clears journal changes only after a successful save', async () => {
    const saved = []

    const dataSource = DataSource.create(
        [{ id: 1, name: 'Old' }],
        undefined,
        () => ({ items: [], hasMore: false }),
        async (data, journal) => saved.push({ data, size: journal.size }),
        { journalize: true }
    )
    
    const state = dataSource.createState({ applyLoadedItems: () => {} })

    dataSource.data[0].name = 'New'

    assert.equal(await state.saveChanges(), true)
    assert.equal(saved.length, 1)
    assert.equal(saved[0].size, 1)
    assert.equal(ModelJournal.getJournal(dataSource.data).size, 0)
    assert.equal(await state.saveChanges(), false)
})

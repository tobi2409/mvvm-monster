import test from 'node:test'
import assert from 'node:assert/strict'

import Paginator from '../src/paginator.js'

test('loads pages and advances by the number of returned items', async () => {
    const calls = []
    const pages = [
        { items: [{ id: 1 }, { id: 2 }], hasMore: true },
        { items: [{ id: 3 }], hasMore: false }
    ]
    const state = Paginator.createState({ limit: 2 })
    const loadData = (start, limit) => {
        calls.push({ start, limit })
        return pages.shift()
    }

    assert.deepEqual(await Paginator.loadNextPage(state, loadData), [{ id: 1 }, { id: 2 }])
    assert.deepEqual(await Paginator.loadNextPage(state, loadData), [{ id: 3 }])

    assert.deepEqual(calls, [
        { start: 0, limit: 2 },
        { start: 2, limit: 2 }
    ])
    assert.equal(state.start, 3)
    assert.equal(state.hasMore, false)
    assert.equal(state.loading, false)
})

test('createState only creates pagination attributes', () => {
    assert.deepEqual(Paginator.createState({ limit: 10 }), {
        start: 0,
        limit: 10,
        hasMore: true,
        loading: false
    })
})

test('loads the first page again after pagination has advanced', async () => {
    const calls = []
    const state = Paginator.createState({ limit: 2 })
    const loadData = (start, limit) => {
        calls.push({ start, limit })
        return { items: [{ id: start + 1 }], hasMore: true }
    }

    await Paginator.loadNextPage(state, loadData)
    await Paginator.loadFirstPage(state, loadData)

    assert.deepEqual(calls, [
        { start: 0, limit: 2 },
        { start: 0, limit: 2 }
    ])
    assert.equal(state.start, 1)
})

test('does not load after the last page', async () => {
    let loadCount = 0
    const state = Paginator.createState()
    const loadData = () => {
        loadCount++
        return { items: [], hasMore: false }
    }

    await Paginator.loadNextPage(state, loadData)
    assert.deepEqual(await Paginator.loadNextPage(state, loadData), [])
    assert.equal(loadCount, 1)
})

test('validates configuration and page results', async () => {
    assert.throws(
        () => Paginator.createState({ limit: 0 }),
        /"limit" to be a positive integer/
    )

    const state = Paginator.createState()
    await assert.rejects(
        Paginator.loadNextPage(state),
        /"loadData" to be a function/
    )
    await assert.rejects(
        Paginator.loadNextPage(state, () => []),
        /must return \{ items: Array, hasMore: boolean \}/
    )
})

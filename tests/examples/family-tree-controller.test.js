import test from 'node:test'
import assert from 'node:assert/strict'

import { createFamilyTreeController } from '../../examples/family-tree/family-tree-controller.js'

function createPerson(id, name) {
    return {
        id,
        name,
        wage: 10,
        birthyear: 1990,
        address: { street: '', city: '' },
        tags: [],
        children: []
    }
}

test('loads root and recursive child pages through the same collection contract', async () => {
    const model = { user: 'Joe', persons: [] }
    const calls = []
    const rowsByParent = {
        root: [createPerson('p1', 'Parent 1'), createPerson('p2', 'Parent 2')],
        p1: [createPerson('c1', 'Child 1'), createPerson('c2', 'Child 2')]
    }
    const fetchPersons = (parentId, fetchOptions, start, limit) => {
        calls.push({ parentId, fetchOptions: { ...fetchOptions }, start, limit })
        const rows = rowsByParent[parentId ?? 'root'] || []
        const items = structuredClone(rows.slice(start, start + limit))

        return { items, hasMore: start + items.length < rows.length }
    }
    const controller = createFamilyTreeController({
        model,
        fetchPersons,
        persistPersons: () => {},
        currentYear: () => 2026
    })

    await controller.loadRoot()
    await controller.persons.state.loadNextPage()

    const parent = controller.persons.data[0]
    await parent.children.state.loadNextPage()
    await parent.children.state.loadNextPage()

    assert.deepEqual(controller.persons.data.map((person) => person.id), ['p1', 'p2'])
    assert.deepEqual(model.persons.map((person) => person.id), ['p1', 'p2'])
    assert.deepEqual(parent.children.data.map((person) => person.id), ['c1', 'c2'])
    assert.deepEqual(calls.map(({ parentId, start }) => ({ parentId, start })), [
        { parentId: null, start: 0 },
        { parentId: null, start: 1 },
        { parentId: 'p1', start: 0 },
        { parentId: 'p1', start: 1 }
    ])
})

test('validates the injected boundary dependencies', () => {
    assert.throws(
        () => createFamilyTreeController({
            model: { persons: [] },
            fetchPersons: undefined,
            persistPersons: () => {}
        }),
        /fetchPersons and persistPersons functions/
    )
})
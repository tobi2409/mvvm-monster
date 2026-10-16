import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import ModelJournal from '../../src/reactivity/model-journal.js'

describe('ModelJournal.reactive', () => {
    test('includes the current item id in journal entries', () => {
        const data = ModelJournal.reactive({ persons: [{ personId: 'a', name: 'Alice' }] }, 'personId')

        data.persons[0].name = 'Alicia'

        assert.equal(ModelJournal.getJournal(data)[0].id, 'a')
        assert.equal(ModelJournal.getJournal(data)[0].attributeName, 'name')
    })

    test('retains repeated splice operations in order', () => {
        const data = ModelJournal.reactive({ persons: [
            { id: 'a', name: 'Alice' },
            { id: 'b', name: 'Bob', children: [{ id: 'b1', name: 'Bella' }] }
        ] })

        data.persons.splice(0, 1)
        data.persons.splice(0, 0, { id: 'c', name: 'Carol' })
        data.persons[1].children.splice(0, 1)
        data.persons[1].children.splice(0, 0, { id: 'a2', name: 'Alex' })

        assert.deepEqual(ModelJournal.getJournal(data), [
            {
                attributeName: 'persons',
                change: {
                    action: 'splice',
                    startIndex: 0,
                    deleteCount: 1,
                    items: []
                }
            },
            {
                attributeName: 'persons',
                change: {
                    action: 'splice',
                    startIndex: 0,
                    deleteCount: 0,
                    items: [{ id: 'c', name: 'Carol' }]
                }
            },
            {
                attributeName: 'children',
                change: {
                    action: 'splice',
                    startIndex: 0,
                    deleteCount: 1,
                    items: []
                },
                id: 'b'
            },
            {
                attributeName: 'children',
                change: {
                    action: 'splice',
                    startIndex: 0,
                    deleteCount: 0,
                    items: [{ id: 'a2', name: 'Alex' }]
                },
                id: 'b'
            }
        ])
    })

    test('keeps the complete nested attribute name when no item id exists', () => {
        const data = ModelJournal.reactive({ settings: { profile: { name: 'Alice' } } })

        data.settings.profile.name = 'Alicia'

        assert.deepEqual(ModelJournal.getJournal(data), [{
            attributeName: 'settings.profile.name',
            change: { operation: 'set', value: 'Alicia' }
        }])
    })

    test('keeps only the latest set change to the same property', () => {
        const data = ModelJournal.reactive({ name: 'Tobias' })
        data.name = 'Tobiasa'
        data.name = 'Tobiasaa'

        assert.deepEqual(ModelJournal.getJournal(data), [{
            attributeName: 'name',
            change: { operation: 'set', value: 'Tobiasaa' }
        }])
    })

    test('keeps set changes for different item ids separate', () => {
        const data = ModelJournal.reactive({ persons: [
            { id: 'a', name: 'Alice' },
            { id: 'b', name: 'Bob' }
        ] })

        data.persons[0].name = 'Alicia'
        data.persons[0].name = 'Ally'
        data.persons[1].name = 'Bobby'

        assert.deepEqual(ModelJournal.getJournal(data), [
            {
                attributeName: 'name',
                change: { operation: 'set', value: 'Ally' },
                id: 'a'
            },
            {
                attributeName: 'name',
                change: { operation: 'set', value: 'Bobby' },
                id: 'b'
            }
        ])
    })

    test('journals nested item changes and instruments inserted array items', () => {
        const data = ModelJournal.reactive({
            persons: [{ personId: 'a', profile: { name: 'Alice' } }]
        }, 'personId')

        data.persons[0].profile.name = 'Alicia'
        data.persons.push({ personId: 'b', profile: { name: 'Bob' } })
        data.persons[1].profile.name = 'Bobby'

        assert.deepEqual(ModelJournal.getJournal(data), [
            {
                attributeName: 'profile.name',
                change: { operation: 'set', value: 'Alicia' },
                id: 'a'
            },
            {
                attributeName: 'persons',
                change: {
                    action: 'push',
                    items: [{ personId: 'b', profile: { name: 'Bob' } }]
                }
            },
            {
                attributeName: 'profile.name',
                change: { operation: 'set', value: 'Bobby' },
                id: 'b'
            }
        ])
    })

    test('suppresses journal entries inside withoutJournaling', () => {
        const data = ModelJournal.reactive({ persons: [] })

        const result = ModelJournal.withoutJournaling(() => {
            assert.equal(ModelJournal.isJournalingDisabled(), true)
            data.persons.push({ id: 'a', name: 'Alice' })
            data.persons[0].name = 'Alicia'
            return data.persons
        })

        assert.strictEqual(result, data.persons)
        assert.equal(ModelJournal.isJournalingDisabled(), false)
        data.persons[0].name = 'Ally'

        assert.deepEqual(ModelJournal.getJournal(data), [{
            attributeName: 'name',
            change: { operation: 'set', value: 'Ally' },
            id: 'a'
        }])
    })

    test('journals changes to items inserted into nested arrays', () => {
        const data = ModelJournal.reactive({ persons: [] })
        data.persons.push({ id: 'a', children: [] })
        data.persons[0].children.push({ id: 'b', name: 'Bob', children: [] })
        data.persons[0].children[0].name = 'Bobby'

        assert.deepEqual(ModelJournal.getJournal(data).at(-1), {
            attributeName: 'name',
            change: { operation: 'set', value: 'Bobby' },
            id: 'b'
        })
    })

    test('snapshots inserted items with enumerable action functions', () => {
        const data = ModelJournal.reactive({ persons: [] })
        const expand = () => {}

        data.persons.push({ id: 'a', children: [], expand })

        const change = ModelJournal.getJournal(data).at(-1).change
        assert.notStrictEqual(change.items[0], data.persons[0])
        assert.deepEqual(change.items[0], { id: 'a', children: [], expand })
        assert.strictEqual(change.items[0].expand, expand)
    })
})
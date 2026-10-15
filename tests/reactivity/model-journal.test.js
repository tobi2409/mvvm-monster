import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import ModelJournal from '../../src/reactivity/model-journal.js'

describe('ModelJournal.reactive', () => {
    test('includes the current item id in journal entries', () => {
        const data = ModelJournal.reactive({ persons: [{ personId: 'a', name: 'Alice' }] }, 'personId')

        data.persons[0].name = 'Alicia'

        assert.equal(ModelJournal.getJournal(data).get('persons.a.name').id, 'a')
    })

    test('retains repeated splice operations in order', () => {
        const data = ModelJournal.reactive({ persons: [
            { id: 'a', name: 'Alice' },
            { id: 'b', name: 'Bob' }
        ] })

        data.persons.splice(0, 1)
        data.persons.splice(0, 0, { id: 'c', name: 'Carol' })

        const journalEntry = ModelJournal.getJournal(data).get('persons')

        assert.deepEqual(journalEntry.changes, [
            {
                fullKey: 'persons',
                action: 'splice',
                startIndex: 0,
                deleteCount: 1,
                items: []
            },
            {
                fullKey: 'persons',
                action: 'splice',
                startIndex: 0,
                deleteCount: 0,
                items: [{ id: 'c', name: 'Carol' }]
            }
        ])
        
        assert.equal('change' in journalEntry, false)
    })

    test('refreshes an existing journal entry for repeated changes to the same property', () => {
        const data = ModelJournal.reactive({ name: 'Tobias' })
        data.name = 'Tobiasa'

        const journalEntry = ModelJournal.getJournal(data).get('name')
        data.name = 'Tobiasaa'

        assert.strictEqual(ModelJournal.getJournal(data).get('name'), journalEntry)
        assert.equal(ModelJournal.getJournal(data).size, 1)
        assert.deepEqual(journalEntry, {
            fullKey: 'name',
            changes: [{ operation: 'set', value: 'Tobiasaa' }]
        })
    })

    test('journals nested item changes and instruments inserted array items', () => {
        const data = ModelJournal.reactive({
            persons: [{ personId: 'a', profile: { name: 'Alice' } }]
        }, 'personId')

        data.persons[0].profile.name = 'Alicia'
        data.persons.push({ personId: 'b', profile: { name: 'Bob' } })
        data.persons[1].profile.name = 'Bobby'

        assert.deepEqual(Array.from(ModelJournal.getJournal(data).values()), [
            {
                fullKey: 'persons.a.profile.name',
                changes: [{ operation: 'set', value: 'Alicia' }],
                id: 'a'
            },
            {
                fullKey: 'persons',
                changes: [{
                    fullKey: 'persons',
                    action: 'push',
                    items: [{ personId: 'b', profile: { name: 'Bob' } }]
                }]
            },
            {
                fullKey: 'persons.b.profile.name',
                changes: [{ operation: 'set', value: 'Bobby' }],
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

        assert.deepEqual(Array.from(ModelJournal.getJournal(data).values()), [{
            fullKey: 'persons.a.name',
            changes: [{ operation: 'set', value: 'Ally' }],
            id: 'a'
        }])
    })

    test('journals changes to items inserted into nested arrays', () => {
        const data = ModelJournal.reactive({ persons: [] })
        data.persons.push({ id: 'a', children: [] })
        data.persons[0].children.push({ id: 'b', name: 'Bob', children: [] })
        data.persons[0].children[0].name = 'Bobby'

        assert.deepEqual(ModelJournal.getJournal(data).get('persons.a.children.b.name'), {
            fullKey: 'persons.a.children.b.name',
            changes: [{ operation: 'set', value: 'Bobby' }],
            id: 'b'
        })
    })

    test('snapshots inserted items with enumerable action functions', () => {
        const data = ModelJournal.reactive({ persons: [] })
        const expand = () => {}

        data.persons.push({ id: 'a', children: [], expand })

        const change = ModelJournal.getJournal(data).get('persons').changes.at(-1)
        assert.notStrictEqual(change.items[0], data.persons[0])
        assert.deepEqual(change.items[0], { id: 'a', children: [], expand })
        assert.strictEqual(change.items[0].expand, expand)
    })
})
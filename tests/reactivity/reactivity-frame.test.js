import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import ReactivityFrame from '../../src/reactivity/reactivity-frame.js'

describe('ReactivityFrame', () => {
    test('recursively instruments data properties and exposes get/set hooks', () => {
        const events = []
        const data = { person: { name: 'Alice' } }

        ReactivityFrame.makeReactive(data, '', {
            marker: '__frameReactive__',
            onDataPropertyGet: (event) => events.push(['get', event.fullKey]),
            onDataPropertySet: (event) => events.push(['set', event.fullKey, event.oldValue, event.newValue])
        })

        data.person.name
        data.person.name = 'Bob'

        assert.equal(data.person.__frameReactive__, true)
        events.pop()
        assert.deepEqual(events, [
            ['get', 'person'],
            ['get', 'person.name'],
            ['get', 'person'],
            ['set', 'person.name', 'Alice', 'Bob']
        ])
    })

    test('instruments accessor properties when their value is read or set', () => {
        let selected = { name: 'Alice' }

        const events = []

        const data = {
            get selected() {
                return selected
            },
            set selected(value) {
                selected = value
            }
        }

        ReactivityFrame.makeReactive(data, '', {
            onAccessorPropertyGet: (event) => events.push(['get', event.fullKey, event.value.name]),
            onAccessorPropertySet: (event) => events.push(['set', event.fullKey, event.oldValue.name, event.newValue.name])
        })

        data.selected
        data.selected = { name: 'Bob' }

        assert.deepEqual(events, [
            ['get', 'selected', 'Alice'],
            ['set', 'selected', 'Alice', 'Bob']
        ])
    })

    test('passes prepared array changes and recursively handles inserted items', () => {
        const events = []
        const data = { items: [{ id: 'a', name: 'Alice' }] }

        ReactivityFrame.makeReactive(data, '', {
            marker: '__frameReactive__',
            getArrayItemKey: (item) => item.id,
            onArrayChange: (change) => events.push(['change', change]),
            onArrayItemsChange: (change) => events.push(['complete', change.action])
        })

        data.items.push({ id: 'b', name: 'Bob' })
        data.items[1].name = 'Bobby'

        assert.equal(data.items[1].__frameReactive__, true)

        assert.equal(events.length, 2)
        assert.equal(events[0][0], 'change')
        assert.equal(events[0][1].fullKey, 'items')
        assert.equal(events[0][1].action, 'push')
        assert.deepEqual(events[1], ['complete', 'push'])
    })

    test('replaces prepared items before array insertion and excludes the options object', () => {
        const data = { items: [] }
        let preparedChange

        ReactivityFrame.makeReactive(data, '', {
            marker: '__frameReactive__',
            beforeArrayChange: (change) => {
                preparedChange = change
                
                if (change.extraArrayParams?.prepareItems) {
                    change.items = change.items.map((item) => ({ ...item, prepared: true }))
                }
            }
        })

        const result = data.items.push(
            { id: 'a' },
            { extraArrayParams: { prepareItems: true } }
        )

        assert.equal(result, 1)
        assert.equal(preparedChange.extraArrayParams.prepareItems, true)
        assert.deepEqual(data.items, [{ id: 'a', prepared: true }])
    })

    test('supports prepared items for unshift and splice', () => {
        const data = { items: [{ id: 'tail' }] }

        ReactivityFrame.makeReactive(data, '', {
            marker: '__frameReactive__',
            beforeArrayChange: (change) => {
                if (change.extraArrayParams?.prepareItems) {
                    change.items = change.items.map((item) => ({ ...item, prepared: true }))
                }
            }
        })

        data.items.unshift({ id: 'head' }, { extraArrayParams: { prepareItems: true } })
        const removed = data.items.splice(1, 1, { id: 'middle' }, { extraArrayParams: { prepareItems: true } })

        assert.deepEqual(removed.map(({ id }) => id), ['tail'])
        assert.deepEqual(data.items.map(({ id, prepared }) => ({ id, prepared })), [
            { id: 'head', prepared: true },
            { id: 'middle', prepared: true }
        ])
    })
})
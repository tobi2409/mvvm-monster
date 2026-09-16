import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import ViewModelArray from '../../src/model/viewmodel-array.js'

describe('ViewModelArray.get', () => {
    test('maps source items with transform', () => {
        const source = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
        const arr = ViewModelArray.get(source, (item) => ({ label: item.name.toUpperCase() }))

        assert.ok(arr)

        assert.equal(arr.data[0].label, 'ALICE')
        assert.equal(arr.data[1].label, 'BOB')
    })

    test('returns same viewModelArray instance for same source array', () => {
        const source = [{ id: 1, name: 'Alice' }]
        const state = { newPerson: { name: '' } }

        const arr1 = ViewModelArray.get(source, (item) => ({ label: item.name }), undefined, {}, state)
        const arr2 = ViewModelArray.get(source, (item) => ({ label: `other-${item.name}` }), undefined, {}, {})

        assert.ok(arr1)
        assert.ok(arr2)

        assert.strictEqual(arr1, arr2)
        assert.strictEqual(arr1.data, arr2.data)
        assert.strictEqual(arr1.state, state)
    })

    test('returns same mapped item instance for same source item', () => {
        const source = [{ id: 1, name: 'Alice' }]

        const arr1 = ViewModelArray.get(source, (item) => ({ label: item.name }))
        const arr2 = ViewModelArray.get(source, (item) => ({ label: `other-${item.name}` }))

        assert.ok(arr1)
        assert.ok(arr2)

        assert.strictEqual(arr1.data[0], arr2.data[0])
    })

    test('stores model array and reverse transform on mapped array', () => {
        const source = [{ id: 1, name: 'Alice' }]
        const reverseTransform = (viewModelItem) => ({ name: viewModelItem.label })

        const arr = ViewModelArray.get(source, (item) => ({ label: item.name }), reverseTransform)

        assert.ok(arr)

        assert.strictEqual(arr.data.__modelArray__, source)
        assert.strictEqual(arr.data.__reverseTransform__, reverseTransform)
    })

    test('prepares model and view model items without inserting them', () => {
        const source = []
        const arr = ViewModelArray.get(
            source,
            (item) => ({
                label: item.name.toUpperCase(),
                children: ViewModelArray.get(item.children, (child) => ({ label: child.name }))
            }),
            (item) => ({
                name: () => item.label.trim(),
                children: () => item.children.map((child) => ({ name: () => child.label }))
            })
        )

        const { modelItem, viewModelItem } = ViewModelArray.prepareItem(arr.data, {
            label: ' Alice ',
            children: [{ label: 'Bob' }]
        })

        assert.deepEqual(modelItem, { name: 'Alice', children: [{ name: 'Bob' }] })
        assert.equal(viewModelItem.label, 'ALICE')
        assert.equal(viewModelItem.children.data[0].label, 'Bob')
        assert.deepEqual(source, [])
        assert.equal(arr.data.length, 0)
    })

    test('rejects values that are not mapped view model arrays', () => {
        assert.throws(
            () => ViewModelArray.prepareItem([], {}),
            /expected a ViewModelArray/
        )
    })

    test('throws for non-array modelArray', () => {
        assert.throws(
            () => ViewModelArray.get(null, () => ({})),
            /expected "modelArray" to be an array/
        )
    })

    test('throws for non-function transform', () => {
        assert.throws(
            () => ViewModelArray.get([], null),
            /expected "transform" to be a function/
        )
    })

    test('throws for non-function reverseTransform', () => {
        assert.throws(
            () => ViewModelArray.get([], () => ({}), null),
            /expected "reverseTransform" to be a function/
        )
    })

    test('throws for null or non-object propertyMapping', () => {
        assert.throws(
            () => ViewModelArray.get([], () => ({}), undefined, null),
            /expected "propertyMapping" to be an object, got null/
        )

        assert.throws(
            () => ViewModelArray.get([], () => ({}), undefined, []),
            /expected "propertyMapping" to be an object, got array/
        )
    })
})
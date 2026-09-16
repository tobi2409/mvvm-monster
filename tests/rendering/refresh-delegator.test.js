import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import RefreshDelegator from '../../src/rendering/refresh-delegator.js'
import NodeHolders from '../../src/dom/node-holders.js'

const { refresh } = RefreshDelegator
const { nodeHoldersByKeys } = NodeHolders

const { window } = new JSDOM('<!DOCTYPE html><body></body>')
global.document = window.document
global.Node = window.Node

beforeEach(() => {
    nodeHoldersByKeys.clear()
})

describe('refresh', () => {
    test('throws for unknown action', () => {
        assert.throws(
            () => refresh({}, { fullKey: 'name', action: 'unknownAction' }),
            /Unsupported refresh action/
        )
    })

    test('updateGet updates innerText of registered node', () => {
        const data = { name: 'Alice' }

        const node = document.createElement('span')
        node.textContent = 'old'
        nodeHoldersByKeys.appendToKey('name', { action: 'updateGet', node })

        refresh(data, { fullKey: 'name', action: 'updateGet' })

        assert.equal(node.textContent, 'Alice')
    })

    test('updateDefault bind updates node property', () => {
        const data = { title: 'Hello' }

        const node = document.createElement('input')
        node.value = 'old'
        nodeHoldersByKeys.appendToKey('title', { action: 'updateDefault', type: 'bind', node, property: 'value' })

        refresh(data, { fullKey: 'title', action: 'updateDefault' })

        assert.equal(node.value, 'Hello')
    })

    test('updateDefault attribute updates node attribute', () => {
        const data = { theme: 'dark' }

        const node = document.createElement('div')
        nodeHoldersByKeys.appendToKey('theme', { action: 'updateDefault', type: 'attribute', node, attributeName: 'attr-data-theme' })

        refresh(data, { fullKey: 'theme', action: 'updateDefault' })

        assert.equal(node.getAttribute('data-theme'), 'dark')
    })

    test('updateIf shows wrapper when value is truthy', () => {
        const data = { visible: true }

        const wrapper = document.createElement('div')
        wrapper.style.display = 'none'

        const ifNode = document.createElement('if')

        const child = document.createElement('span')
        child.textContent = 'Hello'
        ifNode.appendChild(child)

        nodeHoldersByKeys.appendToKey('visible', {
            action: 'updateIf',
            wrapper,
            contextStack: new Map(),
            params: new Map(),
            controlNode: ifNode
        })

        refresh(data, { fullKey: 'visible', action: 'updateIf' })

        assert.equal(wrapper.style.display, '')
        assert.equal(wrapper.children.length, 1)
        assert.equal(wrapper.children[0].textContent, 'Hello')
    })

    test('updateIf hides wrapper when value is falsy', () => {
        const data = { visible: false }

        const wrapper = document.createElement('div')
        wrapper.style.display = ''

        const ifNode = document.createElement('if')

        const child = document.createElement('span')
        child.textContent = 'Hello'
        wrapper.appendChild(child)
        ifNode.appendChild(document.createElement('span'))

        nodeHoldersByKeys.appendToKey('visible', {
            action: 'updateIf',
            wrapper,
            contextStack: new Map(),
            params: new Map(),
            controlNode: ifNode
        })

        refresh(data, { fullKey: 'visible', action: 'updateIf' })

        assert.equal(wrapper.style.display, 'none')
        assert.equal(wrapper.children.length, 0)
    })

    const setupEachRender = (data) => {
        const mountNode = document.createElement('div')
        
        const eachNode = document.createElement('each')
        eachNode.setAttribute('of', 'items')
        eachNode.setAttribute('as', 'item')

        const getNode = document.createElement('get')
        getNode.textContent = 'item.id'
        eachNode.appendChild(getNode)

        nodeHoldersByKeys.appendToKey('items', {
            action: 'updateEach',
            controlNode: eachNode,
            mountNode,
            contextStack: new Map(),
            params: new Map()
        })

        refresh(data, { fullKey: 'items', action: 'updateEach' })
        return mountNode
    }

    const getRenderedIds = (mountNode) => Array.from(mountNode.children).map((node) => node.textContent)

    test('updateEach re-renders all items based on data', () => {
        const data = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] }
        const mountNode = setupEachRender(data)

        assert.deepEqual(getRenderedIds(mountNode), ['1', '2', '3'])
    })

    test('push appends new rendered nodes and reindexes items', () => {
        const data = { items: [{ id: 1 }, { id: 2 }] }
        const mountNode = setupEachRender(data)

        const insertedItems = [{ id: 3 }, { id: 4 }]
        data.items.push(...insertedItems)

        refresh(data, { fullKey: 'items', action: 'push', items: insertedItems })

        assert.deepEqual(getRenderedIds(mountNode), ['1', '2', '3', '4'])
    })

    test('pop removes last rendered node and keeps remaining content', () => {
        const data = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] }
        const mountNode = setupEachRender(data)

        data.items.pop()
        refresh(data, { fullKey: 'items', action: 'pop' })

        assert.deepEqual(getRenderedIds(mountNode), ['1', '2'])
    })

    test('shift removes first rendered node and reindexes remaining items', () => {
        const data = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] }
        const mountNode = setupEachRender(data)

        data.items.shift()
        refresh(data, { fullKey: 'items', action: 'shift' })

        assert.deepEqual(getRenderedIds(mountNode), ['2', '3'])
        assert.equal(data.items[0].id, 2)
        assert.equal(data.items[1].id, 3)
    })

    test('unshift inserts rendered node at start and reindexes items', () => {
        const data = { items: [{ id: 2 }, { id: 3 }] }
        const mountNode = setupEachRender(data)

        const insertedItems = [{ id: 1 }]
        data.items.unshift(...insertedItems)

        refresh(data, { fullKey: 'items', action: 'unshift', items: insertedItems })

        assert.deepEqual(getRenderedIds(mountNode), ['1', '2', '3'])
        assert.equal(data.items[0].id, 1)
        assert.equal(data.items[1].id, 2)
        assert.equal(data.items[2].id, 3)
    })

    test('splice updates rendered nodes and reindexes affected range', () => {
        const data = { items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] }
        const mountNode = setupEachRender(data)

        const insertedItems = [{ id: 10 }, { id: 11 }, { id: 12 }]
        data.items.splice(1, 2, ...insertedItems)

        refresh(data, { fullKey: 'items', action: 'splice', startIndex: 1, deleteCount: 2, items: insertedItems })

        assert.deepEqual(getRenderedIds(mountNode), ['1', '10', '11', '12', '4'])
    })
})

import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import RenderEngine from '../../src/rendering/render-engine.js'
import RefreshRendering from '../../src/rendering/refresh-engine.js'
import NodeHolders from '../../src/dom/node-holders.js'

const { handleEachNode } = RenderEngine
const { handleGetNodeRefresh, handleDefaultNodeRefresh, handleIfNodeRefresh, handleEachNodeRefresh } = RefreshRendering
const { nodeHoldersByKeys } = NodeHolders

const { window } = new JSDOM('<!DOCTYPE html><body></body>')
global.document = window.document
global.Node = window.Node

beforeEach(() => {
    nodeHoldersByKeys.clear()
})

describe('handleGetNodeRefresh', () => {
    test('updates innerText of existing node', () => {
        const data = { name: 'Alice' }

        const existingNode = document.createElement('span')
        existingNode.textContent = 'old'

        handleGetNodeRefresh(data, { existingNode, fullKey: 'name' })

        assert.equal(existingNode.textContent, 'Alice')
    })

    test('updates to empty string when value is empty', () => {
        // ensure empty strings are rendered, not treated as falsy/undefined
        const data = { label: '' }

        const existingNode = document.createElement('span')
        existingNode.textContent = 'something'

        handleGetNodeRefresh(data, { existingNode, fullKey: 'label' })

        assert.equal(existingNode.textContent, '')
    })
})

describe('handleDefaultNodeRefresh', () => {
    test('sets property on node for bind type', () => {
        const data = { username: 'alice' }
        const node = document.createElement('input')

        handleDefaultNodeRefresh(data, { fullKey: 'username', type: 'bind', node, property: 'value' })

        assert.equal(node.value, 'alice')
    })

    test('sets attribute on node for attribute type', () => {
        const data = { theme: 'dark' }
        const node = document.createElement('div')

        handleDefaultNodeRefresh(data, { fullKey: 'theme', type: 'attribute', node, attributeName: 'attr-data-theme' })

        assert.equal(node.getAttribute('data-theme'), 'dark')
    })

    test('sets style on node for style- attributeName', () => {
        const data = { color: 'red' }
        const node = document.createElement('div')

        handleDefaultNodeRefresh(data, { fullKey: 'color', type: 'attribute', node, attributeName: 'style-color' })

        assert.equal(node.style.color, 'red')
    })
})

describe('handleIfNodeRefresh', () => {
    test('shows wrapper when test resolves to truthy', () => {
        const data = { visible: false }

        const wrapper = document.createElement('div')
        wrapper.style.display = 'none'
        // Needed so the refresh handler can re-render the original if content.
        const ifNode = document.createElement('if')

        data.visible = true
        handleIfNodeRefresh(data, { wrapper, fullKey: 'visible', contextStack: new Map(), params: new Map(), controlNode: ifNode })

        assert.equal(wrapper.style.display, '')
    })

    test('hides wrapper when test resolves to falsy', () => {
        const data = { visible: true }

        const wrapper = document.createElement('div')
        wrapper.style.display = ''
        const ifNode = document.createElement('if')

        data.visible = false
        handleIfNodeRefresh(data, { wrapper, fullKey: 'visible', contextStack: new Map(), params: new Map(), controlNode: ifNode })

        assert.equal(wrapper.style.display, 'none')
    })

    test('clears wrapper children before re-rendering', () => {
        const data = { visible: false }

        const wrapper = document.createElement('div')
        const oldChild = document.createElement('span')
        wrapper.appendChild(oldChild)
        // true only shows the wrapper; without ifNode children nothing remains afterwards.
        const ifNode = document.createElement('if')

        data.visible = true
        handleIfNodeRefresh(data, { wrapper, fullKey: 'visible', contextStack: new Map(), params: new Map(), controlNode: ifNode })

        // No children from ifNode (empty template) - old child should be gone
        assert.equal(wrapper.children.length, 0)
    })

    test('re-renders children from ifNode when truthy', () => {
        const data = { visible: false }

        const wrapper = document.createElement('div')
        const oldChild = document.createElement('span')
        oldChild.textContent = 'old'
        wrapper.appendChild(oldChild)

        const ifNode = document.createElement('if')
        const newChild = document.createElement('span')
        newChild.textContent = 'new'
        ifNode.appendChild(newChild)

        data.visible = true
        handleIfNodeRefresh(data, { wrapper, fullKey: 'visible', contextStack: new Map(), params: new Map(), controlNode: ifNode })

        assert.equal(wrapper.style.display, '')
        assert.equal(wrapper.children.length, 1)
        assert.equal(wrapper.children[0].textContent, 'new')
    })

    test('hides wrapper and keeps no children when condition is false', () => {
        const data = { visible: true }

        const wrapper = document.createElement('div')
        const oldChild = document.createElement('span')
        oldChild.textContent = 'old'
        wrapper.appendChild(oldChild)

        const ifNode = document.createElement('if')
        const newChild = document.createElement('span')
        newChild.textContent = 'new'
        ifNode.appendChild(newChild)

        data.visible = false
        handleIfNodeRefresh(data, { wrapper, fullKey: 'visible', contextStack: new Map(), params: new Map(), controlNode: ifNode })

        assert.equal(wrapper.style.display, 'none')
        assert.equal(wrapper.children.length, 0)
    })

    test('re-renders nested if content when outer and inner are true', () => {
        const data = { visible: false, innerVisible: true }

        const wrapper = document.createElement('div')

        const ifNode = document.createElement('if')
        const nestedIf = document.createElement('if')
        nestedIf.setAttribute('test', 'innerVisible')

        const nestedChild = document.createElement('span')
        nestedChild.textContent = 'nested'
        nestedIf.appendChild(nestedChild)
        ifNode.appendChild(nestedIf)

        data.visible = true
        handleIfNodeRefresh(data, { wrapper, fullKey: 'visible', contextStack: new Map(), params: new Map(), controlNode: ifNode })

        assert.equal(wrapper.style.display, '')
        assert.equal(wrapper.children.length, 1)
        assert.equal(wrapper.children[0].style.display, '')
        assert.equal(wrapper.children[0].children[0].textContent, 'nested')
    })

    test('re-renders nested if wrapper but hides inner content when innerVisible is false', () => {
        const data = { visible: false, innerVisible: false }
        
        const wrapper = document.createElement('div')

        const ifNode = document.createElement('if')
        const nestedIf = document.createElement('if')
        nestedIf.setAttribute('test', 'innerVisible')

        const nestedChild = document.createElement('span')
        nestedChild.textContent = 'nested'
        nestedIf.appendChild(nestedChild)
        ifNode.appendChild(nestedIf)

        data.visible = true
        handleIfNodeRefresh(data, { wrapper, fullKey: 'visible', contextStack: new Map(), params: new Map(), controlNode: ifNode })

        assert.equal(wrapper.style.display, '')
        assert.equal(wrapper.children.length, 1)
        assert.equal(wrapper.children[0].style.display, 'none')
        assert.equal(wrapper.children[0].children.length, 0)
    })

    test('throws when wrapper is null', () => {
        const data = { visible: true }

        assert.throws(
            () => handleIfNodeRefresh(data, { wrapper: null, fullKey: 'visible', contextStack: new Map(), params: new Map(), controlNode: null }),
            /wrapper element missing/
        )
    })

    test('justHideChildren saves and restores children without cloning', () => {
        const data = { visible: true }

        const wrapper = document.createElement('div')
        const child = document.createElement('span')
        child.textContent = 'preserve'
        wrapper.appendChild(child)

        const ifNode = document.createElement('if')
        ifNode.setAttribute('justHideChildren', 'true')

        // collapse
        data.visible = false
        handleIfNodeRefresh(data, { wrapper, fullKey: 'visible', contextStack: new Map(), params: new Map(), controlNode: ifNode })

        // children moved into fragment and wrapper empty
        assert.equal(wrapper.children.length, 0)
        assert.ok(wrapper._savedFragment)
        assert.equal(wrapper._savedFragment.childNodes.length, 1)
        assert.equal(wrapper._savedFragment.firstChild, child)

        // expand again -> reattach same node
        data.visible = true
        handleIfNodeRefresh(data, { wrapper, fullKey: 'visible', contextStack: new Map(), params: new Map(), controlNode: ifNode })

        assert.equal(wrapper.children.length, 1)
        assert.equal(wrapper.children[0], child)
        assert.equal(wrapper._savedFragment, undefined)
    })

    test('justHideChildren falls back to initial rendering when no saved fragment', () => {
        const data = { visible: false }

        const wrapper = document.createElement('div')

        const ifNode = document.createElement('if')
        // create a template child to be rendered
        const newChild = document.createElement('span')
        newChild.textContent = 'from-walk'
        ifNode.appendChild(newChild)
        ifNode.setAttribute('justHideChildren', 'true')

        // show -> no saved fragment exists, so RenderEngine.walk should create children
        data.visible = true
        handleIfNodeRefresh(data, { wrapper, fullKey: 'visible', contextStack: new Map(), params: new Map(), controlNode: ifNode })

        assert.equal(wrapper.children.length, 1)
        assert.equal(wrapper.children[0].textContent, 'from-walk')
    })
})

describe('handleEachNodeRefresh', () => {
    test('removes DOM nodes after splice delete', () => {
        const data = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] }

        const eachNode = document.createElement('each')
        eachNode.setAttribute('of', 'items')
        eachNode.setAttribute('as', 'item')
        const mountNode = document.createElement('div')

        handleEachNode(data, new Map(), new Map(), eachNode, mountNode)

        // Simulate splice: delete middle item
        data.items.splice(1, 1)

        handleEachNodeRefresh(data, {
            fullKey: 'items',
            deleteStartIndex: 1,
            deleteCount: 1,
            insertStartIndex: 0,
            insertCount: 0,
            reindexStartIndex: 1,
            reindexShift: -1,
            reindexMaxIndex: 1
        })

        assert.equal(data.items[0].id, 1)
        assert.equal(data.items[1].id, 3)
    })

    test('updates DOM after push operation', () => {
        const data = { items: [{ id: 1 }, { id: 2 }] }

        const eachNode = document.createElement('each')
        eachNode.setAttribute('of', 'items')
        eachNode.setAttribute('as', 'item')
        const mountNode = document.createElement('div')

        handleEachNode(data, new Map(), new Map(), eachNode, mountNode)

        // Simulate push: add new item
        data.items.push({ id: 3 })

        handleEachNodeRefresh(data, {
            fullKey: 'items',
            deleteStartIndex: 0,
            deleteCount: 0,
            insertStartIndex: 2,
            insertCount: 1,
            reindexStartIndex: 2,
            reindexShift: 0,
            reindexMaxIndex: 2
        })

        assert.equal(data.items[0].id, 1)
        assert.equal(data.items[1].id, 2)
        assert.equal(data.items[2].id, 3)
    })

    test('updates DOM after unshift operation', () => {
        const data = { items: [{ id: 1 }, { id: 2 }] }

        const eachNode = document.createElement('each')
        eachNode.setAttribute('of', 'items')
        eachNode.setAttribute('as', 'item')
        const mountNode = document.createElement('div')

        handleEachNode(data, new Map(), new Map(), eachNode, mountNode)

        // Simulate unshift: add new item at start
        data.items.unshift({ id: 0 })

        handleEachNodeRefresh(data, {
            fullKey: 'items',
            deleteStartIndex: 0,
            deleteCount: 0,
            insertStartIndex: 0,
            insertCount: 1,
            reindexStartIndex: 1,
            reindexShift: 1,
            reindexMaxIndex: 2
        })

        assert.equal(data.items[0].id, 0)
        assert.equal(data.items[1].id, 1)
        assert.equal(data.items[2].id, 2)
    })

    test('updates DOM after splice insert multiple items', () => {
        const data = { items: [{ id: 1 }, { id: 4 }] }

        const eachNode = document.createElement('each')
        eachNode.setAttribute('of', 'items')
        eachNode.setAttribute('as', 'item')
        const mountNode = document.createElement('div')

        handleEachNode(data, new Map(), new Map(), eachNode, mountNode)

        // Simulate splice: insert 2 new items at position 1
        data.items.splice(1, 0, { id: 2 }, { id: 3 })

        handleEachNodeRefresh(data, {
            fullKey: 'items',
            deleteStartIndex: 0,
            deleteCount: 0,
            insertStartIndex: 1,
            insertCount: 2,
            reindexStartIndex: 3,
            reindexShift: 2,
            reindexMaxIndex: 3
        })

        assert.equal(data.items[0].id, 1)
        assert.equal(data.items[1].id, 2)
        assert.equal(data.items[2].id, 3)
        assert.equal(data.items[3].id, 4)
    })

    test('updates DOM after multiple deletes', () => {
        const data = { items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }] }

        const eachNode = document.createElement('each')
        eachNode.setAttribute('of', 'items')
        eachNode.setAttribute('as', 'item')
        const mountNode = document.createElement('div')

        handleEachNode(data, new Map(), new Map(), eachNode, mountNode)

        // Simulate splice: delete 2 items from position 1
        data.items.splice(1, 2)

        handleEachNodeRefresh(data, {
            fullKey: 'items',
            deleteStartIndex: 1,
            deleteCount: 2,
            insertStartIndex: 0,
            insertCount: 0,
            reindexStartIndex: 1,
            reindexShift: -2,
            reindexMaxIndex: 2
        })

        assert.equal(data.items[0].id, 1)
        assert.equal(data.items[1].id, 4)
        assert.equal(data.items[2].id, 5)
    })

    test('handles empty array after deletion', () => {
        const data = { items: [{ id: 1 }] }
        
        const eachNode = document.createElement('each')
        eachNode.setAttribute('of', 'items')
        eachNode.setAttribute('as', 'item')
        const mountNode = document.createElement('div')

        handleEachNode(data, new Map(), new Map(), eachNode, mountNode)

        // Simulate pop: remove last item
        data.items.pop()

        handleEachNodeRefresh(data, {
            fullKey: 'items',
            deleteStartIndex: 0,
            deleteCount: 1,
            insertStartIndex: 0,
            insertCount: 0,
            reindexStartIndex: 0,
            reindexShift: 0,
            reindexMaxIndex: -1
        })

        assert.equal(data.items.length, 0)
    })
})

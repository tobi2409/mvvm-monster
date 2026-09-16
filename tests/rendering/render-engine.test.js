import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import RenderEngine from '../../src/rendering/render-engine.js'
import NodeHolders from '../../src/dom/node-holders.js'
import UuidItemMap from '../../src/identity/uuid-item-map.js'

const { handleGetNode, handleDefaultNode, handleIfNode, handleEachNode } = RenderEngine
const { nodeHoldersByKeys } = NodeHolders
const { getUuidByItem } = UuidItemMap

const { window } = new JSDOM('<!DOCTYPE html><body></body>')
global.document = window.document
global.Node = window.Node

beforeEach(() => {
    nodeHoldersByKeys.clear()
})

describe('handleGetNode', () => {
    test('creates span with resolved value and mounts to mountNode', () => {
        const data = { name: 'Alice' }
        
        const getNode = document.createElement('get')
        getNode.textContent = 'name'
        const mountNode = document.createElement('div')

        handleGetNode(data, new Map(), new Map(), getNode, mountNode)

        assert.equal(mountNode.children.length, 1)
        assert.ok(mountNode.children[0].classList.contains('get-resolved'))
        assert.equal(mountNode.children[0].tagName, 'SPAN')
        assert.equal(mountNode.children[0].textContent, 'Alice')
    })

    // NodeHolder-Verhalten wird bewusst separat getestet, weil das ein eigener, größerer Verantwortungsbereich ist.
    test('registers NodeHolder for the resolved key', () => {
        const data = { title: 'Test' }
        
        const getNode = document.createElement('get')
        getNode.textContent = 'title'
        const mountNode = document.createElement('div')

        handleGetNode(data, new Map(), new Map(), getNode, mountNode)

        const holders = nodeHoldersByKeys.getByKey('title')?.get('holders')
        assert.ok(holders?.length === 1)
        assert.equal(holders[0].action, 'updateGet')
        assert.equal(holders[0].controlNode, getNode)
        assert.equal(holders[0].node, mountNode.children[0])
        assert.ok(holders[0].node.classList.contains('get-resolved'))
    })

    test('inserts before anchor when insertBeforeAnchor is provided', () => {
        // needed for array operations like unshift/splice to insert elements at specific positions
        const data = { a: 'first', b: 'second' }
        const mountNode = document.createElement('div')

        const getNodeB = document.createElement('get')
        getNodeB.textContent = 'b'
        handleGetNode(data, new Map(), new Map(), getNodeB, mountNode)

        const anchor = mountNode.children[0]

        const getNodeA = document.createElement('get')
        getNodeA.textContent = 'a'
        handleGetNode(data, new Map(), new Map(), getNodeA, mountNode, anchor)

        assert.equal(mountNode.children[0].textContent, 'first')
        assert.equal(mountNode.children[1].textContent, 'second')
    })

    test('resolves keys from params when available', () => {
        const data = { default: 'dataValue' }

        const params = new Map()
        params.set('value', 'paramValue')

        const getNode = document.createElement('get')
        getNode.textContent = 'value'
        const mountNode = document.createElement('div')

        handleGetNode(data, new Map(), params, getNode, mountNode)

        assert.equal(mountNode.children[0].textContent, 'paramValue')
    })
})

describe('handleDefaultNode', () => {
    test('clones default node and mounts it', () => {
        const data = { title: 'Test' }

        const defaultNode = document.createElement('div')
        defaultNode.textContent = 'content'
        const mountNode = document.createElement('div')

        handleDefaultNode(data, new Map(), new Map(), defaultNode, mountNode)

        assert.equal(mountNode.children.length, 1)
        assert.equal(mountNode.children[0].textContent, 'content')
    })

    test('mounts before anchor when provided', () => {
        // Ensures stable insertion order when nodes must be inserted at a specific position.
        const data = {}

        const mountNode = document.createElement('div')

        const div1 = document.createElement('div')
        div1.textContent = 'first'
        handleDefaultNode(data, new Map(), new Map(), div1, mountNode)

        const anchor = mountNode.children[0]

        const div2 = document.createElement('div')
        div2.textContent = 'second'
        handleDefaultNode(data, new Map(), new Map(), div2, mountNode, anchor)

        assert.equal(mountNode.children[0].textContent, 'second')
        assert.equal(mountNode.children[1].textContent, 'first')
    })
})

describe('handleIfNode', () => {
    test('creates wrapper with display:none initially', () => {
        const data = { visible: false }

        const ifNode = document.createElement('if')
        ifNode.setAttribute('test', 'visible')
        ifNode.setAttribute('wrapper', 'section')
        const mountNode = document.createElement('div')

        handleIfNode(data, new Map(), new Map(), ifNode, mountNode)

        assert.equal(mountNode.children.length, 1)
        assert.equal(mountNode.children[0].tagName, 'SECTION')
        assert.equal(mountNode.children[0].style.display, 'none')
        assert.equal(mountNode.children[0].children.length, 0)
    })

    test('shows wrapper when test resolves to true', () => {
        const data = { visible: true }

        const ifNode = document.createElement('if')
        ifNode.setAttribute('test', 'visible')
        const mountNode = document.createElement('div')

        handleIfNode(data, new Map(), new Map(), ifNode, mountNode)

        assert.equal(mountNode.children.length, 1)
        assert.equal(mountNode.children[0].style.display, '')
    })

    test('renders child nodes when test resolves to true', () => {
        const data = { visible: true }
        
        const ifNode = document.createElement('if')
        ifNode.setAttribute('test', 'visible')

        const child = document.createElement('span')
        child.textContent = 'Hello'
        ifNode.appendChild(child)

        const mountNode = document.createElement('div')

        handleIfNode(data, new Map(), new Map(), ifNode, mountNode)

        const wrapper = mountNode.children[0]
        assert.equal(wrapper.children.length, 1)
        assert.equal(wrapper.children[0].tagName, 'SPAN')
        assert.equal(wrapper.children[0].textContent, 'Hello')
    })

    test('renders nested if child when both conditions are true', () => {
        const data = { outerVisible: true, innerVisible: true }

        const outerIf = document.createElement('if')
        outerIf.setAttribute('test', 'outerVisible')

        const innerIf = document.createElement('if')
        innerIf.setAttribute('test', 'innerVisible')

        const nestedChild = document.createElement('span')
        nestedChild.textContent = 'Nested content'
        innerIf.appendChild(nestedChild)
        outerIf.appendChild(innerIf)

        const mountNode = document.createElement('div')

        handleIfNode(data, new Map(), new Map(), outerIf, mountNode)

        const outerWrapper = mountNode.children[0]
        const innerWrapper = outerWrapper.children[0]

        assert.equal(outerWrapper.style.display, '')
        assert.equal(innerWrapper.style.display, '')
        assert.equal(innerWrapper.children[0].textContent, 'Nested content')
    })

    test('hides nested if when inner condition is false', () => {
        const data = { outerVisible: true, innerVisible: false }

        const outerIf = document.createElement('if')
        outerIf.setAttribute('test', 'outerVisible')

        const innerIf = document.createElement('if')
        innerIf.setAttribute('test', 'innerVisible')

        const nestedChild = document.createElement('span')
        nestedChild.textContent = 'Nested content'
        innerIf.appendChild(nestedChild)
        outerIf.appendChild(innerIf)

        const mountNode = document.createElement('div')

        handleIfNode(data, new Map(), new Map(), outerIf, mountNode)

        const outerWrapper = mountNode.children[0]
        const innerWrapper = outerWrapper.children[0]

        assert.equal(outerWrapper.style.display, '')
        assert.equal(innerWrapper.style.display, 'none')
        assert.equal(innerWrapper.children.length, 0)
    })

    test('throws when test does not resolve to boolean', () => {
        const data = { value: 'not-a-boolean' }

        const ifNode = document.createElement('if')
        ifNode.setAttribute('test', 'value')
        const mountNode = document.createElement('div')

        assert.throws(
            () => handleIfNode(data, new Map(), new Map(), ifNode, mountNode),
            /if-test must resolve to a boolean/
        )
    })

    test('registers NodeHolder for the test key', () => {
        const data = { visible: true }

        const ifNode = document.createElement('if')
        ifNode.setAttribute('test', 'visible')
        const mountNode = document.createElement('div')

        handleIfNode(data, new Map(), new Map(), ifNode, mountNode)

        const holders = nodeHoldersByKeys.getByKey('visible')?.get('holders')
        assert.ok(holders?.length === 1)
        assert.equal(holders[0].action, 'updateIf')
        assert.strictEqual(holders[0].controlNode, ifNode)
        assert.strictEqual(holders[0].wrapper, mountNode.children[0])
    })
})

describe('handleEachNode', () => {
    test('creates nodes for each array item', () => {
        const data = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] }

        const eachNode = document.createElement('each')
        eachNode.setAttribute('of', 'items')
        eachNode.setAttribute('as', 'item')

        const itemWrapper = document.createElement('span')
        itemWrapper.className = 'item'
        const getNode = document.createElement('get')
        getNode.textContent = 'item.id'
        itemWrapper.appendChild(getNode)
        eachNode.appendChild(itemWrapper)

        const mountNode = document.createElement('div')

        handleEachNode(data, new Map(), new Map(), eachNode, mountNode)

        const items = mountNode.querySelectorAll('.item')
        assert.equal(items.length, 3)
        assert.equal(items[0].querySelector('.get-resolved').textContent, '1')
        assert.equal(items[1].querySelector('.get-resolved').textContent, '2')
        assert.equal(items[2].querySelector('.get-resolved').textContent, '3')
    })

    test('throws when each-of is not an array', () => {
        const data = { notArray: 'string' }

        const eachNode = document.createElement('each')
        eachNode.setAttribute('of', 'notArray')
        eachNode.setAttribute('as', 'item')
        const mountNode = document.createElement('div')

        assert.throws(
            () => handleEachNode(data, new Map(), new Map(), eachNode, mountNode),
            /each-of expected an Array/
        )
    })

    test('registers NodeHolder for the array key', () => {
        const data = { items: [{ id: 1 }, { id: 2 }] }

        const eachNode = document.createElement('each')
        eachNode.setAttribute('of', 'items')
        eachNode.setAttribute('as', 'item')
        const mountNode = document.createElement('div')

        handleEachNode(data, new Map(), new Map(), eachNode, mountNode)

        const holders = nodeHoldersByKeys.getByKey('items')?.get('holders')
        assert.ok(holders?.length === 1)
        assert.equal(holders[0].action, 'updateEach')
        assert.strictEqual(holders[0].controlNode, eachNode)
        assert.strictEqual(holders[0].mountNode, mountNode)
    })

    test('registers items in UuidItemMap during rendering', () => {
        const data = { items: [{ id: 1 }, { id: 2 }, { id: 3 }] }
        
        const eachNode = document.createElement('each')
        eachNode.setAttribute('of', 'items')
        eachNode.setAttribute('as', 'item')
        const mountNode = document.createElement('div')

        handleEachNode(data, new Map(), new Map(), eachNode, mountNode)

        assert.ok(getUuidByItem(data.items[0]) !== undefined, 'items[0] should have UUID')
        assert.ok(getUuidByItem(data.items[1]) !== undefined, 'items[1] should have UUID')
        assert.ok(getUuidByItem(data.items[2]) !== undefined, 'items[2] should have UUID')
    })
})

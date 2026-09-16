import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import DefaultNodeAttributes from '../../src/rendering/default-node-attributes.js'
import NodeHolders from '../../src/dom/node-holders.js'

const { applyAttribute, handleActionAttribute, handleBindAttribute, handleStyleOrAttrAttribute } = DefaultNodeAttributes
const { nodeHoldersByKeys } = NodeHolders

const { window } = new JSDOM('<!DOCTYPE html><body></body>')
global.document = window.document
global.Node = window.Node

beforeEach(() => {
    nodeHoldersByKeys.clear()
})

describe('applyAttribute', () => {
    test('sets style property for style- prefix', () => {
        const node = document.createElement('div')
        applyAttribute(node, 'style-color', 'red')
        assert.equal(node.style.color, 'red')
    })

    test('sets style property for style- prefix with camelCase', () => {
        const node = document.createElement('div')
        applyAttribute(node, 'style-backgroundColor', 'blue')
        assert.equal(node.style.backgroundColor, 'blue')
    })

    test('sets HTML attribute for attr- prefix', () => {
        const node = document.createElement('div')
        applyAttribute(node, 'attr-data-id', '42')
        assert.equal(node.getAttribute('data-id'), '42')
    })

    test('sets HTML attribute for attr- prefix with arbitrary name', () => {
        const node = document.createElement('div')
        applyAttribute(node, 'attr-aria-label', 'Close')
        assert.equal(node.getAttribute('aria-label'), 'Close')
    })
})

describe('handleActionAttribute', () => {
    test('invokes the correct method on event', () => {
        let called = false
        const data = { handleClick: () => { called = true } }

        const cloned = document.createElement('button')
        cloned.setAttribute('action-click', 'handleClick')

        const attr = cloned.attributes.getNamedItem('action-click')

        handleActionAttribute(cloned, attr, data, new Map(), new Map())
        cloned.dispatchEvent(new window.MouseEvent('click'))

        assert.equal(called, true)
        assert.equal(cloned.hasAttribute('action-click'), false)
    })

    test('throws if method resolves to non-function', () => {
        const data = { notAFunction: 'hello' }

        const cloned = document.createElement('button')
        cloned.setAttribute('action-click', 'notAFunction')

        const attr = cloned.attributes.getNamedItem('action-click')

        assert.throws(
            () => handleActionAttribute(cloned, attr, data, new Map(), new Map()),
            /must be a function/
        )
    })
})

describe('handleBindAttribute', () => {
    test('sets initial value, removes attribute, and updates data on input', () => {
        const data = { title: 'Hello' }
        const contextStack = new Map()
        const params = new Map()

        const mainInput = document.createElement('input')
        mainInput.setAttribute('bind-input-value', 'title')
        const attr = mainInput.attributes.getNamedItem('bind-input-value')
        let changedKey

        handleBindAttribute(
            mainInput,
            attr,
            { fullKey: 'title', value: 'Hello' },
            data,
            contextStack,
            params,
            (fullKey) => { changedKey = fullKey }
        )

        assert.equal(mainInput.value, 'Hello')
        assert.equal(mainInput.hasAttribute('bind-input-value'), false)

        mainInput.value = 'World'
        mainInput.dispatchEvent(new window.Event('input'))

        assert.equal(data.title, 'World')
        assert.equal(changedKey, 'title')
    })

    test('registers NodeHolder for two-way binding', () => {
        const data = { name: 'Alice' }

        const cloned = document.createElement('input')
        cloned.setAttribute('bind-input-value', 'name')

        const attr = cloned.attributes.getNamedItem('bind-input-value')

        handleBindAttribute(cloned, attr, { fullKey: 'name', value: 'Alice' }, data, new Map(), new Map())

        const holders = nodeHoldersByKeys.getByKey('name')?.get('holders')
        assert.ok(holders?.length === 1)
        assert.equal(holders[0].action, 'updateDefault')
        assert.equal(holders[0].type, 'bind')
        assert.equal(holders[0].property, 'value')
    })
})

describe('handleStyleOrAttrAttribute', () => {
    test('applies attr- attribute to node and removes original attribute', () => {
        const cloned = document.createElement('div')
        // "theme" references a data variable key that will be resolved to "dark".
        cloned.setAttribute('attr-data-theme', 'theme')

        const attr = cloned.attributes.getNamedItem('attr-data-theme')
        const resolved = { fullKey: 'theme', value: 'dark' }

        handleStyleOrAttrAttribute(cloned, attr, resolved)

        assert.equal(cloned.getAttribute('data-theme'), 'dark')
        assert.equal(cloned.hasAttribute('attr-data-theme'), false)
    })

    test('applies style- attribute to node', () => {
        const cloned = document.createElement('div')
        // "color" references a data variable key that will be resolved to "blue".
        cloned.setAttribute('style-color', 'color')
        const attr = cloned.attributes.getNamedItem('style-color')
        const resolved = { fullKey: 'color', value: 'blue' }

        handleStyleOrAttrAttribute(cloned, attr, resolved)

        assert.equal(cloned.style.color, 'blue')
    })

    test('registers NodeHolder for the resolved key', () => {
        const cloned = document.createElement('div')
        cloned.setAttribute('attr-data-theme', 'theme')
        
        const attr = cloned.attributes.getNamedItem('attr-data-theme')
        const resolved = { fullKey: 'theme', value: 'dark' }

        handleStyleOrAttrAttribute(cloned, attr, resolved)

        const holders = nodeHoldersByKeys.getByKey('theme')?.get('holders')
        assert.ok(holders?.length === 1)
        assert.equal(holders[0].action, 'updateDefault')
        assert.equal(holders[0].type, 'attribute')
    })
})

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import DomUtils from '../../src/dom/dom.js'

const { mount } = DomUtils

function createDOM() {
    const dom = new JSDOM('<!DOCTYPE html><body></body>')
    return dom.window.document
}

describe('mount', () => {
    test('appends node to mountNode', () => {
        const document = createDOM()
        const mountNode = document.createElement('div')
        const child = document.createElement('span')

        mount(child, mountNode)

        assert.equal(mountNode.children.length, 1)
        assert.strictEqual(mountNode.children[0], child)
    })

    test('appends multiple nodes sequentially', () => {
        const document = createDOM()
        const mountNode = document.createElement('div')
        const child1 = document.createElement('span')
        const child2 = document.createElement('p')

        mount(child1, mountNode)
        mount(child2, mountNode)

        assert.equal(mountNode.children.length, 2)
        assert.strictEqual(mountNode.children[0], child1)
        assert.strictEqual(mountNode.children[1], child2)
    })

    test('inserts node before anchor', () => {
        const document = createDOM()
        const mountNode = document.createElement('div')
        const first = document.createElement('span')
        const second = document.createElement('p')

        mount(first, mountNode)
        mount(second, mountNode, first) // insert before first

        assert.equal(mountNode.children.length, 2)
        assert.strictEqual(mountNode.children[0], second)
        assert.strictEqual(mountNode.children[1], first)
    })

    test('appends when insertBeforeAnchor is undefined', () => {
        const document = createDOM()
        const mountNode = document.createElement('div')
        const child = document.createElement('span')

        mount(child, mountNode, undefined)

        assert.equal(mountNode.children.length, 1)
        assert.strictEqual(mountNode.children[0], child)
    })
})

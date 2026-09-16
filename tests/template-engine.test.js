import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import TemplateEngine from '../src/template-engine.js'
import ModelSynchronization from '../src/model/model-synchronization.js'
import NodeHolders from '../src/dom/node-holders.js'

const { nodeHoldersByKeys } = NodeHolders

const { window } = new JSDOM('<!DOCTYPE html><body></body>')
global.document = window.document
global.Node = window.Node

function setupTemplate(templateContent) {
    document.body.innerHTML = ''

    const template = document.createElement('template')
    template.id = 'test-template'
    template.innerHTML = templateContent
    document.body.appendChild(template)

    const mountEl = document.createElement('div')
    mountEl.id = 'mount'
    document.body.appendChild(mountEl)

    const templateUse = document.createElement('template-use')
    templateUse.setAttribute('template-id', 'test-template')
    templateUse.setAttribute('mount-id', 'mount')
    document.body.appendChild(templateUse)

    return { mount: mountEl, templateUse }
}

beforeEach(() => {
    nodeHoldersByKeys.clear()
})

describe('TemplateEngine.reactive', () => {
    test('throws when entry point is not template-use', () => {
        const div = document.createElement('div')
        assert.throws(
            () => TemplateEngine.reactive({}, div),
            /reactive expected "node" to be a <template-use> element/
        )
    })

    test('renders GET tag with initial data value', () => {
        const { mount, templateUse } = setupTemplate('<get>name</get>')

        TemplateEngine.reactive({ name: 'Alice' }, templateUse)

        const span = mount.querySelector('.get-resolved')
        assert.ok(span)
        assert.equal(span.textContent, 'Alice')
    })

    test('updates GET span when property changes', () => {
        const { mount, templateUse } = setupTemplate('<get>name</get>')

        const data = TemplateEngine.reactive({ name: 'Alice' }, templateUse)
        data.name = 'Bob'

        const span = mount.querySelector('.get-resolved')
        assert.equal(span.textContent, 'Bob')
    })

    test('renders multiple GET tags independently', () => {
        const { mount, templateUse } = setupTemplate('<get>firstName</get><get>lastName</get>')

        TemplateEngine.reactive({ firstName: 'Alice', lastName: 'Smith' }, templateUse)

        const spans = mount.querySelectorAll('.get-resolved')
        assert.equal(spans[0].textContent, 'Alice')
        assert.equal(spans[1].textContent, 'Smith')
    })

    test('renders IF tag visible when test is true', () => {
        const { mount, templateUse } = setupTemplate('<if test="visible"><span>Hello</span></if>')

        TemplateEngine.reactive({ visible: true }, templateUse)

        const wrapper = mount.children[0]
        const span = wrapper.querySelector('span')

        assert.equal(wrapper.style.display, '')
        assert.ok(span)
        assert.equal(span.textContent, 'Hello')
    })

    test('renders IF tag hidden when test is false', () => {
        const { mount, templateUse } = setupTemplate('<if test="visible"><span>Hello</span></if>')

        TemplateEngine.reactive({ visible: false }, templateUse)

        const wrapper = mount.children[0]
        const span = wrapper.querySelector('span')

        assert.equal(wrapper.style.display, 'none')
        assert.equal(span, null)
    })

    test('updates IF tag visibility when property changes', () => {
        const { mount, templateUse } = setupTemplate('<if test="visible"><span>Hello</span></if>')

        const data = TemplateEngine.reactive({ visible: false }, templateUse)
        const wrapper = mount.children[0]
        let span = wrapper.querySelector('span')
        assert.equal(wrapper.style.display, 'none')
        assert.equal(span, null)

        data.visible = true
        span = wrapper.querySelector('span')
        assert.equal(wrapper.style.display, '')
        assert.ok(span)
        assert.equal(span.textContent, 'Hello')
    })

    test('renders EACH tag with correct number of items', () => {
        const { mount, templateUse } = setupTemplate(`
            <each of="items" as="item">
                <span class="item"><get>item.name</get></span>
            </each>
        `)

        TemplateEngine.reactive({
            items: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }]
        }, templateUse)

        const items = mount.querySelectorAll('.item')
        assert.equal(items.length, 3)
        assert.equal(items[0].querySelector('.get-resolved').textContent, 'Alice')
        assert.equal(items[1].querySelector('.get-resolved').textContent, 'Bob')
        assert.equal(items[2].querySelector('.get-resolved').textContent, 'Carol')
    })

    test('push adds item to EACH list in DOM', () => {
        const { mount, templateUse } = setupTemplate(`
            <each of="items" as="item">
                <span class="item"><get>item.label</get></span>
            </each>
        `)

        const data = TemplateEngine.reactive({
            items: [{ label: 'A' }, { label: 'B' }]
        }, templateUse)

        data.items.push({ label: 'C' })

        const items = mount.querySelectorAll('.item')
        assert.equal(items.length, 3)
        assert.equal(items[0].querySelector('.get-resolved').textContent, 'A')
        assert.equal(items[1].querySelector('.get-resolved').textContent, 'B')
        assert.equal(items[2].querySelector('.get-resolved').textContent, 'C')
    })

    test('updates GET array length after array mutations', () => {
        const { mount, templateUse } = setupTemplate('<get>items.length</get>')

        const data = TemplateEngine.reactive({ items: [{ label: 'A' }] }, templateUse)
        const length = mount.querySelector('.get-resolved')

        data.items.push({ label: 'B' })
        assert.equal(length.textContent, '2')

        data.items.pop()
        assert.equal(length.textContent, '1')
    })

    test('renders updates for two views using same each source (change + push)', () => {
        const { mount, templateUse } = setupTemplate(`
            <div id="view-a">
                <each of="items" as="item">
                    <span class="item-a"><get>item.label</get></span>
                </each>
            </div>

            <div id="view-b">
                <each of="items" as="item">
                    <span class="item-b"><get>item.label</get></span>
                </each>
            </div>
        `)

        const data = TemplateEngine.reactive({
            items: [{ label: 'A' }, { label: 'B' }]
        }, templateUse)

        // Change existing item -> must update in both views
        data.items[0].label = 'A*'

        let viewAItems = mount.querySelectorAll('.item-a')
        let viewBItems = mount.querySelectorAll('.item-b')

        assert.equal(viewAItems.length, 2)
        assert.equal(viewBItems.length, 2)
        assert.equal(viewAItems[0].querySelector('.get-resolved').textContent, 'A*')
        assert.equal(viewBItems[0].querySelector('.get-resolved').textContent, 'A*')

        // Push new item -> must be rendered in both views
        data.items.push({ label: 'C' })

        viewAItems = mount.querySelectorAll('.item-a')
        viewBItems = mount.querySelectorAll('.item-b')

        assert.equal(viewAItems.length, 3)
        assert.equal(viewBItems.length, 3)
        assert.equal(viewAItems[2].querySelector('.get-resolved').textContent, 'C')
        assert.equal(viewBItems[2].querySelector('.get-resolved').textContent, 'C')
    })

    test('notifies dependent properties via dependency map', () => {
        const { mount, templateUse } = setupTemplate('<get>firstName</get><get>fullName</get>')

        const rawData = { firstName: 'Alice', lastName: 'Smith' }
        const data = TemplateEngine.reactive(
            {
                get firstName() { return rawData.firstName },
                set firstName(v) { rawData.firstName = v },
                get fullName() { return `${rawData.firstName} ${rawData.lastName}` }
            },
            templateUse,
            { 'firstName': ['fullName'] }
        )

        data.firstName = 'Bob'

        const spans = mount.querySelectorAll('.get-resolved')
        assert.equal(spans[1].textContent, 'Bob Smith')
    })
})

describe('TemplateEngine.withoutModelSynchronization', () => {
    test('delegates to model synchronization scope', async () => {
        await TemplateEngine.withoutModelSynchronization(() => {
            assert.equal(ModelSynchronization.isModelSynchronizationDisabled(), true)
        })

        assert.equal(ModelSynchronization.isModelSynchronizationDisabled(), false)
    })

    test('throws when callback is not a function', async () => {
        await assert.rejects(
            TemplateEngine.withoutModelSynchronization(null),
            /withoutModelSynchronization expected "callback" to be a function/
        )
    })
})

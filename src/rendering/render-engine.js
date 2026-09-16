// Initial Rendering Component: First template rendering pass

import NodeHolders from '../dom/node-holders.js'
import KeyResolver from '../resolution/key-resolver.js'
import DomUtils from '../dom/dom.js'
import DefaultNodeAttributes from './default-node-attributes.js'
import AliasResolver from '../resolution/alias-resolver.js'
import UuidItemMap from '../identity/uuid-item-map.js'

const RenderEngine = (function () {
    function _previewValue(v) {
        try {
            
            if (v === null) {
                return 'null'
            }

            if (v === undefined) {
                return 'undefined'
            }

            if (typeof v === 'object') {
                return JSON.stringify(v)
            }

            return String(v)
        } catch (e) {
            return Object.prototype.toString.call(v)
        }
    }
    
    function handleTextNode(textNode, mountNode, insertBeforeAnchor = undefined) {
        const cloned = textNode.cloneNode(false)
        DomUtils.mount(cloned, mountNode, insertBeforeAnchor)
    }

    function handleGetNode(data, contextStack = new Map(), params = new Map(), getNode, mountNode, insertBeforeAnchor = undefined, dependencies = {}) {
        const key = getNode.textContent
        const resolved = KeyResolver.resolveEx(key, data, contextStack, params)

        const resolvedTextSpan = document.createElement('span')
        resolvedTextSpan.classList.add('get-resolved')
        resolvedTextSpan.textContent = resolved.value

        DomUtils.mount(resolvedTextSpan, mountNode, insertBeforeAnchor)

        NodeHolders.nodeHoldersByKeys.appendToKey(resolved.fullKey,
            { action: 'updateGet', controlNode: getNode, node: resolvedTextSpan })
    }

    function handleEachNode(data, contextStack = new Map(), params = new Map(), eachNode, mountNode, refreshInfo = undefined, dependencies = {}) {
        const ofAttribute = eachNode.getAttribute('of')
        const resolvedOf = KeyResolver.resolveEx(ofAttribute, data, contextStack, params)

        const asAttribute = eachNode.getAttribute('as')
        const resolvedAsAttribute = AliasResolver.resolveEachAlias(asAttribute, contextStack)

        if (!refreshInfo) {
            NodeHolders.nodeHoldersByKeys.appendToKey(resolvedOf.fullKey,
                { action: 'updateEach', contextStack: new Map(contextStack), params: params, controlNode: eachNode, mountNode: mountNode })
        }

        const list = resolvedOf.value

        if (!Array.isArray(list)) {
            const preview = _previewValue(list)
            throw new Error(`each-of expected an Array for "${ofAttribute}" (full-key: ${resolvedOf.fullKey}) but got ${typeof list}: ${preview}`)
        }

        const startIndex = refreshInfo?.startIndex ?? 0
        const endIndex = refreshInfo?.endIndex ?? undefined

        const defaultPushStartIndex = list.length + startIndex
        const _startIndex = startIndex < 0 ? defaultPushStartIndex : startIndex
        const _endIndex = endIndex !== undefined ? endIndex : list.length - 1

        const insertBeforeAnchor = refreshInfo ? mountNode.children[_startIndex] : undefined
        const fragment = document.createDocumentFragment()

        for (let index = _startIndex; index <= _endIndex; index++) {
            const listElement = list[index]

            // Wichtig: handleEachNode läuft im initialen Render innerhalb run().
            // Zu diesem Zeitpunkt wurde makeReactive(data) noch nicht ausgeführt,
            // daher stellen wir hier sicher, dass Listenelemente bereits eine UUID haben.
            UuidItemMap.ensureUuidForItem(listElement)

            const childContextStack = new Map(contextStack)
            childContextStack.set(asAttribute, {
                data: listElement,
                fullKey: resolvedOf.fullKey
            })

            if (asAttribute !== resolvedAsAttribute) {
                childContextStack.set(resolvedAsAttribute, {
                    data: listElement,
                    fullKey: resolvedOf.fullKey
                })
            }

            walk(data, childContextStack, params, eachNode.childNodes, fragment, undefined, dependencies)
        }

        DomUtils.mount(fragment, mountNode, insertBeforeAnchor)
    }

    function handleIfNode(data, contextStack = new Map(), params = new Map(), ifNode, mountNode, insertBeforeAnchor = undefined, dependencies = {}) {
        const test = ifNode.getAttribute('test')
        const resolvedTest = KeyResolver.resolveEx(test, data, contextStack, params)

        if (typeof resolvedTest.value !== 'boolean') {
            const preview = _previewValue(resolvedTest.value)
            throw new Error(`if-test must resolve to a boolean for "${test}" (full-key: ${resolvedTest.fullKey}) but got ${typeof resolvedTest.value}: ${preview}`)
        }

        const wrapperTag = ifNode.getAttribute('wrapper') || 'div'
        const wrapper = document.createElement(wrapperTag)
        wrapper.style.display = 'none'
        // mark wrapper so callers can target it (e.g. make it layout-neutral)
        wrapper.dataset.ifWrapper = 'true'

        DomUtils.mount(wrapper, mountNode, insertBeforeAnchor)

        if (resolvedTest.value) {
            wrapper.style.display = ''
            walk(data, contextStack, params, ifNode.childNodes, wrapper, undefined, dependencies)
        }

        NodeHolders.nodeHoldersByKeys.appendToKey(resolvedTest.fullKey,
            { action: 'updateIf', contextStack: contextStack, params: params, controlNode: ifNode, wrapper: wrapper })
    }

    function handleTemplateUse(data, contextStack = new Map(), params = new Map(), templateUseNode, mountNode, dependencies = {}) {
        const childParams = new Map(params)

        for (const key in templateUseNode.dataset) {
            childParams.set(key, templateUseNode.dataset[key])
        }

        const templateId = templateUseNode.attributes.getNamedItem('template-id').value
        const templateNode = document.getElementById(templateId)

        if (!templateNode) {
            throw new Error(`Template with id "${templateId}" not found`)
        }

        walk(data, contextStack, childParams, templateNode.content.children, mountNode, undefined, dependencies)
    }

    function handleDefaultNode(data, contextStack = new Map(), params = new Map(), defaultNode, mountNode, insertBeforeAnchor = undefined, dependencies = {}) {
        const cloned = defaultNode.cloneNode(false)

        for (const attr of defaultNode.attributes) {
            if (attr.name.startsWith('action-')) {
                DefaultNodeAttributes.handleActionAttribute(cloned, attr, data, contextStack, params)
            } else if (attr.name.startsWith('bind-')) {
                const resolved = KeyResolver.resolveEx(attr.value, data, contextStack, params)
                DefaultNodeAttributes.handleBindAttribute(cloned, attr, resolved, data, contextStack, params)
            } else if (attr.name.startsWith('attr-') || attr.name.startsWith('style-')) {
                const resolved = KeyResolver.resolveEx(attr.value, data, contextStack, params)
                DefaultNodeAttributes.handleStyleOrAttrAttribute(cloned, attr, resolved)
            }
        }

        DomUtils.mount(cloned, mountNode, insertBeforeAnchor)
        walk(data, contextStack, params, defaultNode.childNodes, cloned, undefined, dependencies)
    }

    function walk(data, contextStack = new Map(), params = new Map(), nodes, mountNode, insertBeforeAnchor = undefined, dependencies = {}) {
        for (const node of nodes) {
            if (node.nodeType === Node.COMMENT_NODE) {
                continue
            }

            if (node.nodeType === Node.TEXT_NODE) {
                if (!node.textContent || node.textContent.trim() === '') {
                    continue
                }

                handleTextNode(node, mountNode, insertBeforeAnchor)
                continue
            }

            switch (node.tagName) {
            case 'GET':
                handleGetNode(data, contextStack, params, node, mountNode, insertBeforeAnchor, dependencies)
                break
            case 'EACH':
                handleEachNode(data, contextStack, params, node, mountNode, undefined, dependencies)
                break
            case 'IF':
                handleIfNode(data, contextStack, params, node, mountNode, insertBeforeAnchor, dependencies)
                break
            case 'TEMPLATE-USE':
                handleTemplateUse(data, contextStack, params, node, mountNode, dependencies)
                break
            default:
                handleDefaultNode(data, contextStack, params, node, mountNode, insertBeforeAnchor, dependencies)
                break
            }
        }
    }

    function initialTemplateUse(data, contextStack = new Map(), templateUseNode, dependencies = {}) {
        const params = new Map()
        const mountNode = document.getElementById(templateUseNode.attributes.getNamedItem('mount-id').value)

        handleTemplateUse(data, contextStack, params, templateUseNode, mountNode, dependencies)
    }

    function run(data, templateUseNode, dependencies = {}) {
        if (templateUseNode.tagName !== 'TEMPLATE-USE') {
            throw new Error('entry point must be template-use')
        }

        const contextStack = new Map()
        initialTemplateUse(data, contextStack, templateUseNode, dependencies)
    }

    return {
        handleGetNode,
        handleEachNode,
        handleIfNode,
        handleDefaultNode,
        walk,
        run
    }
})()

export default RenderEngine

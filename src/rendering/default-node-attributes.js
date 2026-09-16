// Default Node Attributes: Handlers for action-, bind-, attr-, and style- attributes

import NodeHolders from '../dom/node-holders.js'
import KeyResolver from '../resolution/key-resolver.js'
import UuidItemMap from '../identity/uuid-item-map.js'

// Helper function to apply attribute value to DOM element
function applyAttribute(node, attrName, value) {
    if (attrName.startsWith('style-')) {
        node.style[attrName.slice(6)] = value
    } else if (attrName.startsWith('attr-')) {
        node.setAttribute(attrName.slice(5), value)
    }
}

function handleActionAttribute(cloned, attr, data, contextStack, params) {
    // event binding: action-{event}="dataKey"
    const event = attr.name.slice(7) // e.g., 'click', 'input'
    const methodName = attr.value
    
    const resolvedMethod = KeyResolver.resolveEx(methodName, data, contextStack, params)

    if (typeof resolvedMethod.value !== 'function') {
        throw new Error(`action "${methodName}" must be a function`)
    }

    // Get the last (innermost) each-context item from contextStack
    let contextItem

    for (const context of contextStack.values()) {
        if (context.data) {
            contextItem = context.data
        }
    }

    const contextUuid = contextItem ? UuidItemMap.getUuidByItem(contextItem) : undefined

    // Wrap the method to pass event and context item (or data if no context)
    cloned.addEventListener(event, (e) => {
        const reactiveContext = contextItem || data
        resolvedMethod.value(e, reactiveContext, contextUuid, contextStack)
    })

    cloned.removeAttribute(attr.name)
}

function handleBindAttribute(cloned, attr, resolved, data, contextStack, params, onValueChanged = () => {}) {
    // Two-way binding: bind-{event}-{property}="dataKey"
    const parts = attr.name.split('-')
    const event = parts[1] // e.g., 'input'
    const property = parts[2] // e.g., 'value'
    
    // Set initial value (Data → UI)
    cloned[property] = resolved.value
    
    // Add event listener for UI → Data binding
    cloned.addEventListener(event, (e) => {
        // Resolve key dynamically using contextStack from closure
        const currentResolved = KeyResolver.resolveEx(attr.value, data, contextStack, params)
        KeyResolver.setByPath(currentResolved.fullKey, data, e.target[property])
        onValueChanged(currentResolved.fullKey)
    })
    
    // Register NodeHolder for Data → UI refresh
    NodeHolders.nodeHoldersByKeys.appendToKey(resolved.fullKey,
        { action: 'updateDefault', type: 'bind', node: cloned, property: property })
    
    cloned.removeAttribute(attr.name)
}

function handleStyleOrAttrAttribute(cloned, attr, resolved) {
    applyAttribute(cloned, attr.name, resolved.value)
    cloned.removeAttribute(attr.name)

    NodeHolders.nodeHoldersByKeys.appendToKey(resolved.fullKey,
        { action: 'updateDefault', type: 'attribute', node: cloned, attributeName: attr.name })
}

const DefaultNodeAttributes = (function () {
    return {
        applyAttribute,
        handleActionAttribute,
        handleBindAttribute,
        handleStyleOrAttrAttribute
    }
})()

export default DefaultNodeAttributes

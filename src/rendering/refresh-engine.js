//TODO: Zuständigkeiten prüfen (NodeHolder)

// Refresh Rendering Component: Updates for existing DOM nodes

import NodeHolders from '../dom/node-holders.js'
import KeyResolver from '../resolution/key-resolver.js'
import DefaultNodeAttributes from './default-node-attributes.js'
import RenderEngine from './render-engine.js'

const RefreshEngine = (function () {
    function handleGetNodeRefresh(data, refreshInfo) {
        const value = refreshInfo.resolvedValue !== undefined
            ? refreshInfo.resolvedValue
            : KeyResolver.resolve(refreshInfo.fullKey, data)

        refreshInfo.existingNode.textContent = value
    }

    function handleEachNodeRefresh(data, refreshInfo) {
        const linkedNodeHolders = NodeHolders.nodeHoldersByKeys.getByKey(refreshInfo.fullKey)
        const { deleteStartIndex = 0, deleteCount = 0, insertStartIndex = 0, insertCount = 0 } = refreshInfo

        for (let i = 0; i < deleteCount; i++) {
            linkedNodeHolders.delete(String(deleteStartIndex + i))
        }

        for (const nodeHolder of linkedNodeHolders.get('holders')) {
            for (let i = 0; i < deleteCount; i++) {
                const childToRemove = nodeHolder.mountNode.children[deleteStartIndex]
                if (childToRemove) {
                    nodeHolder.mountNode.removeChild(childToRemove)
                }
            }

            if (insertCount > 0) {
                RenderEngine.handleEachNode(data, nodeHolder.contextStack, nodeHolder.params, nodeHolder.controlNode, nodeHolder.mountNode,
                    { startIndex: insertStartIndex, endIndex: insertStartIndex + insertCount - 1 })
            }
        }
    }

    function handleIfNodeRefresh(data, refreshInfo) {
        const wrapper = refreshInfo.wrapper

        if (!wrapper) {
            throw new Error(`wrapper element missing in IfNodeRefresh: ${JSON.stringify(refreshInfo)}`)
        }

        // Support optimized hiding: if justHideChildren is set we keep a saved
        // DocumentFragment to reattach instead of full re-render.
        const justHide = Boolean(refreshInfo.controlNode && refreshInfo.controlNode.attributes && refreshInfo.controlNode.attributes['justHideChildren'])

        const testValue = KeyResolver.resolve(refreshInfo.fullKey, data)

        if (justHide) {
            if (!testValue) {
                if (!wrapper._savedFragment) {
                    const frag = document.createDocumentFragment()
                    // Move (don't clone because DOM Element can only have one parent)
                    // all children to a DocumentFragment to save them for later reattachment
                    while (wrapper.firstChild) {
                        frag.appendChild(wrapper.firstChild)
                    }
                    
                    wrapper._savedFragment = frag
                }
            } else {
                if (wrapper._savedFragment) {
                    wrapper.appendChild(wrapper._savedFragment)
                    delete wrapper._savedFragment
                } else {
                    RenderEngine.walk(data, refreshInfo.contextStack, refreshInfo.params, refreshInfo.controlNode.childNodes, wrapper)
                }
            }

            wrapper.style.display = testValue ? '' : 'none'
        } else {
            // default behavior: replace children and rebuild when true
            wrapper.replaceChildren()
            wrapper.style.display = 'none'

            if (testValue) {
                wrapper.style.display = ''
                RenderEngine.walk(data, refreshInfo.contextStack, refreshInfo.params, refreshInfo.controlNode.childNodes, wrapper)
            }
        }
    }

    function handleDefaultNodeRefresh(data, refreshInfo) {
        const value = refreshInfo.resolvedValue !== undefined
            ? refreshInfo.resolvedValue
            : KeyResolver.resolve(refreshInfo.fullKey, data)

        if (refreshInfo.type === 'bind') {
            refreshInfo.node[refreshInfo.property] = value
        } else if (refreshInfo.type === 'attribute') {
            DefaultNodeAttributes.applyAttribute(refreshInfo.node, refreshInfo.attributeName, value)
        }
    }

    return {
        handleGetNodeRefresh,
        handleEachNodeRefresh,
        handleIfNodeRefresh,
        handleDefaultNodeRefresh
    }
})()

export default RefreshEngine

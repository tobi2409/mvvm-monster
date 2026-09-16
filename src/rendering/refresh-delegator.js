//TODO: Zuständigkeiten prüfen (NodeHolder)

// Refresh Component: Updates and reactivity

import NodeHolders from '../dom/node-holders.js'
import KeyResolver from '../resolution/key-resolver.js'
import RefreshEngine from './refresh-engine.js'

const RefreshDelegator = (function () {
    function refresh(data, change, app) {
        switch (change.action) {
            case 'push': {
                const list = KeyResolver.resolve(change.fullKey, data)
                
                RefreshEngine.handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, insertStartIndex: list.length - change.items.length, insertCount: change.items.length })

                break
            }
            case 'pop': {
                const list = KeyResolver.resolve(change.fullKey, data)

                RefreshEngine.handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, deleteStartIndex: list.length, deleteCount: 1 })

                break
            }
            case 'shift': {
                const list = KeyResolver.resolve(change.fullKey, data)

                RefreshEngine.handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, deleteStartIndex: 0, deleteCount: 1, reindexStartIndex: 1, reindexShift: -1, reindexMaxIndex: list.length })

                break
            }
            case 'unshift': {
                const list = KeyResolver.resolve(change.fullKey, data)

                RefreshEngine.handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, insertStartIndex: 0, insertCount: change.items.length,
                        reindexStartIndex: 0, reindexShift: change.items.length, reindexMaxIndex: list.length - change.items.length - 1 })

                break
            }
            case 'splice': {
                const list = KeyResolver.resolve(change.fullKey, data)
                const shift = change.items.length - change.deleteCount
                const oldLength = list.length - change.items.length + change.deleteCount

                RefreshEngine.handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, deleteStartIndex: change.startIndex, deleteCount: change.deleteCount,
                        insertStartIndex: change.startIndex, insertCount: change.items.length,
                        reindexStartIndex: change.startIndex + change.deleteCount, reindexShift: shift, reindexMaxIndex: oldLength - 1 })

                break
            }
            case 'updateEach': {
                const list = KeyResolver.resolve(change.fullKey, data)

                RefreshEngine.handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, deleteStartIndex: 0, deleteCount: list.length,
                        insertStartIndex: 0, insertCount: list.length })

                break
            }
            case 'updateGet': {
                const linkedNodeHolders = NodeHolders.nodeHoldersByKeys.getByKey(change.fullKey)
                const resolvedValue = KeyResolver.resolve(change.fullKey, data)

                for (const nodeHolder of linkedNodeHolders.get('holders')) {
                    RefreshEngine.handleGetNodeRefresh(data, { existingNode: nodeHolder.node, fullKey: change.fullKey, resolvedValue })
                }

                break
            }
            case 'updateIf': {
                const linkedNodeHolders = NodeHolders.nodeHoldersByKeys.getByKey(change.fullKey)

                for (const nodeHolder of linkedNodeHolders.get('holders')) {
                    RefreshEngine.handleIfNodeRefresh(data, { wrapper: nodeHolder.wrapper, fullKey: change.fullKey,
                        contextStack: nodeHolder.contextStack, params: nodeHolder.params, controlNode: nodeHolder.controlNode })
                }

                break
            }
            case 'updateDefault': {
                const linkedNodeHolders = NodeHolders.nodeHoldersByKeys.getByKey(change.fullKey)
                const resolvedValue = KeyResolver.resolve(change.fullKey, data)

                for (const nodeHolder of linkedNodeHolders.get('holders')) {
                    if (nodeHolder.type === 'bind') {
                        RefreshEngine.handleDefaultNodeRefresh(data, { node: nodeHolder.node, type: nodeHolder.type, fullKey: change.fullKey, property: nodeHolder.property, resolvedValue })
                    } else if (nodeHolder.type === 'attribute') {
                        RefreshEngine.handleDefaultNodeRefresh(data, { node: nodeHolder.node, type: nodeHolder.type, fullKey: change.fullKey, attributeName: nodeHolder.attributeName, resolvedValue })
                    }
                }

                break
            }
            default: {
                throw new Error(`Unsupported refresh action: "${change.action}"`)
            }
        }
    }

    return {
        refresh
    }
})()

export default RefreshDelegator

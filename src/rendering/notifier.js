import NodeHolders from '../dom/node-holders.js'
import RefreshDelegator from './refresh-delegator.js'
import DependencyResolver from '../reactivity/dependency-resolver.js'

const Notifier = (function () {
    function notifyKeyChange(data, fullKey, dependencies = {}) {
        notifyChange(data, fullKey, undefined, dependencies)
    }

    function notifyChange(data, fullKey, change = undefined, dependencies = {}) {
        const linkedNodeHolders = NodeHolders.nodeHoldersByKeys.getByKey(fullKey)
        const matchingDependents = DependencyResolver.findMatchingDependencies(fullKey, dependencies)

        if ((!linkedNodeHolders || linkedNodeHolders.get('holders')?.length === 0)
            && matchingDependents.length === 0) {
            return
        }

        if (linkedNodeHolders?.get('holders')?.length > 0) {
            if (change) {
                RefreshDelegator.refresh(data, change)
            } else {
                for (const nodeHolder of linkedNodeHolders.get('holders')) {
                    RefreshDelegator.refresh(data, { fullKey, action: nodeHolder.action })
                }
            }
        }

        notifyDependencies(data, matchingDependents, change)
    }

    function notifyDependencies(data, dependencyValues, sourceChange = undefined) {
        for (const dependencyValue of dependencyValues || []) {
            const action = sourceChange?.action || NodeHolders.nodeHoldersByKeys.getByKey(dependencyValue)?.get('holders')?.[0]?.action || 'update'
            const dependencyChange = { fullKey: dependencyValue, action }

            if (sourceChange?.items) {
                dependencyChange.items = sourceChange.items
            }

            if (sourceChange?.startIndex !== undefined) {
                dependencyChange.startIndex = sourceChange.startIndex
            }

            if (sourceChange?.deleteCount !== undefined) {
                dependencyChange.deleteCount = sourceChange.deleteCount
            }

            RefreshDelegator.refresh(data, dependencyChange)
        }
    }

    return { notifyKeyChange, notifyChange, notifyDependencies }
})()

export default Notifier
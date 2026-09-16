// NodeHolder Management: Tracking of DOM nodes and their registration

const NodeHolders = (function () {
    const nodeHoldersByKeys = new Map()

    nodeHoldersByKeys.getByKey = function(fullKey, create = false) {
        if (typeof fullKey !== 'string' || fullKey.length === 0) {
            if (create) {
                throw new TypeError('nodeHoldersByKeys.getByKey requires a non-empty string key when create=true')
            }

            return undefined
        }

        const segments = fullKey.split('.')
        let ref = nodeHoldersByKeys

        for (const segment of segments) {
            if (!ref.has(segment)) {
                if (!create) {
                    return undefined
                }
                
                ref.set(segment, new Map())
            }
            
            ref = ref.get(segment)
        }

        return ref
    }

    nodeHoldersByKeys.appendToKey = function(fullKey, nodeHolder) {
        if (!nodeHolder || typeof nodeHolder !== 'object') {
            throw new TypeError('nodeHoldersByKeys.appendToKey requires nodeHolder to be an object')
        }

        const ref = this.getByKey(fullKey, true)

        if (!ref.has('holders')) {
            ref.set('holders', [])
        }

        const holders = ref.get('holders')

        if (!holders.some(e => e.controlNode === nodeHolder.controlNode && e.node === nodeHolder.node)) {
            holders.push(nodeHolder)
        }
    }

    return {
        nodeHoldersByKeys
    }
})()

export default NodeHolders

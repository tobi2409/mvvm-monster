const AliasResolver = (function () {
    function resolveEachAlias(asAttribute, contextStack = new Map()) {
        if (!asAttribute?.endsWith('#')) {
            return asAttribute
        }

        const aliasBase = asAttribute.slice(0, -1)
        let level = 0

        for (const key of contextStack.keys()) {
            if (key.startsWith(`${aliasBase}-level-`)) {
                level++
            }
        }

        return `${aliasBase}-level-${level}`
    }

    return {
        resolveEachAlias
    }
})()

export default AliasResolver
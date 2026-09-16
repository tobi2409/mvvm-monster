// Array Helpers: small utilities for common array mutations

function removeByReference(array, item) {
    if (!Array.isArray(array)) {
        throw new TypeError(`removeByReference expects an array as the first argument, got ${typeof array}`)
    }

    const index = array.findIndex((entry) => entry === item)

    if (index !== -1) {
        array.splice(index, 1)
    }

    return index
}

function getParentContext(contextStack, aliasBase = 'item') {
    return contextStack?.get(`${aliasBase}-level-${contextStack.size - 3}`)
}

const ArrayHelpers = {
    removeByReference,
    getParentContext
}

export default ArrayHelpers

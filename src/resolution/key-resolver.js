// Key Resolution: Conversion and dereferencing of keys

import UuidItemMap from '../identity/uuid-item-map.js'

const KeyResolver = (function () {

    function dereferencePointer(pointer, params = new Map()) {
        if (!params.has(pointer.slice(1))) {
            throw new Error(`Cannot dereference pointer "${pointer}": no value found in params`)
        }

        return params.get(pointer.slice(1))
    }
    
    function convertToFullKey(relativeKey, contextStack = new Map(), params = new Map()) {
        const splitted = relativeKey.split('.')

        const dereferencedSegments = splitted[0].startsWith('*')
            ? dereferencePointer(splitted[0], params).split('.')
            : [splitted[0]]
        const firstSegment = dereferencedSegments[0]
        const remainingSegments = dereferencedSegments.slice(1).concat(splitted.slice(1))
        const dereferencedKey = [firstSegment, ...remainingSegments].join('.')

        const isFirstContext = contextStack.has(firstSegment)

        if (!isFirstContext) {
            return dereferencedKey
        }

        const context = contextStack.get(firstSegment)
        const index = UuidItemMap.getUuidByItem(context.data)

        if (index === undefined) {
            throw new Error(`Cannot resolve relative key "${relativeKey}": item index missing for context "${splitted[0]}"
                ${firstSegment !== splitted[0] ? `(dereferenced with "${firstSegment}")` : ''}`)
        }

        return convertToFullKey(`${context.fullKey}.${index}${remainingSegments.length > 0 ? '.' : ''}${remainingSegments.join('.')}`,
                                contextStack,
                                params)
    }

    function resolve(key, data, params = new Map(), evaluateFunctions = false) {
        const splitted = key.split('.')
        let value = data

        for (const [index, segment] of splitted.entries()) {
            if (index === 0 && params.has(segment)) {
                value = params.get(segment)
                return evaluateFunctions && typeof value === 'function' ? value() : value
            }

            if (segment.startsWith('__uuid__')) {
                const itemByUuid = UuidItemMap.getItemByUuid(segment)

                if (itemByUuid === undefined) {
                    throw new Error(`Error resolving key "${key}": UUID segment "${segment}" does not exist`)
                }

                value = itemByUuid
                continue
            }

            if (value === null || value === undefined) {
                const traversed = splitted.slice(0, index).join('.') || 'data-root'
                throw new Error(`Error resolving key "${key}": segment "${segment}" cannot be resolved because "${traversed}" is ${value === null ? 'null' : 'undefined'}`)
            }

            value = value[segment]

            if (evaluateFunctions && typeof value === 'function') {
                value = value()
            }
        }

        return value
    }

    function resolveEx(key, data, contextStack = new Map(), params = new Map()) {
        //const dereferencedKey = key.startsWith('*') && params.has(key.slice(1)) ? dereferencePointer(key, data, params) : key
        const fullKey = convertToFullKey(key, contextStack, params)
        return { fullKey: fullKey, value: resolve(fullKey, data, params) }
    }

    function setByPath(key, data, newValue) {
        const splitted = key.split('.')
        let target = data

        for (let i = 0; i < splitted.length - 1; i++) {
            const segment = splitted[i]

            if (segment.startsWith('__uuid__')) {
                target = UuidItemMap.getItemByUuid(segment)
            } else {
                target = target[segment]
            }

            if (target === null || target === undefined) {
                const traversed = splitted.slice(0, i + 1).join('.')
                throw new Error(`Cannot set "${key}": path "${traversed}" does not exist`)
            }
        }

        const lastKey = splitted[splitted.length - 1]
        target[lastKey] = newValue
    }

    return {
        convertToFullKey,
        dereferencePointer,
        resolve,
        resolveEx,
        setByPath
    }
})()

export default KeyResolver
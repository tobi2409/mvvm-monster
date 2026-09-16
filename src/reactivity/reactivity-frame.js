const ReactivityFrame = (function () {
    const defaultArrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice']

    function createArrayChange(method, args, array, fullKey) {
        const change = { fullKey, action: method }
        const minimumArgsWithOptions = method === 'splice' ? 4 : 2
        const options = args.length >= minimumArgsWithOptions ? args.at(-1) : undefined
        const hasExtraArrayParams = options
            && typeof options === 'object'
            && Object.prototype.hasOwnProperty.call(options, 'extraArrayParams')

        if (method === 'push' || method === 'unshift') {
            change.items = hasExtraArrayParams ? args.slice(0, -1) : args
        } else if (method === 'splice') {
            change.startIndex = args[0]
            change.deleteCount = args[1] || 0
            change.items = hasExtraArrayParams ? args.slice(2, -1) : args.slice(2)
        }

        if (hasExtraArrayParams) {
            change.extraArrayParams = options.extraArrayParams
        }

        return change
    }

    function getStandardizedArrayOperationArgs(change, originalArgs) {
        if (change.action === 'push' || change.action === 'unshift') {
            return change.items
        }

        if (change.action === 'splice') {
            return [change.startIndex, change.deleteCount, ...change.items]
        }

        return originalArgs
    }

    function getInsertStartIndex(method, arrayLength, itemCount) {
        if (method === 'unshift') {
            return 0
        }

        if (method === 'push') {
            return arrayLength - itemCount
        }

        return 0
    }

    function patchArrayMethods(array, fullKey, extraReactiveParams) {

        const {
            getArrayItemKey = (_, index) => String(index),
            getArrayItemExtraReactiveParams = () => ({}),
            onArrayItem = () => {},
            beforeArrayChange = () => {},
            onArrayChange = () => {},
            onArrayItemsChange = () => {}
        } = extraReactiveParams

        for (const method of defaultArrayMethods) {
            const original = array[method] !== Array.prototype[method]
                ? array[method]
                : Array.prototype[method]

            Object.defineProperty(array, method, {
                value: function (...args) {
                    const change = createArrayChange(method, args, this, fullKey)
                    beforeArrayChange(change, this, extraReactiveParams)
                    const result = original.apply(this, getStandardizedArrayOperationArgs(change, args))

                    onArrayChange(change, this, extraReactiveParams)

                    if (change.items) {
                        const insertStartIndex = getInsertStartIndex(method, this.length, change.items.length)

                        for (let itemIndex = 0; itemIndex < change.items.length; itemIndex++) {
                            const item = change.items[itemIndex]

                            if (item && typeof item === 'object') {
                                const arrayIndex = insertStartIndex + itemIndex
                                const itemKey = getArrayItemKey(item, arrayIndex, this, fullKey)
                                const itemFullKey = fullKey ? `${fullKey}.${itemKey}` : String(itemKey)
                                const itemExtraReactiveParams = {
                                    ...extraReactiveParams,
                                    ...getArrayItemExtraReactiveParams(item, arrayIndex, extraReactiveParams, itemFullKey)
                                }

                                onArrayItem(item, arrayIndex, itemFullKey, itemExtraReactiveParams, extraReactiveParams)
                                makeReactive(item, itemFullKey, itemExtraReactiveParams)
                            }
                        }
                    }

                    onArrayItemsChange(change, this, extraReactiveParams)
                    return result
                },
                enumerable: false,
                writable: true,
                configurable: true
            })
        }
    }

    function makeArrayItemsReactive(array, fullKey, extraReactiveParams) {

        const {
            getArrayItemKey = (_, index) => String(index),
            getArrayItemExtraReactiveParams = () => ({}),
            onArrayItem = () => {}
        } = extraReactiveParams

        for (let index = 0; index < array.length; index++) {
            const item = array[index]

            if (item && typeof item === 'object') {
                const itemKey = getArrayItemKey(item, index, array, fullKey)
                const itemFullKey = fullKey ? `${fullKey}.${itemKey}` : String(itemKey)
                const itemExtraReactiveParams = {
                    ...extraReactiveParams,
                    ...getArrayItemExtraReactiveParams(item, index, extraReactiveParams, itemFullKey)
                }

                onArrayItem(item, index, itemFullKey, itemExtraReactiveParams, extraReactiveParams)
                makeReactive(item, itemFullKey, itemExtraReactiveParams)
            }
        }
    }

    function defineDataProperty(obj, prop, descriptor, fullKey, extraReactiveParams) {

        const {
            getNestedExtraReactiveParams = () => ({}),
            onDataPropertyGet = () => {},
            onDataPropertySet = () => {}
        } = extraReactiveParams

        let value = descriptor.value
        const objectSegments = extraReactiveParams.objectSegments
        const currentObjectSegments = objectSegments ? `${objectSegments}.${prop}` : prop

        // Data-property values already exist while the object is instrumented.
        if (value && typeof value === 'object') {
            makeReactive(value, fullKey, {
                ...extraReactiveParams,
                ...getNestedExtraReactiveParams(value, fullKey, extraReactiveParams),
                objectSegments: currentObjectSegments
            })
        }

        Object.defineProperty(obj, prop, {
            get() {
                onDataPropertyGet({ object: obj, property: prop, fullKey, value, extraReactiveParams })
                return value
            },
            set(newValue) {
                const oldValue = value
                value = newValue

                if (newValue && typeof newValue === 'object') {
                    makeReactive(newValue, fullKey, {
                        ...extraReactiveParams,
                        ...getNestedExtraReactiveParams(newValue, fullKey, extraReactiveParams),
                        objectSegments: currentObjectSegments
                    })
                }

                onDataPropertySet({
                    object: obj,
                    property: prop,
                    fullKey,
                    oldValue,
                    newValue,
                    extraReactiveParams: {
                        ...extraReactiveParams,
                        objectSegments: currentObjectSegments
                    }
                })
            },
            enumerable: descriptor.enumerable,
            configurable: true
        })
    }

    function defineAccessorProperty(obj, prop, descriptor, fullKey, extraReactiveParams) {

        const {
            getNestedExtraReactiveParams = () => ({}),
            onAccessorPropertyGet = () => {},
            onAccessorPropertySet = () => {}
        } = extraReactiveParams

        Object.defineProperty(obj, prop, {
            get() {
                const value = descriptor.get ? descriptor.get.call(this) : undefined
                
                if (value && typeof value === 'object') {
                    makeReactive(value, fullKey, {
                        ...extraReactiveParams,
                        ...getNestedExtraReactiveParams(value, fullKey, extraReactiveParams)
                    })
                }

                onAccessorPropertyGet({ object: obj, property: prop, fullKey, value, extraReactiveParams })
                return value
            },
            set(newValue) {
                if (!descriptor.set) {
                    return
                }

                const oldValue = descriptor.get ? descriptor.get.call(this) : undefined
                descriptor.set.call(this, newValue)
                const value = descriptor.get ? descriptor.get.call(this) : newValue

                if (value && typeof value === 'object') {
                    makeReactive(value, fullKey, {
                        ...extraReactiveParams,
                        ...getNestedExtraReactiveParams(value, fullKey, extraReactiveParams)
                    })
                }

                onAccessorPropertySet({
                    object: obj,
                    property: prop,
                    fullKey,
                    oldValue,
                    newValue: value,
                    extraReactiveParams
                })
            },
            enumerable: descriptor.enumerable,
            configurable: true
        })
    }

    function makeReactive(obj, fullKey = '', extraReactiveParams = {}) {
        if (!obj || typeof obj !== 'object') {
            return obj
        }

        const {
            marker = '__reactive__',
            getArrayItemKey = (_, index) => String(index),
            getArrayItemExtraReactiveParams = () => ({}),
            getNestedExtraReactiveParams = () => ({}),
            onArrayItem = () => {},
            beforeArrayChange = () => {},
            onArrayChange = () => {},
            onArrayItemsChange = () => {},
            onDataPropertyGet = () => {},
            onDataPropertySet = () => {},
            onAccessorPropertyGet = () => {},
            onAccessorPropertySet = () => {}
        } = extraReactiveParams

        if (Object.prototype.hasOwnProperty.call(obj, marker) && obj[marker] === true) {
            return obj
        }

        Object.defineProperty(obj, marker, {
            value: true,
            enumerable: false,
            writable: false,
            configurable: false
        })

        if (Array.isArray(obj)) {
            makeArrayItemsReactive(obj, fullKey, extraReactiveParams)
            patchArrayMethods(obj, fullKey, extraReactiveParams)
            return obj
        }

        const descriptors = Object.getOwnPropertyDescriptors(obj)

        for (const [prop, descriptor] of Object.entries(descriptors)) {
            if (prop === marker || descriptor.configurable === false) {
                continue
            }

            const nextFullKey = fullKey ? `${fullKey}.${prop}` : String(prop)

            if ('value' in descriptor) {
                defineDataProperty(obj, prop, descriptor, nextFullKey, extraReactiveParams)
            } else {
                defineAccessorProperty(obj, prop, descriptor, nextFullKey, extraReactiveParams)
            }
        }

        return obj
    }

    return { makeReactive }
})()

export default ReactivityFrame
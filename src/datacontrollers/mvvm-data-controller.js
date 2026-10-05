import ViewModelArray from '../model/viewmodel-array.js'
import Paginator from '../collections/paginator.js'
import ExpandHandler from '../collections/expand-handler.js'
import MVVMDataLoader from '../dataloaders/mvvm-data-loader.js'
import ModelJournal from '../reactivity/model-journal.js'

const MVVMDataController = (function() {
    function create(
        transform,
        reverseTransform,
        fetch,
        fetchOptions = {},
        customOptions = {}
    ) {
        if (typeof transform !== 'function') {
            throw new TypeError('MVVMDataController.create expected "transform" to be a function')
        }

        if (typeof reverseTransform !== 'function') {
            throw new TypeError('MVVMDataController.create expected "reverseTransform" to be a function')
        }

        if (typeof fetch !== 'function') {
            throw new TypeError('MVVMDataController.create expected "fetch" to be a function')
        }

        if (!fetchOptions || typeof fetchOptions !== 'object' || Array.isArray(fetchOptions)) {
            throw new TypeError('MVVMDataController.create expected "fetchOptions" to be an object')
        }

        if (!customOptions || typeof customOptions !== 'object' || Array.isArray(customOptions)) {
            throw new TypeError('MVVMDataController.create expected "customOptions" to be an object')
        }

        const options = {
            limit: 50,
            childrenContainerName: 'children',
            propertyMapping: {},
            customState: {},
            model: undefined,
            persist: undefined,
            ...customOptions
        }

        if (!Number.isInteger(options.limit) || options.limit < 1) {
            throw new TypeError('MVVMDataController.create expected "limit" to be a positive integer')
        }

        if (typeof options.childrenContainerName !== 'string' || options.childrenContainerName.trim() === '') {
            throw new TypeError('MVVMDataController.create expected "childrenContainerName" to be a non-empty string')
        }

        if (!options.propertyMapping || typeof options.propertyMapping !== 'object' || Array.isArray(options.propertyMapping)) {
            throw new TypeError('MVVMDataController.create expected "propertyMapping" to be an object')
        }

        if (typeof options.customState !== 'function'
            && (!options.customState || typeof options.customState !== 'object' || Array.isArray(options.customState))) {
            throw new TypeError('MVVMDataController.create expected "customState" to be an object or function')
        }

        if (options.model !== undefined && (!options.model || typeof options.model !== 'object' || Array.isArray(options.model))) {
            throw new TypeError('MVVMDataController.create expected "model" to be an object')
        }

        if (options.persist !== undefined && typeof options.persist !== 'function') {
            throw new TypeError('MVVMDataController.create expected "persist" to be a function')
        }
        
        let rootModelArray
        let rootViewModelArray

        function transformItem(modelItem) {
            if (!modelItem || typeof modelItem !== 'object' || Array.isArray(modelItem)) {
                throw new TypeError('MVVMDataController.transformItem expected "modelItem" to be an object')
            }

            const children = modelItem[options.childrenContainerName]

            if (!Array.isArray(children)) {
                throw new TypeError(`MVVMDataController.transformItem expected "modelItem.${options.childrenContainerName}" to be an array`)
            }

            const childrenLoaded = children.length > 0
            const transformedItem = transform(modelItem)

            if (!transformedItem || typeof transformedItem !== 'object' || Array.isArray(transformedItem)) {
                throw new TypeError('MVVMDataController transform must return an object')
            }

            return {
                [options.childrenContainerName]: getViewModelArray(children, modelItem),
                expanded: childrenLoaded,
                childrenLoaded,
                expand: ExpandHandler.create((viewModelParent) => loadServerData(viewModelParent)),
                ...transformedItem
            }
        }

        function reverseTransformItem(viewModelItem, modelItem) {
            if (!viewModelItem || typeof viewModelItem !== 'object' || Array.isArray(viewModelItem)) {
                throw new TypeError('MVVMDataController.reverseTransformItem expected "viewModelItem" to be an object')
            }

            if (modelItem !== undefined && (!modelItem || typeof modelItem !== 'object' || Array.isArray(modelItem))) {
                throw new TypeError('MVVMDataController.reverseTransformItem expected "modelItem" to be an object')
            }

            const childrenContainer = viewModelItem[options.childrenContainerName]
            const children = childrenContainer?.data ?? childrenContainer ?? []

            if (!Array.isArray(children)) {
                throw new TypeError(`MVVMDataController.reverseTransformItem expected "viewModelItem.${options.childrenContainerName}" to be an array or ViewModelArray`)
            }

            const reverseTransformedItem = reverseTransform(viewModelItem, modelItem)

            if (!reverseTransformedItem || typeof reverseTransformedItem !== 'object' || Array.isArray(reverseTransformedItem)) {
                throw new TypeError('MVVMDataController reverseTransform must return an object')
            }

            return {
                [options.childrenContainerName]: () => children.map((viewModelChild) =>
                    reverseTransformItem(viewModelChild, viewModelChild.__modelItem__)
                ),
                ...reverseTransformedItem
            }
        }

        function getViewModelArray(modelArray, modelItem = undefined) {
            if (!Array.isArray(modelArray)) {
                throw new TypeError('MVVMDataController.getViewModelArray expected "modelArray" to be an array')
            }

            if (modelItem !== undefined && (!modelItem || typeof modelItem !== 'object' || Array.isArray(modelItem))) {
                throw new TypeError('MVVMDataController.getViewModelArray expected "modelItem" to be an object')
            }

            // A customState factory needs the finished viewModelArray, so its result can only
            // be added after ViewModelArray.get(). Until then, start with an empty custom state.
            const customState = typeof options.customState === 'function'
                ? {}
                : options.customState
                
            const state = {
                ...Paginator.createState({ limit: options.limit }),
                ...customState
            }

            const viewModelArray = ViewModelArray.get(
                modelArray,
                (item) => transformItem(item),
                (viewModelItem, item) => reverseTransformItem(viewModelItem, item),
                options.propertyMapping,
                state
            )

            // A collection without a parent model item is the controller's root collection.
            // Recursive child collections pass their parent as modelItem and must not replace
            // these references: rootViewModelArray is used for root loading and rootModelArray
            // is the complete collection passed to persist() by saveChanges().
            //TODO: nochmal darüber nachdenken
            if (modelItem === undefined) {
                rootModelArray = modelArray
                rootViewModelArray = viewModelArray
            }

            // Only initialize newly created collections; cached collections keep their state.
            if (viewModelArray.state === state && typeof options.customState === 'function') {
                const createdState = options.customState({ viewModelArray, modelItem })

                if (!createdState || typeof createdState !== 'object' || Array.isArray(createdState)) {
                    throw new TypeError('MVVMDataController customState must return an object')
                }

                Object.assign(state, createdState)
            }

            return viewModelArray
        }

        async function loadServerData(
            viewModelParent = undefined,
            append = false
        ) {
            if (viewModelParent !== undefined
                && (!viewModelParent || typeof viewModelParent !== 'object' || Array.isArray(viewModelParent))) {
                throw new TypeError('MVVMDataController.loadServerData expected "viewModelParent" to be an object')
            }

            if (typeof append !== 'boolean') {
                throw new TypeError('MVVMDataController.loadServerData expected "append" to be a boolean')
            }

            const viewModelArray = viewModelParent?.[options.childrenContainerName] ?? rootViewModelArray

            if (!viewModelArray || !Array.isArray(viewModelArray.data) || !viewModelArray.state) {
                throw new TypeError('MVVMDataController.loadServerData expected an initialized ViewModelArray')
            }

            const state = viewModelArray.state

            if (!append) {
                state.fetchOptions = fetchOptions
            }

            const loadPage = append ? Paginator.loadNextPage : Paginator.loadFirstPage

            return loadPage(state, async (start, limit) => {
                const result = await fetch(
                    viewModelParent?.__modelItem__,
                    state.fetchOptions,
                    start,
                    limit
                )

                if (!result || !Array.isArray(result.items) || typeof result.hasMore !== 'boolean') {
                    throw new TypeError('MVVMDataController fetch must return { items: Array, hasMore: boolean }')
                }

                MVVMDataLoader.loadData(result.items, viewModelArray.data, append)
                return result
            })
        }

        function loadNextPage(viewModelParent = undefined) {
            if (viewModelParent !== undefined
                && (!viewModelParent || typeof viewModelParent !== 'object' || Array.isArray(viewModelParent))) {
                throw new TypeError('MVVMDataController.loadNextPage expected "viewModelParent" to be an object')
            }

            return loadServerData(viewModelParent, true)
        }

        function saveChanges() {
            if (!options.model || typeof options.persist !== 'function') {
                throw new TypeError('MVVMDataController.saveChanges expected "model" and "persist" options')
            }

            if (!rootModelArray) {
                throw new TypeError('MVVMDataController.saveChanges expected an initialized root model array')
            }

            const journal = ModelJournal.getJournal(options.model)

            if (journal?.size === 0) {
                return false
            }

            options.persist(rootModelArray)
            journal?.clear()
            return true
        }

        return {
            getViewModelArray,
            loadServerData,
            loadNextPage,
            saveChanges
        }
    }

    return { create }
})()

export default MVVMDataController
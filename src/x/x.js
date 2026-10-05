import Paginator from '../collections/paginator.js'
import MVVMDataLoader from '../dataloaders/mvvm-data-loader.js'
import ExpandHandler from '../collections/expand-handler.js'
import ViewModelArray from '../model/viewmodel-array.js'

class X {
    constructor({
        rootModelArray,
        modelTransform,
        reverseModelTransform,
        fetch,
        fetchOptions = {},
        propertyMapping = {},
        options = {}
    }) {
        if (!Array.isArray(rootModelArray)) {
            throw new TypeError('X expected "rootModelArray" to be an array')
        }

        if (typeof modelTransform !== 'function') {
            throw new TypeError('X expected "modelTransform" to be a function')
        }

        if (typeof reverseModelTransform !== 'function') {
            throw new TypeError('X expected "reverseModelTransform" to be a function')
        }

        if (typeof fetch !== 'function') {
            throw new TypeError('X expected "fetch" to be a function')
        }

        this.modelTransform = modelTransform
        this.reverseModelTransform = reverseModelTransform
        this.fetch = fetch
        this.fetchOptions = fetchOptions
        this.propertyMapping = propertyMapping
        this.options = {
            childrenArrayName: 'children',
            limit: 50,
            ...options
        }
        this.rootViewModelArray = this.getViewModelArray(rootModelArray)
    }

    transform(modelItem) {
        const { childrenArrayName } = this.options
        const children = modelItem?.[childrenArrayName]

        if (!Array.isArray(children)) {
            throw new TypeError(`X expected modelItem.${childrenArrayName} to be an array`)
        }

        const childrenLoaded = children.length > 0

        return {
            ...this.modelTransform(modelItem),
            [childrenArrayName]: this.getViewModelArray(children),
            expanded: childrenLoaded,
            childrenLoaded,
            expand: ExpandHandler.create((viewModelParent) => this.loadData(viewModelParent))
        }
    }

    reverseTransform(viewModelItem, modelItem) {
        const { childrenArrayName } = this.options
        const children = viewModelItem?.[childrenArrayName]?.data

        if (!Array.isArray(children)) {
            throw new TypeError(`X expected viewModelItem.${childrenArrayName}.data to be an array`)
        }

        return {
            ...this.reverseModelTransform(viewModelItem, modelItem),
            [childrenArrayName]: () => children.map((viewModelChild) =>
                this.reverseTransform(viewModelChild, viewModelChild.__modelItem__)
            )
        }
    }

    getViewModelArray(modelArray) {
        if (!Array.isArray(modelArray)) {
            throw new TypeError('X.getViewModelArray expected "modelArray" to be an array')
        }

        const state = {
            ...Paginator.createState({ limit: this.options.limit }),
            fetchOptions: this.fetchOptions
        }

        return ViewModelArray.get(
            modelArray,
            (modelItem) => this.transform(modelItem),
            (viewModelItem, modelItem) => this.reverseTransform(viewModelItem, modelItem),
            this.propertyMapping,
            state
        )
    }

    async loadData(viewModelParent = undefined, append = false) {
        const { childrenArrayName } = this.options

        if (viewModelParent !== undefined && !viewModelParent?.__modelItem__) {
            throw new TypeError('X.loadData expected "viewModelParent" to reference a model item')
        }

        const viewModelArray = viewModelParent === undefined
            ? this.rootViewModelArray
            : viewModelParent[childrenArrayName]

        if (!viewModelArray || !Array.isArray(viewModelArray.data)) {
            throw new TypeError(`X.loadData expected a ViewModelArray in "${childrenArrayName}"`)
        }

        const state = viewModelArray.state

        if (!append) {
            state.fetchOptions = this.fetchOptions
        }

        const loadPage = append ? Paginator.loadNextPage : Paginator.loadFirstPage

        return loadPage(state, async (start, limit) => {
            const result = await this.fetch(
                viewModelParent?.__modelItem__,
                state.fetchOptions,
                start,
                limit
            )

            MVVMDataLoader.loadData(result.items, viewModelArray.data, append)

            return result
        })
    }
}

export default X
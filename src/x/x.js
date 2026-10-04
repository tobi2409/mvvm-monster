import Paginator from '../collections/paginator.js'
import MVVMDataLoader from '../dataloaders/mvvm-data-loader.js'
import ExpandHandler from '../collections/expand-handler.js'
import ViewModelArray from '../model/viewmodel-array.js'

const X = (function () {

    /*function create(data, transform, reverseTransform, options) {
        const limit = options?.limit ?? 50

        //TODO: das alles als MVVMTreeController als Object kapseln, expand usw. sollen dabei keine Actions darstellen
        return {
        
            getViewModelArray(modelArray, modelItem = undefined) {
                const state = {
                    ...Paginator.createState({ limit }),
                    loadNextPage: (viewModelItem) => 
                        loadData(
                            modelItem ? viewModelItem : undefined,
                            viewModel.persons,
                            getPersons,
                            { searchNamePattern: state.searchNamePattern },
                            { append: true }
                        )
                }

                const viewModelArray = ViewModelArray.get(
                    modelArray,
                    (modelItem) => this._transform(modelItem),
                    (viewModelItem) => this._reverseTransform(viewModelItem),
                    { age: 'birthyear' },
                    state
                )

                return viewModelArray
            
            }
        }*/

    function _transform(modelItem, transform, fetch, fetchOptions = {}, rootViewModelArray) {
        const childrenLoaded = modelItem.children.length > 0

        return {
            ...transform(modelItem),
            //children: this.getViewModelArray(modelItem.children, modelItem),
            expanded: childrenLoaded,
            childrenLoaded,
            expand: ExpandHandler.create((viewModelParent) =>
                loadData(viewModelParent, rootViewModelArray, fetch, fetchOptions, {}))
        }
    }

    function _reverseTransform(viewModelItem, modelItem, reverseTransform) {
        return {
            ...reverseTransform(viewModelItem, modelItem),
            children: () => viewModelItem.children.map(viewModelChild => _reverseTransform(viewModelChild, modelItem, reverseTransform))
        }
    }

    async function loadData(
        viewModelParent = undefined,
        rootViewModelArray = undefined,
        fetch = undefined,
        fetchOptions = {},
        options
    ) {
        const {
            childrenArrayName = 'children'
        } = options

        const viewModelArray = viewModelParent?.[childrenArrayName] ?? rootViewModelArray
        const state = viewModelArray.state

        if (!options.append) {
            state.fetchOptions = fetchOptions
        }

        const loadPage = options.append ? Paginator.loadNextPage : Paginator.loadFirstPage

        return loadPage(state, async (start, limit) => {
            const result = await fetch(viewModelParent?.__modelItem__?.id, state.fetchOptions, start, limit)

            MVVMDataLoader.loadData(
                result.items,
                viewModelArray.data,
                options.append
            )

            return result
        })
    }

    return {
        loadData, _transform, _reverseTransform
    }
})()

export default X
import Paginator from '../collections/paginator.js'
import MVVMDataLoader from '../dataloaders/mvvm-data-loader.js'
import ExpandHandler from '../collections/expand-handler.js'
import ViewModelArray from '../model/viewmodel-array.js'

const X = (function() {
    return {
        loadData: async (viewModelParent = undefined, append = false) => {
            const options = {
                childrenArrayName: 'children',
                limit: 50
            }

            if (viewModelParent !== undefined && !viewModelParent?.__modelItem__) {
                throw new TypeError('X.loadData expected "viewModelParent" to reference a model item')
            }

            const viewModelArray = viewModelParent === undefined
                ? this.rootViewModelArray
                : viewModelParent[options.childrenArrayName]

            if (!viewModelArray || !Array.isArray(viewModelArray.data)) {
                throw new TypeError(`X.loadData expected a ViewModelArray in "${options.childrenArrayName}"`)
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
})()

export default X
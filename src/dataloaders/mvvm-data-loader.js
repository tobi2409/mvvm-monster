import JournalControl from '../reactivity/journal-control.js'
import ModelSynchronization from '../model/model-synchronization.js'
import ViewModelItemCache from '../model/viewmodel-item-cache.js'

const MVVMDataLoader = (function () {
    function loadData(nextData, viewModelArrayData, append = false) {
        const modelArray = viewModelArrayData.__modelArray__
        const transformItem = typeof viewModelArrayData.__transform__ === 'function'
            ? viewModelArrayData.__transform__
            : (item) => item
            
        const createViewModelItem = (modelItem) => {
            const viewModelItem = transformItem(modelItem)
            ViewModelItemCache.cacheItem(modelItem, viewModelItem)
            return viewModelItem
        }

        return JournalControl.withoutJournaling(() => ModelSynchronization.withoutModelSynchronization(() => {
            if (append) {
                modelArray.push(...nextData)
                viewModelArrayData.push(...nextData.map(createViewModelItem))
                return viewModelArrayData
            }

            modelArray.splice(0, modelArray.length, ...nextData)
            viewModelArrayData.splice(
                0,
                viewModelArrayData.length,
                ...modelArray.map(createViewModelItem)
            )

            return viewModelArrayData
        }))
    }

    return { loadData }
})()

export default MVVMDataLoader

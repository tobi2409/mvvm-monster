import JournalControl from '../reactivity/journal-control.js'
import ModelSynchronization from '../model/model-synchronization.js'

const MVVMDataLoader = (function () {
    function getLoadTargets(
        viewModelParent,
        modelParent,
        rootViewModelArray,
        rootModelArray,
        options = {}
    ) {
        const {
            viewModelChildrenKey = 'children',
            modelChildrenKey = 'children'
        } = options

        return {
            viewModelArray: viewModelParent
                ? viewModelParent[viewModelChildrenKey]
                : rootViewModelArray,
            modelParent,
            modelArray: modelParent
                ? modelParent[modelChildrenKey]
                : rootModelArray
        }
    }

    function loadNextData(nextData, viewModelArrayData, modelArray, append = false) {
        const transformItem = typeof viewModelArrayData.__transform__ === 'function'
            ? viewModelArrayData.__transform__
            : (item) => item

        return JournalControl.withoutJournaling(() => ModelSynchronization.withoutModelSynchronization(() => {
            if (append) {
                modelArray.push(...nextData)
                viewModelArrayData.push(...nextData.map((item) => transformItem(item)))
                return viewModelArrayData
            }

            modelArray.splice(0, modelArray.length, ...nextData)
            viewModelArrayData.splice(
                0,
                viewModelArrayData.length,
                ...modelArray.map((item) => transformItem(item))
            )

            return viewModelArrayData
        }))
    }

    function load(
        nextData,
        viewModelParent,
        modelParent,
        rootViewModelArray,
        rootModelArray,
        append = false,
        options = {}
    ) {
        const { viewModelArray, modelArray } = getLoadTargets(
            viewModelParent,
            modelParent,
            rootViewModelArray,
            rootModelArray,
            options
        )

        return loadNextData(nextData, viewModelArray.data, modelArray, append)
    }

    return {
        getLoadTargets,
        loadNextData,
        load,
        getExpandTargets: getLoadTargets,
        expandNextData: loadNextData,
        expand: load
    }
})()

export default MVVMDataLoader

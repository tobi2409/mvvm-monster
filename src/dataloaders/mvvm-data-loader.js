import JournalControl from '../reactivity/journal-control.js'
import ModelSynchronization from '../model/model-synchronization.js'

const MVVMDataLoader = (function () {
    function loadData(nextData, viewModelArrayData, append = false) {
        const modelArray = viewModelArrayData.__modelArray__
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

    return { loadData }
})()

export default MVVMDataLoader

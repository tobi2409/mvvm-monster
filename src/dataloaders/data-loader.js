import JournalControl from '../reactivity/journal-control.js'

const DataLoader = (function () {
    function getLoadTarget(dataParent, rootDataArray, options = {}) {
        const { childrenKey = 'children' } = options
        return dataParent ? dataParent[childrenKey] : rootDataArray
    }

    function loadNextData(nextData, dataArray, append = false, prepareItem = (item) => item) {
        const dataArrayItems = dataArray?.data ?? dataArray
        const preparedData = nextData.map(prepareItem)

        return JournalControl.withoutJournaling(() => {
            if (append) {
                dataArrayItems.push(...preparedData)
            } else {
                dataArrayItems.splice(0, dataArrayItems.length, ...preparedData)
            }

            return dataArrayItems
        })
    }

    function load(
        nextData,
        dataParent,
        rootDataArray,
        append = false,
        options = {}
    ) {
        const { prepareItem } = options
        const dataArray = getLoadTarget(dataParent, rootDataArray, options)
        return loadNextData(nextData, dataArray, append, prepareItem)
    }

    return {
        getLoadTarget,
        loadNextData,
        load
    }
})()

export default DataLoader

import JournalControl from '../reactivity/journal-control.js'

const DataLoader = (function () {
    function getLoadTarget(dataItem, rootDataArray, options = {}) {
        const { childrenKey = 'children' } = options
        return dataItem ? dataItem[childrenKey] : rootDataArray
    }

    function loadNextData(nextData, dataArray, append = false) {
        const dataArrayItems = dataArray?.data ?? dataArray

        return JournalControl.withoutJournaling(() => {
            if (append) {
                dataArrayItems.push(...nextData)
            } else {
                dataArrayItems.splice(0, dataArrayItems.length, ...nextData)
            }

            return dataArrayItems
        })
    }

    function load(
        nextData,
        dataItem,
        rootDataArray,
        append = false,
        options = {}
    ) {
        const dataArray = getLoadTarget(dataItem, rootDataArray, options)
        return loadNextData(nextData, dataArray, append)
    }

    return {
        getLoadTarget,
        loadNextData,
        load
    }
})()

export default DataLoader

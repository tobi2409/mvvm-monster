import JournalControl from '../reactivity/journal-control.js'

const DataLoader = (function () {
    function loadData(nextData, dataArray, append = false) {
        return JournalControl.withoutJournaling(() => {
            if (append) {
                dataArray.push(...nextData)
            } else {
                dataArray.splice(0, dataArray.length, ...nextData)
            }

            return dataArray
        })
    }

    return { loadData }
})()

export default DataLoader

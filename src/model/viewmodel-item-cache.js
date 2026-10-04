const ViewModelItemCache = (function () {
    const viewModelItemByModelItem = new WeakMap()

    function cacheItem(modelItem, viewModelItem) {
        if (modelItem && typeof modelItem === 'object' && viewModelItem && typeof viewModelItem === 'object') {
            Object.defineProperty(viewModelItem, '__modelItem__', { value: modelItem })
            viewModelItemByModelItem.set(modelItem, viewModelItem)
        }
    }

    function getViewModelItem(modelItem) {
        return viewModelItemByModelItem.get(modelItem)
    }

    return { cacheItem, getViewModelItem }
})()

export default ViewModelItemCache
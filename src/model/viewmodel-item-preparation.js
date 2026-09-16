import ReverseTransformEvaluator from '../transforms/reverse-transform-evaluator.js'

const ViewModelItemPreparation = (function () {
    const viewModelItemByModelItem = new WeakMap()

    function cacheItems(modelItem, viewModelItem) {
        if (modelItem && typeof modelItem === 'object' && viewModelItem && typeof viewModelItem === 'object') {
            viewModelItemByModelItem.set(modelItem, viewModelItem)
        }
    }

    function getViewModelItem(modelItem) {
        return viewModelItemByModelItem.get(modelItem)
    }

    function prepareItem(viewModelArrayData, preparedViewModelItem) {
        if (!Array.isArray(viewModelArrayData) || typeof viewModelArrayData.__transform__ !== 'function' || typeof viewModelArrayData.__reverseTransform__ !== 'function') {
            throw new TypeError('prepareItem expected a ViewModelArrayData')
        }

        const modelItem = ReverseTransformEvaluator.evaluate(viewModelArrayData.__reverseTransform__(preparedViewModelItem))
        const viewModelItem = viewModelArrayData.__transform__(modelItem)

        cacheItems(modelItem, viewModelItem)

        return { modelItem, viewModelItem }
    }

    return { cacheItems, getViewModelItem, prepareItem }
})()

export default ViewModelItemPreparation
import ReverseTransformEvaluator from '../transforms/reverse-transform-evaluator.js'
import ViewModelItemCache from './viewmodel-item-cache.js'

const ViewModelItemPreparation = (function () {
    function prepareItem(viewModelArrayData, preparedViewModelItem) {
        if (!Array.isArray(viewModelArrayData) || typeof viewModelArrayData.__transform__ !== 'function' || typeof viewModelArrayData.__reverseTransform__ !== 'function') {
            throw new TypeError('prepareItem expected a ViewModelArrayData')
        }

        const modelItem = ReverseTransformEvaluator.evaluate(viewModelArrayData.__reverseTransform__(preparedViewModelItem))
        const viewModelItem = viewModelArrayData.__transform__(modelItem)

        ViewModelItemCache.cacheItem(modelItem, viewModelItem)

        return { modelItem, viewModelItem }
    }

    return { prepareItem }
})()

export default ViewModelItemPreparation
// ViewModelArray Utility: Transform an array of model items into an array of view model items
// and holds reverseTransform function for calling when view model items are updated to synchronize back to the model array.

// Keep one mapped result object per source item (singleton per item).
// This preserves object identity across repeated createMappedArray() calls,
// which is required so context references/index tracking stay consistent
// after array operations like splice/reindex.

import ViewModelItemPreparation from './components/viewmodel-helpers/viewmodel-item-preparation.js'

const mappedViewModelArrayCache = new WeakMap()

const ViewModelArray = (function () {

    function get(modelArray, transform, reverseTransform = (viewModelItem) => viewModelItem, propertyMapping = {}, state = {}/*, recursive = false*/) {
        if (!Array.isArray(modelArray)) {
            throw new TypeError(`transformArray expected "modelArray" to be an array, got ${modelArray === null ? 'null' : typeof modelArray}`)
        }
        
        if (typeof transform !== 'function') {
            throw new TypeError(`transformArray expected "transform" to be a function, got ${typeof transform}`)
        }

        if (typeof reverseTransform !== 'function') {
            throw new TypeError(`transformArray expected "reverseTransform" to be a function, got ${typeof reverseTransform}`)
        }

        if (propertyMapping === null || typeof propertyMapping !== 'object' || Array.isArray(propertyMapping)) {
            throw new TypeError(`transformArray expected "propertyMapping" to be an object, got ${propertyMapping === null ? 'null' : Array.isArray(propertyMapping) ? 'array' : typeof propertyMapping}`)
        }

        if (state === null || typeof state !== 'object') {
            throw new TypeError('transformArray expected "state" to be an object, got ' + (state === null ? 'null' : typeof state))
        }

        let viewModelArray = mappedViewModelArrayCache.get(modelArray)

        if (!viewModelArray) {
            const data = modelArray.map((item, index) => {
                let result = ViewModelItemPreparation.getViewModelItem(item)

                if (!result) {
                    result = transform(item, index)
                    ViewModelItemPreparation.cacheItems(item, result)
                }

                return result
            })
            
            Object.defineProperties(data, {
                __modelArray__: { value: modelArray },
                __transform__: { value: transform },
                __reverseTransform__: { value: reverseTransform },
                __propertyMapping__: { value: propertyMapping }
            })

            /*if (recursive) {
                data.__recursive__ = true
            }*/

            viewModelArray = { data, state }
            mappedViewModelArrayCache.set(modelArray, viewModelArray)
        }

        return viewModelArray
    }

    // preparedViewModelItem muss nicht alle Eigenschaften enthalten, die normalerweise im ViewModelItem vorhanden sind
    // (besonders bei komplexeren State-Strukturen ist dies nicht nötig)
    // -> dazu wird das preparedViewModelItem zuerst in ein ModelItem übertragen
    // -> daraus wird das viewModelItem erzeugt, welches jegliche Strukturen enthält
    function prepareItem(viewModelArrayData, preparedViewModelItem) {
        return ViewModelItemPreparation.prepareItem(viewModelArrayData, preparedViewModelItem)
    }

    return { get, prepareItem }
})()

export default ViewModelArray
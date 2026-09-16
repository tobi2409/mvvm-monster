import ExpandHandler from '../collections/expand-handler.js'
import MVVMDataLoader from '../dataloaders/mvvm-data-loader.js'
import ModelSynchronization from '../model/model-synchronization.js'
import ViewModelArray from '../model/viewmodel-array.js'
import ReverseTransformEvaluator from '../transforms/reverse-transform-evaluator.js'

const MvvmAdapter = (function () {

    function create(dataSource, transform, reverseTransform, options = {}) {
        if (typeof transform !== 'function') {
            throw new TypeError('MvvmAdapter.create expected "transform" to be a function')
        }

        if (typeof reverseTransform !== 'function') {
            throw new TypeError('MvvmAdapter.create expected "reverseTransform" to be a function')
        }

        const {
            rootViewModelArrayProperty = 'items',
            viewModelChildrenProperty = 'children',
            modelChildrenProperty = 'children',
            propertyMapping = {},
            expandedProperty = 'expanded',
            childrenLoadedProperty = 'childrenLoaded',
            expandActionProperty = 'expand',
            expander = false
        } = options

        const viewModel = {}
        // Der lokale Cache verhindert, dass createState fuer dasselbe Model-Array
        // mehrfach ausgefuehrt wird, bevor ViewModelArray seinen Cache zurueckgibt.
        const viewModelArrays = new WeakMap()

        function getViewModelArray(currentModelArray, modelParent = undefined) {
            let viewModelArray = viewModelArrays.get(currentModelArray)

            if (viewModelArray) {
                return viewModelArray
            }

            const state = dataSource.createState({
                // Dieser Kontext gehoert dauerhaft zum State des aktuellen Arrays.
                // modelParent ist bei Child-Arrays deren Model-Parent, am Root undefined.
                stateFactoryContext: { viewModel, modelParent },
                // Nur der MVVM-Adapter kennt beide Parent-Repräsentationen. Die
                // DataSource leitet diesen adapterspezifischen Kontext lediglich weiter.
                resolveLoadTarget: (viewModelParent) => ({
                    viewModelParent: modelParent ? viewModelParent : undefined,
                    modelParent
                }),
                // Serverdaten aktualisieren Model und ViewModel gemeinsam.
                applyLoadedItems: ({ items, viewModelParent, modelParent, nextDataBucket }) =>
                    MVVMDataLoader.load(
                        items,
                        viewModelParent,
                        modelParent,
                        viewModel[rootViewModelArrayProperty],
                        dataSource.data,
                        nextDataBucket,
                        {
                            viewModelChildrenKey: viewModelChildrenProperty,
                            modelChildrenKey: modelChildrenProperty
                        }
                    ),
                insertNewItem: (newItem, viewModelParent) => insertNewItem(
                    newItem,
                    modelParent ? viewModelParent : undefined,
                    modelParent
                ),
                finalizeInsertedItem: (item) => {
                    if (expander) {
                        // Neu angelegte Items duerfen beim ersten Expand nicht durch
                        // einen unnoetigen Serverabruf samt ihrer Children ersetzt werden.
                        item[childrenLoadedProperty] = true
                    }
                }
            })

            viewModelArray = ViewModelArray.get(
                currentModelArray,
                transformItem,
                reverseTransformItem,
                propertyMapping,
                state
            )

            viewModelArrays.set(currentModelArray, viewModelArray)
            return viewModelArray
        }

        function insertNewItem(newItem, viewModelParent, modelParent) {
            const { viewModelArray, modelArray } = MVVMDataLoader.getLoadTargets(
                viewModelParent,
                modelParent,
                viewModel[rootViewModelArrayProperty],
                dataSource.data,
                {
                    viewModelChildrenKey: viewModelChildrenProperty,
                    modelChildrenKey: modelChildrenProperty
                }
            )
            
            const preparedItem = ViewModelArray.prepareItem(viewModelArray.data, newItem)

            ModelSynchronization.withoutModelSynchronization(() => {
                modelArray.push(preparedItem.modelItem)
                viewModelArray.data.push(preparedItem.viewModelItem)
            })

            return preparedItem.viewModelItem
        }

        function transformItem(modelItem) {
            const viewModelItem = transform(modelItem)

            // Ein DataGrid ohne Expander besitzt keine vom Adapter verwalteten Children.
            if (!expander) {
                return viewModelItem
            }

            const modelChildren = modelItem[modelChildrenProperty]

            if (!Array.isArray(modelChildren)) {
                throw new TypeError(`MvvmAdapter expected "${modelChildrenProperty}" to be an array`)
            }

            const childrenLoaded = modelChildren.length > 0

            return {
                ...viewModelItem,
                [viewModelChildrenProperty]: getViewModelArray(modelChildren, modelItem),
                // Bereits mitgelieferte Children, beispielsweise Trefferpfade einer
                // Suche, gelten als geladen und werden unmittelbar aufgeklappt.
                [expandedProperty]: childrenLoaded,
                [childrenLoadedProperty]: childrenLoaded,
                [expandActionProperty]: ExpandHandler.create(
                    (viewModelParent) => viewModelParent[viewModelChildrenProperty].state.loadData(
                        viewModelParent
                    ),
                    {
                        expandedAttribute: expandedProperty,
                        childrenLoadedAttribute: childrenLoadedProperty
                    }
                )
            }
        }

        function reverseTransformItem(viewModelItem, modelItem, currentViewModelProps) {
            const result = reverseTransform(viewModelItem, modelItem, currentViewModelProps)

            // Ein DataGrid ohne Expander besitzt keine vom Adapter verwalteten Children.
            if (!expander) {
                return result
            }

            const viewModelChildren = viewModelItem[viewModelChildrenProperty]?.data ?? []
            const modelChildren = modelItem?.[modelChildrenProperty] ?? []

            return {
                // Enthaelt ein vorbereitetes Parent-Item bereits Children, werden
                // diese rekursiv zuruecktransformiert und nicht mit [] verworfen.
                [modelChildrenProperty]: () => viewModelChildren.map((child, index) =>
                    ReverseTransformEvaluator.evaluate(
                        reverseTransformItem(child, modelChildren[index])
                    )
                ),
                ...result
            }
        }

        Object.defineProperty(viewModel, rootViewModelArrayProperty, {
            enumerable: true,
            configurable: true,
            // ViewModelArray.get liefert dank Cache fuer dasselbe Model-Array
            // immer denselben Container.
            get: () => getViewModelArray(dataSource.data)
        })
        
        Object.defineProperty(viewModel, 'model', { value: dataSource.data })

        return viewModel
    }

    return { create }
})()

export default MvvmAdapter
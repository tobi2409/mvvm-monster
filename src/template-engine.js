// Reactive Component: Reactivity through Object.defineProperty-based data observation

import RenderEngine from './rendering/render-engine.js'
import Notifier from './rendering/notifier.js'
import ReactivityFrame from './reactivity/reactivity-frame.js'
import UuidItemMap from './identity/uuid-item-map.js'
import ModelSynchronization from './model/model-synchronization.js'
import ViewModelItemPreparation from './model/viewmodel-item-preparation.js'

const TemplateEngine = (function () {
    return {
        withoutModelSynchronization(callback) {
            return ModelSynchronization.withoutModelSynchronization(callback)
        },

        reactive(data, node, dependencies = {}) {
            if (!data || typeof data !== 'object') {
                throw new TypeError(`[TemplateEngine] reactive expected "data" to be an object, got ${data === null ? 'null' : typeof data}`)
            }

            if (!node || typeof node !== 'object' || node.nodeType !== Node.ELEMENT_NODE || node.tagName !== 'TEMPLATE-USE') {
                throw new TypeError('[TemplateEngine] reactive expected "node" to be a <template-use> element')
            }

            if (!dependencies || typeof dependencies !== 'object') {
                throw new TypeError(`[TemplateEngine] reactive expected "dependencies" to be an object, got ${dependencies === null ? 'null' : typeof dependencies}`)
            }

            const topData = data

            const frameParams = {
                marker: '__reactive__',
                getArrayItemKey: (item) => UuidItemMap.ensureUuidForItem(item),
                getArrayItemExtraReactiveParams: (item, index, extraReactiveParams) => {
                    // Wird beim initialen Instrumentieren von Arrayelementen sowie für neu
                    // eingefügte Objekte bei push, unshift und splice aufgerufen.
                    // Dadurch wird objectSegments nur am Übergang Array -> Arrayelement zurückgesetzt.
                    // viewModelItemConfig für das aktuelle Index, sofern viewModelArrayConfig existiert

                    const viewModelArrayConfig = extraReactiveParams.viewModelArrayConfig
                    return {
                        viewModelArrayConfig,
                        objectSegments: viewModelArrayConfig
                            ? undefined
                            : extraReactiveParams.objectSegments,
                        viewModelItemConfig: viewModelArrayConfig
                            ? ModelSynchronization.createViewModelItemConfig(viewModelArrayConfig, index)
                            : undefined
                    }
                },
                getNestedExtraReactiveParams: (value, fullKey, extraReactiveParams) => {
                    // getNestedExtraReactiveParams wird für jedes Objekt aufgerufen, das als Wert einer Property gesetzt/gegettet wird.
                    // handelt es sich beim Value um ein Array, wird eine viewModelArrayConfig erstellt
                    // ein viewModelArrayContainer bekommt keine viewModelArrayConfig
                    // ein normales Objekt bekommt die viewModelArrayConfig und viewModelItemConfig des übergeordneten Arrays

                    const isArray = Array.isArray(value)
                    const isViewModelArrayContainer = !isArray
                        && Array.isArray(value?.data)
                        && ModelSynchronization.createViewModelArrayConfig(value.data) !== undefined

                    return {
                        viewModelArrayConfig: isArray
                            ? ModelSynchronization.createViewModelArrayConfig(value)
                            : isViewModelArrayContainer
                                ? undefined
                                : extraReactiveParams.viewModelArrayConfig,
                        viewModelItemConfig: isArray || isViewModelArrayContainer
                            ? undefined
                            : extraReactiveParams.viewModelItemConfig
                    }
                },
                beforeArrayChange: (change, array, extraReactiveParams) => {
                    if (!change.extraArrayParams?.preparedViewModelItem) {
                        return
                    }

                    if (!extraReactiveParams.viewModelArrayConfig) {
                        throw new TypeError('[TemplateEngine] preparedViewModelItem requires a ViewModelArrayData')
                    }

                    const preparedItems = change.items.map((item) => ViewModelItemPreparation.prepareItem(array, item))
                    change.items = preparedItems.map(({ viewModelItem }) => viewModelItem)
                    change.preparedModelItems = preparedItems.map(({ modelItem }) => modelItem)
                },
                onArrayChange: (change, array, extraReactiveParams) => {
                    const viewModelArrayConfig = extraReactiveParams.viewModelArrayConfig
                    ModelSynchronization.updateModelArrayByViewModelArrayOperation(
                        viewModelArrayConfig,
                        change.action,
                        change
                    )
                },
                onArrayItemsChange: (change) => {
                    try {
                        Notifier.notifyChange(topData, change.fullKey, change, dependencies)
                        Notifier.notifyKeyChange(topData, `${change.fullKey}.length`, dependencies)
                    } catch (error) {
                        throw new Error(`[TemplateEngine] Error during refresh of "${change.fullKey}" after "${change.action}"`, { cause: error })
                    }
                },
                onDataPropertyGet: () => {},
                onDataPropertySet: ({ fullKey, extraReactiveParams }) => {
                    try {
                        Notifier.notifyKeyChange(topData, fullKey, dependencies)
                    } catch (error) {
                        throw new Error(`[TemplateEngine] Error during refresh of "${fullKey}"`, { cause: error })
                    }

                    ModelSynchronization.updateModelItemByViewModelItem(
                        extraReactiveParams.viewModelItemConfig,
                        [extraReactiveParams.objectSegments]
                    )
                },
                onAccessorPropertyGet: () => {},
                onAccessorPropertySet: ({ fullKey }) => {
                    try {
                        Notifier.notifyKeyChange(topData, fullKey, dependencies)
                    } catch (error) {
                        throw new Error(`[TemplateEngine] Error during refresh of "${fullKey}"`, { cause: error })
                    }
                }
            }

            function makeReactive(obj, fullKey = '', extraReactiveParams = {}) {
                return ReactivityFrame.makeReactive(obj, fullKey, {
                    ...frameParams,
                    ...extraReactiveParams
                })
            }

            // run() first: lets the template engine assign UUIDs to array items.
            // makeReactive() then reads those UUIDs to build the correct fullKey paths.
            try {
                RenderEngine.run(data, node, dependencies)
            } catch (error) {
                throw new Error(`[TemplateEngine] Error during initial render: ${error.message}`, { cause: error })
            }

            // Patch data in-place. The returned object IS the original data,
            // now with reactive getters/setters on every property.
            // Beispiel (Einstieg):
            // const data = { person: { name: 'Anna' } }
            // makeReactive(data) => data.person.name = 'Lisa' löst Refresh aus.
            makeReactive(data)

            return data
        }
    }
})()

export default TemplateEngine

import ExpandHandler from '../collections/expand-handler.js'
import DataLoader from '../dataloaders/data-loader.js'
import JournalControl from '../reactivity/journal-control.js'

const DirectAdapter = (function () {

    function create(dataSource, options = {}) {
        const {
            rootDataProperty = 'items',
            childrenProperty = 'children',
            expandedProperty = 'expanded',
            childrenLoadedProperty = 'childrenLoaded',
            expandActionProperty = 'expand',
            expander = false
        } = options

        const result = {}
        const collections = new WeakMap()

        function getCollection(data = dataSource.data, dataParent = undefined) {
            if (!Array.isArray(data)) {
                throw new TypeError('DirectAdapter expected children to be an array')
            }

            let collection = collections.get(data)

            if (collection) {
                return collection
            }

            const state = dataSource.createState({
                stateFactoryContext: { dataParent },
                resolveLoadTarget: () => ({ dataParent }),
                applyLoadedItems: ({ items, dataParent, nextDataBucket }) =>
                    DataLoader.load(
                        items,
                        dataParent,
                        dataSource.data,
                        nextDataBucket,
                        {
                            childrenKey: childrenProperty,
                            prepareItem
                        }
                    ),
                insertNewItem: (newItem) => insertNewItem(newItem, dataParent),
                finalizeInsertedItem: (item) => {
                    if (expander) {
                        item[childrenLoadedProperty] = true
                    }
                }
            })

            collection = { data, state }
            collections.set(data, collection)

            if (expander) {
                JournalControl.withoutJournaling(() => data.forEach(prepareItem))
            }

            return collection
        }

        function insertNewItem(newItem, dataParent) {
            const target = DataLoader.getLoadTarget(
                dataParent,
                dataSource.data,
                { childrenKey: childrenProperty }
            )
            
            const targetData = target?.data ?? target
            const preparedItem = prepareItem(newItem)

            targetData.push(preparedItem)
            return preparedItem
        }

        function prepareItem(item) {
            if (!expander) {
                return item
            }

            const children = item[childrenProperty]?.data ?? item[childrenProperty]

            if (!Array.isArray(children)) {
                throw new TypeError(`DirectAdapter expected "${childrenProperty}" to be an array`)
            }

            const childrenLoaded = children.length > 0

            item[childrenProperty] = getCollection(children, item)
            item[expandedProperty] = childrenLoaded
            item[childrenLoadedProperty] = childrenLoaded
            item[expandActionProperty] = ExpandHandler.create(
                (dataParent) => dataParent[childrenProperty].state.loadData(),
                {
                    expandedAttribute: expandedProperty,
                    childrenLoadedAttribute: childrenLoadedProperty
                }
            )

            return item
        }

        result[rootDataProperty] = getCollection()
        result.model = dataSource.data

        return result
    }

    return { create }
})()

export default DirectAdapter

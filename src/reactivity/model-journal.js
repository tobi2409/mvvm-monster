import ReactivityFrame from './reactivity-frame.js'
import JournalControl from './journal-control.js'

const ModelJournal = (function () {
    const journalByData = new WeakMap()

    return {
        withoutJournaling(callback) {
            return JournalControl.withoutJournaling(callback)
        },

        isJournalingDisabled() {
            return JournalControl.isJournalingDisabled()
        },

        getJournal(data) {
            return journalByData.get(data)
        },

        reactive(data, identifierProperty = 'id') {
            if (!data || typeof data !== 'object') {
                throw new TypeError(`[ModelJournal] reactive expected "data" to be an object, got ${data === null ? 'null' : typeof data}`)
            }

            const journal = []
            journalByData.set(data, journal)

            function journalizeChange(attributeName, change, id) {
                const changeSnapshot = cloneChange(change)

                if (change.operation === 'set') {
                    const existingEntry = journal.find((entry) => entry.change.operation === 'set'
                        && entry.attributeName === attributeName
                        && entry.id === id)

                    if (existingEntry) {
                        existingEntry.change = changeSnapshot
                        return
                    }
                }

                const journalEntry = { attributeName, change: changeSnapshot }
                
                if (id !== undefined) {
                    journalEntry.id = id
                }

                journal.push(journalEntry)
            }

            function getAttributeName(fullKey, id) {
                if (id === undefined) {
                    return fullKey
                }

                const segments = fullKey.split('.')
                const itemIndex = segments.lastIndexOf(String(id))

                return itemIndex === -1 ? fullKey : segments.slice(itemIndex + 1).join('.')
            }

            function cloneChange(value) {
                if (typeof value === 'function' || value === null || typeof value !== 'object') {
                    return value
                }

                if (Array.isArray(value)) {
                    return value.map(cloneChange)
                }

                return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) =>
                    [key, cloneChange(nestedValue)]))
            }

            ReactivityFrame.makeReactive(data, '', {
                marker: '__journal_reactive__',
                getArrayItemKey: (item) => item[identifierProperty],
                getArrayItemExtraReactiveParams: (item) => ({
                    journalEntryId: item[identifierProperty]
                }),
                // ReactivityFrame already created this change.
                // For splice it contains: { fullKey, action: 'splice', startIndex, deleteCount, items }
                onArrayItemsChange: (change, _, { journalEntryId }) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        const { fullKey, ...arrayChange } = change
                        journalizeChange(getAttributeName(fullKey, journalEntryId), arrayChange, journalEntryId)
                    }
                },
                onDataPropertySet: ({ fullKey, newValue, extraReactiveParams }) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        const id = extraReactiveParams.journalEntryId
                        journalizeChange(getAttributeName(fullKey, id), { operation: 'set', value: newValue }, id)
                    }
                },
                onAccessorPropertySet: ({ fullKey, newValue, extraReactiveParams }) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        const id = extraReactiveParams.journalEntryId
                        journalizeChange(getAttributeName(fullKey, id), { operation: 'set', value: newValue }, id)
                    }
                }
            })

            return data
        }
    }
})()

export default ModelJournal

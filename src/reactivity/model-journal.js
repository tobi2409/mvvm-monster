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

            const journal = new Map()
            journalByData.set(data, journal)

            function journalizeChange(fullKey, change, id, retainHistory = false) {
                const changeSnapshot = cloneChange(change)

                const journalEntry = journal.get(fullKey)

                if (journalEntry) {
                    if (retainHistory) {
                        journalEntry.changes.push(changeSnapshot)
                    } else {
                        journalEntry.changes = [changeSnapshot]
                    }

                    return
                }

                const newJournalEntry = { fullKey, changes: [changeSnapshot] }
                
                if (id !== undefined) {
                    newJournalEntry.id = id
                }

                journal.set(fullKey, newJournalEntry)
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
                onArrayItemsChange: (change, _, { journalEntryId }) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        // ReactivityFrame already created this change. For splice it contains:
                        // { fullKey, action: 'splice', startIndex, deleteCount, items }.
                        journalizeChange(change.fullKey, change, journalEntryId, true)
                    }
                },
                onDataPropertySet: ({ fullKey, newValue, extraReactiveParams }) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        journalizeChange(fullKey, { operation: 'set', value: newValue }, extraReactiveParams.journalEntryId)
                    }
                },
                onAccessorPropertySet: ({ fullKey, newValue, extraReactiveParams }) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        journalizeChange(fullKey, { operation: 'set', value: newValue }, extraReactiveParams.journalEntryId)
                    }
                }
            })

            return data
        }
    }
})()

export default ModelJournal

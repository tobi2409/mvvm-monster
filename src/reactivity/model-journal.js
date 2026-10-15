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

            // Property sets only need their latest value. Array operations retain their
            // order because later operations depend on the result of earlier operations.
            function journalizeChange(fullKey, change, retainHistory = false) {
                const changeSnapshot = cloneChange(change)

                const journalEntry = journal.get(fullKey)

                if (journalEntry) {
                    if (retainHistory) {
                        journalEntry.changes ??= [journalEntry.change]
                        journalEntry.changes.push(changeSnapshot)
                    } else {
                        delete journalEntry.changes
                    }

                    journalEntry.change = changeSnapshot
                    return
                }

                const newJournalEntry = { fullKey, identifierProperty, change: changeSnapshot }

                if (retainHistory) {
                    newJournalEntry.changes = [changeSnapshot]
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
                onArrayItemsChange: (change) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        // ReactivityFrame already created this change. For splice it contains:
                        // { fullKey, action: 'splice', startIndex, deleteCount, items }.
                        journalizeChange(change.fullKey, change, true)
                    }
                },
                onDataPropertySet: ({ fullKey, newValue }) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        journalizeChange(fullKey, { operation: 'set', value: newValue })
                    }
                },
                onAccessorPropertySet: ({ fullKey, newValue }) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        journalizeChange(fullKey, { operation: 'set', value: newValue })
                    }
                }
            })

            return data
        }
    }
})()

export default ModelJournal

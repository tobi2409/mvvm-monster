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

            function journalizeChange(fullKey, change) {
                const changeSnapshot = structuredClone(change)

                const journalEntry = journal.get(fullKey)

                if (journalEntry) {
                    journalEntry.change = changeSnapshot
                    return
                }

                const newJournalEntry = { fullKey, change: changeSnapshot }
                journal.set(fullKey, newJournalEntry)
            }

            ReactivityFrame.makeReactive(data, '', {
                marker: '__journal_reactive__',
                getArrayItemKey: (item) => item[identifierProperty],
                onArrayItemsChange: (change) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        journalizeChange(change.fullKey, change)
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

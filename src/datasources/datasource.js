import JournalControl from '../reactivity/journal-control.js'
import ModelJournal from '../reactivity/model-journal.js'
import Paginator from '../collections/paginator.js'

const DataSource = (function () {

    function create(initialData, newItem, fetchData, saveData = undefined, options = {}) {
        if (!Array.isArray(initialData)) {
            throw new TypeError('DataSource.create expected "initialData" to be an array')
        }

        if (typeof fetchData !== 'function') {
            throw new TypeError('DataSource.create expected "fetchData" to be a function')
        }

        if (saveData !== undefined && typeof saveData !== 'function') {
            throw new TypeError('DataSource.create expected "saveData" to be a function')
        }

        const {
            state: optionalState = {},
            limit = 50,
            identifierProperty = 'id',
            journalize = false
        } = options

        if (journalize && !saveData) {
            throw new TypeError('DataSource.create expected "saveData" when options.journalize is enabled')
        }

        if (typeof optionalState !== 'function'
            && (optionalState === null || typeof optionalState !== 'object' || Array.isArray(optionalState))) {
            throw new TypeError('DataSource.create expected options.state to be an object or function')
        }

        // Bei aktiviertem Journal koennen Datenaenderungen gesammelt gespeichert
        // werden. Ohne Journal bleibt die Identitaet des uebergebenen Arrays erhalten.
        const data = journalize
            ? ModelJournal.reactive(initialData, identifierProperty)
            : initialData

        // Jeder Root- oder Children-Container erhaelt einen eigenen Paging- und
        // Lade-State. Wie Daten angewendet werden, entscheidet weiterhin der Adapter.
        //
        // Adapter-Vertrag:
        // - stateFactoryContext: Dauerhafte Informationen dieses Collection-States.
        //   Sie stehen den newItem- und options.state-Factorys zur Verfuegung.
        // - resolveLoadTarget: Uebersetzt das Action-Item in die Target-Informationen
        //   eines Ladevorgangs. Die DataSource reicht diese nur weiter.
        // - applyLoadedItems: Schreibt ein erfolgreiches Fetch-Ergebnis in das Target.
        // - insertNewItem: Fuegt einen Snapshot von state.newItem ein und gibt das
        //   tatsaechlich eingefuegte, gegebenenfalls transformierte Item zurueck.
        // - finalizeInsertedItem: Optionaler Schritt am bereits eingefuegten Item,
        //   beispielsweise zum Setzen von Tree-Metadaten.
        //
        function createState({
            resolveLoadTarget = () => ({}),
            applyLoadedItems,
            insertNewItem,
            finalizeInsertedItem,
            stateFactoryContext = {}
        } = {}) {
            if (typeof resolveLoadTarget !== 'function') {
                throw new TypeError('DataSource.createState expected "resolveLoadTarget" to be a function')
            }

            if (typeof applyLoadedItems !== 'function') {
                throw new TypeError('DataSource.createState expected "applyLoadedItems" to be a function')
            }

            const state = {
                ...Paginator.createState({ limit }),
            }

            Object.defineProperties(state, {
                loadNextPage: { value: (_, parent) => loadData(
                    state,
                    // Der Adapter bestimmt, ob parent etwa ein Parent-ViewModel,
                    // ein direktes Daten-Item oder etwas Anwendungsspezifisches ist.
                    resolveLoadTarget(parent),
                    true,
                    applyLoadedItems
                ) },
                loadData: { value: (parent = undefined, nextDataBucket = false) => loadData(
                    state,
                    resolveLoadTarget(parent),
                    nextDataBucket,
                    applyLoadedItems
                ) },
                reloadData: { value: () => loadData(
                    state,
                    resolveLoadTarget(),
                    false,
                    applyLoadedItems
                ) }
            })

            if (newItem !== undefined) {
                if (typeof insertNewItem !== 'function') {
                    throw new TypeError('DataSource.createState expected "insertNewItem" when newItem is configured')
                }

                state.newItem = getInitialNewItem(state, stateFactoryContext)

                Object.defineProperty(state, 'addNewItem', { value: (_, parent) => {
                    // Der Formular-State bleibt vorerst erhalten. Der Klon verhindert,
                    // dass weitere Eingaben das bereits eingefuegte Item veraendern.
                    const newItemSnapshot = structuredClone(state.newItem)
                    const insertedItem = insertNewItem(newItemSnapshot, parent)

                    if (finalizeInsertedItem) {
                        JournalControl.withoutJournaling(() =>
                            finalizeInsertedItem(insertedItem, parent))
                    }

                    const nextNewItem = getInitialNewItem(state, stateFactoryContext)

                    for (const key of Object.keys(state.newItem)) {
                        if (!(key in nextNewItem)) {
                            delete state.newItem[key]
                        }
                    }

                    Object.assign(state.newItem, nextNewItem)
                    return insertedItem
                }, writable: true, configurable: true })
            }

            if (journalize) {
                Object.defineProperty(state, 'saveChanges', {
                    value: saveChanges,
                    writable: true,
                    configurable: true
                })
            }

            const extension = typeof optionalState === 'function'
                ? optionalState({ state, ...stateFactoryContext })
                : optionalState

            // Anwendungsspezifischer State wird zuletzt zugewiesen und kann die
            // vorbereiteten Standardwerte und Actions bewusst erweitern oder ersetzen.
            for (const [key, value] of Object.entries(extension)) {
                Object.defineProperty(state, key, {
                    value,
                    enumerable: typeof value !== 'function',
                    writable: true,
                    configurable: true
                })
            }
            return state
        }

        function getInitialNewItem(state, context) {
            const result = typeof newItem === 'function'
                ? newItem({ state, ...context })
                : structuredClone(newItem)

            if (!result || typeof result !== 'object' || Array.isArray(result)) {
                throw new TypeError('DataSource.create expected "newItem" to create an object')
            }

            return result
        }

        async function loadData(state, loadTarget, nextDataBucket, applyLoadedItems) {
            // Der erste Datenblock ersetzt den aktuellen Inhalt und setzt die
            // Pagination zurueck; nur ein weiterer Datenblock wird angehaengt.
            const loadPage = nextDataBucket ? Paginator.loadNextPage : Paginator.loadFirstPage

            return loadPage(state, async (start, pageLimit) => {
                const result = await fetchData({
                    state,
                    // Derselbe opake Kontext wird sowohl dem Fetch als auch applyLoadedItems
                    // gegeben, damit beide Seiten denselben Lade-Target beschreiben.
                    ...loadTarget,
                    start,
                    limit: pageLimit,
                    nextDataBucket
                })

                if (!result || !Array.isArray(result.items) || typeof result.hasMore !== 'boolean') {
                    throw new TypeError('DataSource fetchData must return { items: Array, hasMore: boolean }')
                }

                // Geladene Serverdaten sind der neue Ausgangszustand und keine
                // Benutzeraktion. Deshalb duerfen ihre Mutationen nicht ins Journal.
                await JournalControl.withoutJournaling(() => applyLoadedItems({
                    items: result.items,
                    ...loadTarget,
                    nextDataBucket
                }))

                return result
            })
        }

        async function saveChanges() {
            const journal = ModelJournal.getJournal(data)

            if (journal.size === 0) {
                return false
            }

            await saveData(data, journal)
            // Erst nach erfolgreichem Speichern leeren. Bei einem Fehler bleiben
            // alle Aenderungen fuer einen erneuten Versuch erhalten.
            journal.clear()
            return true
        }

        return { data, createState }
    }

    return { create }
})()

export default DataSource
// Model: Ausschnitt der Daten, die vom Server kommen würden (wenn vom Server geladen wird, ändert sich auch Model)
// ViewModel: für View aufbereitete Daten

import TemplateEngine from '../../src/template-engine.js'
import Paginator from '../../src/collections/paginator.js'
import ModelJournal from '../../src/reactivity/model-journal.js'
import DataLoader from '../../src/dataloaders/data-loader.js'
import ExpandHandler from '../../src/collections/expand-handler.js'
import { getPersons, savePersons } from './fake-server-data.js'

let model
const expand = ExpandHandler.create((modelParent) => model.loadServerData(modelParent))

function createState(modelParent = undefined) {
    const state = {
        ...Paginator.createState({ limit: 1 }),
        newPerson: { name: '' }
    }

    Object.defineProperties(state, {
        loadNextPage: {
            value: () => {
                const modelArray = modelParent?.children ?? model.persons

                model.loadServerData(
                    modelParent,
                    modelArray.state.searchNamePattern,
                    true
                )
            }
        },
        addNewPerson: {
            value: () => {
                const modelArray = modelParent?.children ?? model.persons

                modelArray.data.push(getPersonWithMeta({
                    id: `new-${Math.random().toString(36).substring(2, 9)}`,
                    name: state.newPerson.name,
                    wage: 10,
                    birthyear: 1996,
                    address: { street: '', city: '' },
                    tags: [],
                    children: []
                }))

                state.newPerson.name = ''
            }
        }
    })

    return state
}

function getPersonsWithMeta(persons) {
    for (let i = 0; i < persons.items.length; i++) {
        persons.items[i] = getPersonWithMeta(persons.items[i])
    }

    return persons
}

function getPersonWithMeta(person) {
    console.log(person)
    const personWithMeta = structuredClone(person)
    const childrenWithMeta = personWithMeta.children.map(getPersonWithMeta)
    const childrenState = createState(personWithMeta)

    personWithMeta.childrenLoaded = childrenWithMeta.length > 0
    if (personWithMeta.childrenLoaded) {
        childrenState.start = childrenWithMeta.length
        childrenState.hasMore = false
    }
    personWithMeta.expanded = false
    Object.defineProperty(personWithMeta, 'expand', { value: expand })
    personWithMeta.children = {
        data: childrenWithMeta,
        state: childrenState
    }

    return personWithMeta
}

// durch Journal kann man die Änderungen im Model nachvollziehen und speichern
model = ModelJournal.reactive(TemplateEngine.reactive({
    user: 'Joe Doe',

    get searchNamePattern() {
        return this._searchNamePattern || ''
    },

    set searchNamePattern(value) {
        this._searchNamePattern = value
        // sowohl Model als auch ViewModel werden aktualisiert
        // das Model soll sich auch ändern, weil die Daten vom Server kommen
        // würden wir nur die bereits gefetchten Daten filtern, sollte sich nur das ViewModel ändern
        model.loadServerData(undefined, value)
    },

    createState,
    expand,

    persons: {
        data: [],
        state: createState()
    },

    loadServerData(
        modelParent = undefined,
        searchNamePattern = undefined,
        append = false
    ) {
        const modelArray = modelParent?.children ?? model.persons
        console.log(modelArray)
        const state = modelArray.state

        if (!append) {
            modelArray.state.searchNamePattern = searchNamePattern
        }

        const loadPage = append ? Paginator.loadNextPage : Paginator.loadFirstPage

        return loadPage(state, async (start, limit) => {
            const persons = getPersons(modelParent?.id, searchNamePattern, start, limit)
            const result = getPersonsWithMeta(persons)

            DataLoader.load(
                result.items,
                modelParent,
                model.persons,
                append
            )

            return result
        })
    },

    saveChanges() {
        const journal = ModelJournal.getJournal(model)

        if (journal.size === 0) {
            return
        }

        savePersons(model.persons.data.map(toServerPerson))
        journal.clear()
    },

    logModels() {
        console.log('Model:', model)
    }

}, document.getElementById('app-template-use')))

model.loadServerData()

function toServerPerson(person) {
    return {
        id: person.id,
        name: person.name,
        wage: Number(person.wage),
        birthyear: Number(person.birthyear),
        address: person.address,
        tags: person.tags.data ?? person.tags,
        children: person.children.data.map(toServerPerson)
    }
}
// Model: Ausschnitt der Daten, die vom Server kommen würden (wenn vom Server geladen wird, ändert sich auch Model)
// ViewModel: für View aufbereitete Daten

import TemplateEngine from '../../src/template-engine.js'
import Paginator from '../../src/collections/paginator.js'
import ModelJournal from '../../src/reactivity/model-journal.js'
import DataLoader from '../../src/dataloaders/data-loader.js'
import ExpandHandler from '../../src/collections/expand-handler.js'
import { getPersons, savePersons } from './fake-server-data.js'

// durch Journal kann man die Änderungen im Model nachvollziehen und speichern
const modelDefinition = {
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

    getPersonWithMeta(person) {
        const personWithMeta = structuredClone(person)
        const childrenLoaded = personWithMeta.children.length > 0

        personWithMeta.childrenLoaded = childrenLoaded
        personWithMeta.expanded = childrenLoaded

        Object.defineProperty(personWithMeta, 'expand', {
            value: ExpandHandler.create((modelParent) => model.loadServerData(modelParent))
        })
        
        personWithMeta.children = this.getModelArray(personWithMeta.children, personWithMeta)

        if (childrenLoaded) {
            personWithMeta.children.state.start = personWithMeta.children.data.length
            personWithMeta.children.state.hasMore = false
        }

        return personWithMeta
    },

    getModelArray(persons = [], modelParent = undefined) {
        const state = {
            ...Paginator.createState({ limit: 1 }),
            newPerson: { name: '' }
        }

        const modelArray = {
            data: persons.map((person) => this.getPersonWithMeta(person)),
            state
        }

        Object.defineProperties(state, {
            loadNextPage: {
                value: () => model.loadServerData(
                    modelParent,
                    state.searchNamePattern,
                    true
                )
            },
            addNewPerson: {
                value: () => {
                    modelArray.data.push(this.getPersonWithMeta({
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

        return modelArray
    },

    toServerPerson(person) {
        return {
            id: person.id,
            name: person.name,
            wage: Number(person.wage),
            birthyear: Number(person.birthyear),
            address: person.address,
            tags: person.tags.data ?? person.tags,
            children: person.children.data.map((child) => this.toServerPerson(child))
        }
    },

    loadServerData(
        modelParent = undefined,
        searchNamePattern = undefined,
        append = false
    ) {
        const modelArray = modelParent?.children ?? model.persons
        const state = modelArray.state

        if (!append) {
            modelArray.state.searchNamePattern = searchNamePattern
        }

        const loadPage = append ? Paginator.loadNextPage : Paginator.loadFirstPage

        return loadPage(state, async (start, limit) => {
            const result = getPersons(modelParent?.id, state.searchNamePattern, start, limit)
            const personsWithMeta = result.items.map((person) => this.getPersonWithMeta(person))

            DataLoader.loadData(
                personsWithMeta,
                modelArray.data,
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

        savePersons(model.persons.data.map((person) => this.toServerPerson(person)))
        journal.clear()
    },

    logModels() {
        console.log('Model:', model)
    }
}

modelDefinition.persons = modelDefinition.getModelArray()

const model = ModelJournal.reactive(TemplateEngine.reactive(
    modelDefinition,
    document.getElementById('app-template-use')
))

model.loadServerData()
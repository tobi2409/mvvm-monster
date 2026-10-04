// Model: Ausschnitt der Daten, die vom Server kommen würden (wenn vom Server geladen wird, ändert sich auch Model)
// ViewModel: für View aufbereitete Daten

import TemplateEngine from '../../src/template-engine.js'
import ViewModelArray from '../../src/model/viewmodel-array.js'
import X from '../../src/x/x.js'
import Paginator from '../../src/collections/paginator.js'
import MVVMDataLoader from '../../src/dataloaders/mvvm-data-loader.js'
import ExpandHandler from '../../src/collections/expand-handler.js'
import ModelJournal from '../../src/reactivity/model-journal.js'
import { getPersons, savePersons } from './fake-server-data.js'

// durch Journal kann man die Änderungen im Model nachvollziehen und speichern
const model = ModelJournal.reactive({
    user: 'Joe Doe',
    persons: []
})

const viewModel = TemplateEngine.reactive({
    get user() {
        return model.user
    },

    set user(value) {
        model.user = value
    },

    get searchNamePattern() {
        return this._searchNamePattern || ''
    },

    set searchNamePattern(value) {
        this._searchNamePattern = value
        // sowohl Model als auch ViewModel werden aktualisiert
        // das Model soll sich auch ändern, weil die Daten vom Server kommen
        // würden wir nur die bereits gefetchten Daten filtern, sollte sich nur das ViewModel ändern
        X.loadData(undefined, viewModel.persons, getPersons, { searchNamePattern: value }, { })
    },

    transform(personModelItem) {

        return X._transform(personModelItem, () => ({
            id: personModelItem.id,
            name: personModelItem.name,
            wage: `${personModelItem.wage} USD`,
            age: new Date().getFullYear() - personModelItem.birthyear,
            address: {
                street: `${personModelItem.address?.street} - viewModel` || '',
                city: `${personModelItem.address?.city} - viewModel` || ''
            },
            tags: ViewModelArray.get(
                personModelItem.tags || [],
                (tagModelItem) => ({ name: `${tagModelItem.name} - viewModel` }),
                (tagViewModelItem) => ({ name: () => tagViewModelItem.name.slice(0, -12) })
            ),
            tagsVisible: false,
            showTags: (_, viewModelParent) => viewModelParent.tagsVisible = !viewModelParent.tagsVisible,
            addTag: (_, viewModelParent) => 
                // kein preparedViewModelItem nötig, da keine fachlich unabhängigen Strukturen (expand) vorhanden
                viewModelParent.tags.data.push({ name: 'New Tag - viewModel' }),
            children: this.getViewModelArray(personModelItem.children, personModelItem)
        }), getPersons, viewModel.persons)

    },

    reverseTransform(personViewModelItem, modelItem) {
        return X._reverseTransform(personViewModelItem, modelItem, (viewModelItem, modelItem) => ({
            id: () => viewModelItem.id,
            name: () => viewModelItem.name,
            wage: () => viewModelItem.wage.slice(0, -4), // TODO: Input validation, Convert to number
            birthyear: () => new Date().getFullYear() - viewModelItem.age,
            address: () => ({
                street: () => viewModelItem.address?.street.slice(0, -12),
                city: () => viewModelItem.address?.city.slice(0, -12),
            })
        }))
    },

    // TODO: markRecursive
    getViewModelArray(modelArray, modelItem = undefined) {
        const state = {
            ...Paginator.createState({ limit: 1 }),
            newPerson: { name: '' },
            loadNextPage: (_, viewModelItem) => 
                X.loadData(
                    modelItem ? viewModelItem : undefined,
                    viewModel.persons,
                    getPersons,
                    { searchNamePattern: state.searchNamePattern },
                    { append: true }
                ),
            addNewPerson: () => {
                viewModelArray.data.push({
                        id: `new-${Math.random().toString(36).substring(2, 9)}`,
                        name: state.newPerson.name,
                        wage: '10 USD',
                        age: 30,
                        address: { street: '', city: '' },
                        tags: [],
                        children: []
                    },
                    // preparedViewModelItem ist nur nötig, wenn sich im View-Item fachlich unabhängige Strukturen (expand) befinden
                    // ansonsten kann auch direkt das View-Item erstellt werden
                    { extraArrayParams: { preparedViewModelItem: true } }
                )

                // beim Expandieren dürfen die children nicht vom Server geladen werden,
                // sonst werden sie nebst einem unnötigen Serverzugriff überschrieben
                // das merkt man, wenn das neu erstellte Item selber Kinder hat
                viewModelArray.data.at(-1).childrenLoaded = true

                state.newPerson.name = ''
            }
        }

        const viewModelArray = ViewModelArray.get(
            modelArray,
            (personModelItem) => this.transform(personModelItem),
            (personViewModelItem) => this.reverseTransform(personViewModelItem),
            { age: 'birthyear' },
            state
        )

        return viewModelArray
    },

    get persons() {
        // Singleton is provided by mappedViewModelArrayCache
        return this.getViewModelArray(model.persons)
    },

    saveChanges() {
        const journal = ModelJournal.getJournal(model)

        if (journal.size === 0) {
            return
        }

        savePersons(model.persons)
        journal.clear()
    },

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

X.loadData(undefined, viewModel.persons, getPersons, { searchNamePattern: '' }, { childrenArrayName: 'children' })
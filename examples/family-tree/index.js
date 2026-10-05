// Model: Ausschnitt der Daten, die vom Server kommen würden (wenn vom Server geladen wird, ändert sich auch Model)
// ViewModel: für View aufbereitete Daten

import TemplateEngine from '../../src/template-engine.js'
import MVVMDataController from '../../src/datacontrollers/mvvm-data-controller.js'
import ViewModelArray from '../../src/model/viewmodel-array.js'
import ModelJournal from '../../src/reactivity/model-journal.js'
import { getPersons, savePersons } from './fake-server-data.js'

// durch Journal kann man die Änderungen im Model nachvollziehen und speichern
const model = ModelJournal.reactive({
    user: 'Joe Doe',
    persons: []
})

const fetchOptions = { searchNamePattern: '' }
let viewModel

viewModel = TemplateEngine.reactive({
    
    dataController: MVVMDataController.create(
        (modelItem) => viewModel.transform(modelItem),
        (viewModelItem, modelItem) => viewModel.reverseTransform(viewModelItem, modelItem),
        (modelParent, options, start, limit) =>
            getPersons(modelParent?.id ?? null, options, start, limit),
        fetchOptions,
        {
            limit: 1,
            propertyMapping: { age: 'birthyear' },
            model,
            persist: savePersons,
            customState: ({ viewModelArray }) => ({
                newPerson: { name: '' },
                loadNextPage: (_, viewModelParent) => {
                    const parent = viewModelParent?.__modelItem__ ? viewModelParent : undefined
                    return viewModel.dataController.loadNextPage(parent)
                },
                addNewPerson: () => {
                    const state = viewModelArray.state

                    viewModelArray.data.push({
                        id: `new-${Math.random().toString(36).substring(2, 9)}`,
                        name: state.newPerson.name,
                        wage: '10 USD',
                        age: 30,
                        address: { street: '', city: '' },
                        tags: [],
                        children: []
                    }, { extraArrayParams: { preparedViewModelItem: true } })

                    viewModelArray.data.at(-1).childrenLoaded = true
                    state.newPerson.name = ''
                }
            })
        }
    ),

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
        fetchOptions.searchNamePattern = value
        // das Model soll sich auch ändern, weil die Daten vom Server kommen
        this.dataController.loadServerData()
    },

    transform(personModelItem) {
        return {
            id: personModelItem.id,
            name: personModelItem.name,
            wage: `${personModelItem.wage} USD`,
            age: new Date().getFullYear() - personModelItem.birthyear,
            address: {
                street: `${personModelItem.address?.street} - viewModel` || '',
                city: `${personModelItem.address?.city} - viewModel` || ''
            },
            // durch ViewModelArray.get wird in reaktiver Engine für tags ViewModelArrayConfig erstellt,
            // und daher findet ModelSynchronization inklusive reverseTransform statt
            // -> Tags beim reverseTransform vom Parent können daher leer sein
            tags: ViewModelArray.get(
                personModelItem.tags || [],
                (tagModelItem) => ({ name: `${tagModelItem.name} - viewModel` }),
                (tagViewModelItem) => ({ name: () => tagViewModelItem.name.slice(0, -12) })
            ),
            tagsVisible: false,
            showTags: (_, viewModelParent) => viewModelParent.tagsVisible = !viewModelParent.tagsVisible,
            addTag: (_, viewModelParent) => 
                // kein preparedViewModelItem nötig, da keine fachlich unabhängigen Strukturen (expand) vorhanden
                viewModelParent.tags.data.push({ name: 'New Tag - viewModel' })
        }
    },

    reverseTransform(personViewModelItem, modelItem) {
        return {
            id: () => personViewModelItem.id,
            name: () => personViewModelItem.name,
            wage: () => personViewModelItem.wage.slice(0, -4), // TODO: Input validation, Convert to number
            birthyear: () => new Date().getFullYear() - personViewModelItem.age,
            address: () => ({
                street: () => personViewModelItem.address?.street.slice(0, -12),
                city: () => personViewModelItem.address?.city.slice(0, -12),
            })
        }
    },

    get persons() {
        // Singleton is provided by mappedViewModelArrayCache
        return this.dataController.getViewModelArray(model.persons)
    },

    saveChanges() {
        return this.dataController.saveChanges()
    },

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

viewModel.dataController.loadServerData()
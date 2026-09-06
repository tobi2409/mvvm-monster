// Model: Ausschnitt der Daten, die vom Server kommen würden (wenn vom Server geladen wird, ändert sich auch Model)
// ViewModel: für View aufbereitete Daten

import TemplateEngine from '../../src/template-engine.js'
import ViewModelArray from '../../src/viewmodel-array.js'
import Paginator from '../../src/paginator.js'
import ModelViewModelExpander from '../../src/model-viewmodel-expander.js'
import ModelJournal from '../../src/model-journal.js'
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
        viewModel.loadServerData(undefined, undefined, value)
    },

    transform(personModelItem) {
        const childrenLoaded = personModelItem.children.length > 0

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
            // siehe Tags
            children: this.getViewModelArray(personModelItem.children, personModelItem),
            // Bei Suchergebnissen werden die Parents inklusive ihrer Trefferpfade
            // geliefert. Diese Pfade müssen direkt geöffnet und als geladen markiert
            // werden, damit tiefer liegende Treffer sichtbar sind und nicht beim
            // nächsten Expand durch einen erneuten Serverabruf überschrieben werden.
            expanded: childrenLoaded,
            childrenLoaded,
            expand: ModelViewModelExpander.createExpandHandler((viewModelParent) => viewModel.loadServerData(viewModelParent, personModelItem)),
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
            }),
            // Enthält ein neu hinzugefügtes, vorbereitetes Parent-Item bereits Children,
            // müssen diese hier rekursiv zurücktransformiert werden. prepareItem erzeugt
            // zuerst das vollständige Model-Item und transformiert erst danach das ViewModel;
            // mit [] würden mitgelieferte Children dabei verworfen. [] ist nur passend,
            // wenn die Children anschließend separat über children.data eingefügt werden.
            children: () => []
            //children: () => personViewModelItem.children.map(viewModelChild => this.reverseTransform(viewModelChild))
        }
    },

    // TODO: markRecursive
    getViewModelArray(modelArray, modelItem = undefined) {
        const state = {
            ...Paginator.createState({ limit: 1 }),
            newPerson: { name: '' },
            loadNextPage: (_, viewModelItem) => viewModel.loadServerData(
                modelItem ? viewModelItem : undefined,
                modelItem,
                state.searchNamePattern,
                true
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

    async loadServerData(
        viewModelParent = undefined,
        modelParent = undefined,
        searchNamePattern = undefined,
        append = false
    ) {
        const viewModelArray = viewModelParent?.children ?? viewModel.persons
        const state = viewModelArray.state

        if (!append) {
            state.searchNamePattern = searchNamePattern
        }

        const loadPage = append ? Paginator.loadNextPage : Paginator.loadFirstPage

        return loadPage(state, async (start, limit) => {
            const result = getPersons(modelParent?.id, state.searchNamePattern, start, limit)

            await TemplateEngine.withoutModelSynchronization(() => {
                ModelViewModelExpander.expand(
                    result.items,
                    viewModelParent,
                    modelParent,
                    viewModel.persons,
                    model.persons,
                    append
                )
            })

            return result
        })
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

viewModel.loadServerData()
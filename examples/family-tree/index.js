import TemplateEngine from '../../src/template-engine.js'
import ViewModelArray from '../../src/model/viewmodel-array.js'
import MvvmDataSource from '../../src/datasources/mvvm-data-source.js'
import { getPersons, savePersons } from './fake-server-data.js'

const model = {
    user: 'Joe Doe',
    persons: []
}

const persons = MvvmDataSource.create(
    model.persons,
    () => ({
        id: `new-${Math.random().toString(36).substring(2, 9)}`,
        name: '',
        wage: '10 USD',
        age: 30,
        address: { street: '', city: '' },
        tags: [],
        children: []
    }),
    ({ state, modelParent, start, limit }) => getPersons(
        modelParent?.id,
        state.searchNamePattern,
        start,
        limit
    ),
    (model) => savePersons(model),
    (person) => ({
        id: person.id,
        name: person.name,
        wage: `${person.wage} USD`,
        age: new Date().getFullYear() - person.birthyear,
        address: {
            street: `${person.address?.street} - viewModel` || '',
            city: `${person.address?.city} - viewModel` || ''
        },
        tags: ViewModelArray.get(
            person.tags || [],
            (tag) => ({ name: `${tag.name} - viewModel` }),
            (tag) => ({ name: () => tag.name.slice(0, -12) })
        ),
        tagsVisible: false,
        showTags: (_, item) => item.tagsVisible = !item.tagsVisible,
        addTag: (_, item) => item.tags.data.push({ name: 'New Tag - viewModel' })
    }),
    (person) => ({
        id: () => person.id,
        name: () => person.name,
        wage: () => person.wage.slice(0, -4),
        birthyear: () => new Date().getFullYear() - person.age,
        address: () => ({
            street: () => person.address?.street.slice(0, -12),
            city: () => person.address?.city.slice(0, -12)
        })
    }),
    {
        limit: 1,
        journalize: true,
        state: { searchNamePattern: undefined },
        rootViewModelArrayProperty: 'persons',
        propertyMapping: { age: 'birthyear' },
        expander: true
    }
)

const viewModel = TemplateEngine.reactive({
    get user() {
        return model.user
    },

    set user(value) {
        model.user = value
    },

    persons,
    saveChanges: persons.state.saveChanges,

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

viewModel.persons.state.loadData()

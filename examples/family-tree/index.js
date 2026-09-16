import TemplateEngine from '../../src/template-engine.js'
import ViewModelArray from '../../src/model/viewmodel-array.js'
import DataSource from '../../src/datasources/datasource.js'
import MvvmAdapter from '../../src/datasources/mvvm-adapter.js'
import { getPersons, savePersons } from './fake-server-data.js'

const dataSource = DataSource.create(
    [],
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
    {
        limit: 1,
        journalize: true,
        state: { searchNamePattern: undefined }
    }
)

const viewModel = MvvmAdapter.create(
    dataSource,
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
        rootViewModelArrayProperty: 'persons',
        propertyMapping: { age: 'birthyear' },
        expander: true
    }
)

viewModel.user = 'Joe Doe'
viewModel.saveChanges = viewModel.persons.state.saveChanges
viewModel.logModels = () => {
    console.log('ViewModel:', viewModel)
    console.log('Model:', viewModel.model)
}

const reactiveViewModel = TemplateEngine.reactive(
    viewModel,
    document.getElementById('app-template-use')
)

reactiveViewModel.persons.state.loadData()

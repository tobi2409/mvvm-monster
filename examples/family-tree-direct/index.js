import TemplateEngine from '../../src/template-engine.js'
import DataSource from '../../src/datasources/datasource.js'
import DirectAdapter from '../../src/datasources/direct-adapter.js'
import { getPersons, savePersons } from './fake-server-data.js'

const dataSource = DataSource.create(
    [],
    () => ({
        id: `new-${Math.random().toString(36).substring(2, 9)}`,
        name: '',
        wage: 10,
        birthyear: 1996,
        address: { street: '', city: '' },
        tags: [],
        children: []
    }),
    ({ state, dataParent, start, limit }) => getPersons(
        dataParent?.id,
        state.searchNamePattern,
        start,
        limit
    ),
    (persons) => savePersons(persons.map(toServerPerson)),
    {
        limit: 1,
        journalize: true,
        state: { searchNamePattern: undefined }
    }
)

const data = DirectAdapter.create(dataSource, {
    rootDataProperty: 'persons',
    expander: true
})

data.user = 'Joe Doe'
data.saveChanges = data.persons.state.saveChanges
data.logModels = () => console.log('Data:', data)

const reactiveData = TemplateEngine.reactive(
    data,
    document.getElementById('app-template-use')
)

reactiveData.persons.state.loadData()

function toServerPerson(person) {
    return {
        id: person.id,
        name: person.name,
        wage: Number(person.wage),
        birthyear: Number(person.birthyear),
        address: person.address,
        tags: person.tags,
        children: person.children.data.map(toServerPerson)
    }
}

import TemplateEngine from '../../src/template-engine.js'
import MVVMDataController from '../../src/datacontrollers/mvvm-data-controller.js'
import ModelJournal from '../../src/reactivity/model-journal.js'
import { getPersons } from './fake-server-data.js'

const model = ModelJournal.reactive({ persons: [] })
let viewModel

function splitFullName(fullName) {
    const [firstName = '', ...lastNameParts] = fullName.trim().split(/\s+/)
    return { firstName, lastName: lastNameParts.join(' ') }
}

viewModel = TemplateEngine.reactive({
    dataController: MVVMDataController.create(
        (person) => ({
            id: person.id,
            fullName: `${person.firstName} ${person.lastName}`.trim(),
            email: person.email,
            role: person.role
        }),
        (person) => ({
            id: () => person.id,
            firstName: () => splitFullName(person.fullName).firstName,
            lastName: () => splitFullName(person.fullName).lastName,
            email: () => person.email,
            role: () => person.role
        }),
        getPersons,
        {},
        {
            limit: 3,
            propertyMapping: { fullName: ['firstName', 'lastName'] },
            customState: () => ({
                loadNextPage: () => viewModel.dataController.loadNextPage()
            })
        }
    ),

    get persons() {
        return this.dataController.getViewModelArray(model.persons)
    },

    logModels() {
        console.log('ViewModel:', this.persons)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

await viewModel.dataController.loadServerData()

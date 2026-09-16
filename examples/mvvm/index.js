import TemplateEngine from '../../src/template-engine.js'
import ViewModelArray from '../../src/model/viewmodel-array.js'
import { runDemoUpdates } from './demo-updates.js'

const model = {
    firstName: 'Alex',
    lastName: 'Gonzales',
    wage: 800,
    rawPersonData: [{ id: 1, name: 'Test', birthyear: 1995 }, { id: 2, name: 'Demo', birthyear: 1990 }]
}

const viewModel = TemplateEngine.reactive({
    set firstName(value) {
        model.firstName = value
    },

    get firstName() {
        return model.firstName
    },

    set lastName(value) {
        model.lastName = value
    },

    get lastName() {
        return model.lastName
    },
    
    get fullName() {
        return `${this.firstName} ${this.lastName}`
    },

    set wage(value) {
        model.wage = value
    },

    get wage() {
        return model.wage
    },

    get showWage() {
        return this.wage > 600
    },

    get fullInfo() {
        return `${this.fullName} earns $${this.wage}`
    },

    get beautifiedPersonData() {
        return ViewModelArray.get(
            model.rawPersonData,
            (p, index) => ({
                id: p.id,
                name: p.name,
                age: new Date().getFullYear() - p.birthyear,
                showEdit: false
            }),
            (item) => ({
                id: () => item.id,
                name: () => item.name,
                birthyear: () => new Date().getFullYear() - item.age
            }),
            { age: 'birthyear' }
        )
    },

    editPersonInfo: function(event) {
        const index = parseInt(event.target.parentElement.getAttribute('item-index'))
        const person = viewModel.beautifiedPersonData.data.find(p => p.id === index)
        person.showEdit = !person.showEdit
    },

    addPersonInfo: function() {
        const nextId = (model.rawPersonData.reduce((max, p) => Math.max(max, p.id), 0) || 0) + 1
        viewModel.beautifiedPersonData.data.push({
            id: nextId,
            name: `Person ${nextId}`,
            age: 30,
            showEdit: false
        })
    },

    logModels: function() {
        console.log('Model:', model)
        console.log('ViewModel:', viewModel)
    },

    runDemoUpdates: function() {
        runDemoUpdates(viewModel, model)
    }
}, document.getElementById('app-template-use'), {
    'firstName': ['fullName'],
    'lastName': ['fullName'],
    'wage': ['showWage', 'fullInfo'],
    'fullName': ['fullInfo']
})
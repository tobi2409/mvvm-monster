import TemplateEngine from '../../src/template-engine.js'
import ArrayHelpers from '../../src/collections/array-helpers.js'
import { runDemoUpdates } from './demo-updates.js'

const data = TemplateEngine.reactive({
    name: 'Sarah Wilson',
    age: 28,
    watermark: 'Confidential',
    persons: [{
        id: 1,
        name: 'Alex Chen',
        role: 'Tech Lead',
        editing: false,
        children: [{
            id: 101,
            name: 'Maya Patel - Senior Developer',
            editing: false,
            children: []
        }, {
            id: 102,
            name: 'Jordan Kim - Frontend Developer',
            editing: false,
            children: []
        }]
    }, {
        id: 3,
        name: 'Chris Martinez',
        role: 'Product Manager',
        editing: false,
        children: [{
            id: 301,
            name: 'Taylor Brown - UX Designer',
            editing: false,
            children: []
        }]
    }],
    toggleEdit: (e, dataElement) => {
        dataElement.editing = !dataElement.editing
    },
    
    delete: (e, dataElement) => {
        ArrayHelpers.removeByReference(data.persons, dataElement)
    },

    toggleChildEdit: (e, dataElement) => {
        dataElement.editing = !dataElement.editing
    },

    deleteChild: (e, dataElement, dataElementUuid, contextStack) => {
        const parentData = contextStack.get('p')?.data
        
        if (parentData?.children) {
            ArrayHelpers.removeByReference(parentData.children, dataElement)
        }
    },

    runDemoUpdates: () => {
        runDemoUpdates(data)
    }
}, document.getElementById('app-template-use'))



import TemplateEngine from '../../src/template-engine.js'
import ArrayHelpers from '../../src/collections/array-helpers.js'
import { runDemoUpdates } from './demo-updates.js'

const data = TemplateEngine.reactive({
    name: 'Alex Johnson',
    folders: [{
        id: 1,
        name: 'projects',
        size: 2,
        editing: false,
        children: [{
            id: 11,
            name: 'website',
            size: 0,
            editing: false,
            children: []
        }, {
            id: 12,
            name: 'mobile-app',
            size: 0,
            editing: false,
            children: []
        }]
    }, {
        id: 2,
        name: 'documents',
        size: 1,
        editing: false,
        children: [{
            id: 21,
            name: 'reports',
            size: 0,
            editing: false,
            children: []
        }]
    }],

    toggleEdit: (e, dataElement) => {
        dataElement.editing = !dataElement.editing
    },
    
    delete: (e, dataElement, _, contextStack) => {
        const parentChildren = ArrayHelpers.getParentContext(contextStack)?.data?.children ?? data.folders
        ArrayHelpers.removeByReference(parentChildren, dataElement)
    },

    runDemoUpdates: () => {
        runDemoUpdates(data)
    }
}, document.getElementById('app-template-use'))



import TemplateEngine from '../../src/template-engine.js'
import ArrayHelpers from '../../src/collections/array-helpers.js'
import { runDemoUpdates } from './demo-updates.js'

const data = TemplateEngine.reactive({
    todos: [
        { id: 1, name: 'Review pull requests', showEdit: false },
        { id: 2, name: 'Update documentation', showEdit: false },
        { id: 3, name: 'Fix responsive layout', showEdit: false }
    ],
    newTodo: '',
    
    add: function() {
        if (data.newTodo.trim()) {
            data.todos.push({ id: data.todos.length + 1, name: data.newTodo, showEdit: false })
            data.newTodo = ''
        }
    },

    edit: function(e, dataElement) {
        dataElement.showEdit = !dataElement.showEdit
    },

    deleteTodo: function(e, dataElement) {
        ArrayHelpers.removeByReference(data.todos, dataElement)
    },

    runDemoUpdates: function() {
        runDemoUpdates(data)
    }
}, document.getElementById('app-template-use'))



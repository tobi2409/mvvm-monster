import DataSource from './datasource.js'
import DirectAdapter from './direct-adapter.js'

const DirectDataSource = (function () {
    function create(initialData, newItem, fetchData, saveData = undefined, options = {}) {
        const dataSource = DataSource.create(initialData, newItem, fetchData, saveData, options)
        return DirectAdapter.create(dataSource, options)
    }

    return { create }
})()

export default DirectDataSource
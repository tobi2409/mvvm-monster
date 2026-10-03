import DataSource from './datasource.js'
import MvvmAdapter from './mvvm-adapter.js'

const MvvmDataSource = (function () {
    function create(
        initialData,
        newItem,
        fetchData,
        saveData,
        transform,
        reverseTransform,
        options = {}
    ) {
        const dataSource = DataSource.create(initialData, newItem, fetchData, saveData, options)
        const viewModel = MvvmAdapter.create(dataSource, transform, reverseTransform, options)
        const rootViewModelArrayProperty = options.rootViewModelArrayProperty ?? 'items'

        return viewModel[rootViewModelArrayProperty]
    }

    return { create }
})()

export default MvvmDataSource
const ExpandHandler = (function () {
    function create(loadData, options = {}) {
        return (_, dataParent) => {
            const {
                expandedAttribute = 'expanded',
                childrenLoadedAttribute = 'childrenLoaded'
            } = options

            if (!dataParent[childrenLoadedAttribute]) {
                loadData(dataParent)
                dataParent[childrenLoadedAttribute] = true
            }

            dataParent[expandedAttribute] = !dataParent[expandedAttribute]
        }
    }

    return { create }
})()

export default ExpandHandler
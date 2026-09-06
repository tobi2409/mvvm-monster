const Paginator = (function () {
    function createState({ limit = 50 } = {}) {
        if (!Number.isInteger(limit) || limit < 1) {
            throw new TypeError('Paginator.createState expected "limit" to be a positive integer')
        }

        return {
            start: 0,
            limit,
            hasMore: true,
            loading: false
        }
    }

    async function loadPage(state, loadData, reset) {
        if (typeof loadData !== 'function') {
            throw new TypeError('Paginator expected "loadData" to be a function')
        }

        if (state.loading || (!reset && !state.hasMore)) {
            return []
        }

        state.loading = true

        try {
            const start = reset ? 0 : state.start
            const result = await loadData(start, state.limit)
            const { items, hasMore } = result || {}

            if (!Array.isArray(items) || typeof hasMore !== 'boolean') {
                throw new TypeError('Paginator loadData must return { items: Array, hasMore: boolean }')
            }

            state.start = start + items.length
            state.hasMore = hasMore

            return items
        } finally {
            state.loading = false
        }
    }

    function loadFirstPage(state, loadData) {
        return loadPage(state, loadData, true)
    }

    function loadNextPage(state, loadData) {
        return loadPage(state, loadData, false)
    }

    return { createState, loadFirstPage, loadNextPage }
})()

export default Paginator

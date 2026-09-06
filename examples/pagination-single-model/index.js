import TemplateEngine from '../../src/template-engine.js'
import Paginator from '../../src/paginator.js'

const serverItems = Array.from({ length: 23 }, (_, index) => ({
    id: index + 1,
    name: `Eintrag ${String(index + 1).padStart(2, '0')}`
}))

function getItems(searchPattern, start, limit) {
    const normalizedSearch = searchPattern.trim().toLowerCase()
    const matchingItems = normalizedSearch
        ? serverItems.filter((item) => item.name.toLowerCase().includes(normalizedSearch))
        : serverItems
    const items = matchingItems.slice(start, start + limit)

    return new Promise((resolve) => {
        setTimeout(() => resolve({
            items,
            hasMore: start + items.length < matchingItems.length
        }), 350)
    })
}

let model
const paginator = Paginator.createState({ limit: 5 })

async function loadData(searchPattern, start, limit, append) {
    const result = await getItems(searchPattern, start, limit)

    if (append) {
        model.items.push(...result.items)
    } else {
        model.items.splice(0, model.items.length, ...result.items)
    }

    return result
}

function loadInitialData(searchPattern) {
    return Paginator.loadFirstPage(
        paginator,
        (start, limit) => loadData(searchPattern, start, limit, false)
    )
}

model = TemplateEngine.reactive({
    items: [],
    searchInput: '',
    activeSearch: '',
    paginator,

    loadNextPage() {
        return Paginator.loadNextPage(
            model.paginator,
            (start, limit) => loadData(model.activeSearch, start, limit, true)
        )
    },

    search() {
        model.activeSearch = model.searchInput
        return loadInitialData(model.activeSearch)
    },

    clearSearch() {
        model.searchInput = ''
        model.activeSearch = ''
        return loadInitialData('')
    }
}, document.getElementById('page-use'))

loadInitialData('')

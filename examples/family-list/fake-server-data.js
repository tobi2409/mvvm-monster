const persons = [
    { id: 1, firstName: 'Max', lastName: 'Mustermann', email: 'max@example.com', role: 'Engineering', children: [] },
    { id: 2, firstName: 'Erika', lastName: 'Mustermann', email: 'erika@example.com', role: 'Design', children: [] },
    { id: 3, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', role: 'Engineering', children: [] },
    { id: 4, firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com', role: 'Operations', children: [] },
    { id: 5, firstName: 'Margaret', lastName: 'Hamilton', email: 'margaret@example.com', role: 'Engineering', children: [] },
    { id: 6, firstName: 'Katherine', lastName: 'Johnson', email: 'katherine@example.com', role: 'Research', children: [] },
    { id: 7, firstName: 'Edsger', lastName: 'Dijkstra', email: 'edsger@example.com', role: 'Research', children: [] }
]

export function getPersons(_modelParent, _fetchOptions, start = 0, limit = 3) {
    const items = structuredClone(persons.slice(start, start + limit))

    return {
        items,
        hasMore: start + items.length < persons.length
    }
}

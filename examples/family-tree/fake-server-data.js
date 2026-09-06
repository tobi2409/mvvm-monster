const database = new alasql.Database('family-tree')

database.exec('CREATE TABLE persons (id INT, parentId INT, name STRING, wage INT, birthyear INT, street STRING, city STRING, tags JSON)')

export const fakeServerData = [{
    id: 1,
    name: 'Max Mustermann',
    wage: 10,
    birthyear: 1990,
    address: {
        street: 'Main Street 1',
        city: 'Berlin'
    },
    tags: [{ name: 'max' }, { name: 'mustermann' }],
    children: [{
        id: 3,
        name: 'Max Jr.',
        wage: 5,
        birthyear: 2010,
        address: {
            street: 'Main Street 3',
            city: 'Bremen'
        },
        tags: [{ name: 'max' }, { name: 'jr' }],
        children: [{
            id: 5,
            name: 'Max III',
            wage: 2,
            birthyear: 2035,
            address: {
                street: 'Main Street 5',
                city: 'Hamburg'
            },
            tags: [{ name: 'max' }, { name: 'iii' }],
            children: []
        }]
    }, {
        id: 6,
        name: 'Max Jr. 2',
        wage: 5,
        birthyear: 2012,
        address: {
            street: 'Main Street 6',
            city: 'Dresden'
        },
        tags: [{ name: 'max' }, { name: 'jr 2' }],
        children: []
    }]
}, {
    id: 2,
    name: 'Erika Mustermann',
    wage: 12,
    birthyear: 1992,
    address: {
        street: 'Second Street 2',
        city: 'Hamburg'
    },
    tags: [{ name: 'erika' }, { name: 'mustermann' }],
    children: [{
        id: 4,
        name: 'Erika Jr.',
        wage: 6,
        birthyear: 2015,
        address: {
            street: 'Second Street 4',
            city: 'Munich'
        },
        tags: [{ name: 'erika' }, { name: 'jr' }],
        children: []
    }]
}]

function insertPersons(persons, parentId = null) {
    for (const person of persons) {
        database.tables.persons.data.push({
            id: person.id,
            parentId,
            name: person.name,
            wage: person.wage,
            birthyear: person.birthyear,
            street: person.address?.street || '',
            city: person.address?.city || '',
            tags: person.tags || []
        })
        
        insertPersons(person.children || [], person.id)
    }
}

insertPersons(fakeServerData)

function toPerson(row) {
    return {
        id: row.id,
        name: row.name,
        wage: row.wage,
        birthyear: row.birthyear,
        address: {
            street: row.street,
            city: row.city
        },
        tags: row.tags || [],
        children: []
    }
}

function getSearchResultTree(searchNamePattern) {
    const rowsById = new Map(
        database.tables.persons.data.map((row) => [row.id, row])
    )
    const selectedRows = new Map()

    const matches = database.exec(
        'SELECT * FROM persons WHERE name LIKE ?',
        [`%${searchNamePattern}%`]
    )

    for (const match of matches) {
        for (let row = match; row; row = rowsById.get(row.parentId)) {
            selectedRows.set(row.id, row)
        }
    }

    const personsById = new Map(
        Array.from(selectedRows.values(), (row) => [row.id, toPerson(row)])
    )

    for (const row of selectedRows.values()) {
        personsById.get(row.parentId)?.children.push(personsById.get(row.id))
    }

    return Array.from(selectedRows.values())
        .filter((row) => !personsById.has(row.parentId))
        .map((row) => personsById.get(row.id))
}

export function getPersons(parentId = null, searchNamePattern = undefined, start = 0, limit = 1) {
    const persons = searchNamePattern?.trim()
        ? getSearchResultTree(searchNamePattern.trim())
        : (parentId === null
        ? database.exec('SELECT * FROM persons WHERE parentId IS NULL')
        : database.exec('SELECT * FROM persons WHERE parentId = ?', [parentId]))
            .map(toPerson)
    const items = persons.slice(start, start + limit)

    return {
        items,
        hasMore: start + items.length < persons.length
    }
}

export function savePersons(persons, parentId = null) {
    for (const person of persons) {
        const values = {
            id: person.id,
            parentId,
            name: person.name,
            wage: person.wage,
            birthyear: person.birthyear,
            street: person.address?.street || '',
            city: person.address?.city || '',
            tags: structuredClone(person.tags || [])
        }
        const row = database.tables.persons.data.find((item) => item.id === person.id)

        if (row) {
            Object.assign(row, values)
        } else {
            database.tables.persons.data.push(values)
        }

        savePersons(person.children || [], person.id)
    }
}

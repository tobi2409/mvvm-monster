const DependencyResolver = (function () {
    function findMatchingDependencies(fullKey, dependencies, visited = new Set()) {
        if (visited.has(fullKey)) {
            return []
        }

        visited.add(fullKey)

        const matches = []

        if (dependencies[fullKey]) {
            matches.push(...dependencies[fullKey])
        }

        for (const [dependencyKey, dependencyValue] of Object.entries(dependencies)) {
            if (fullKey.startsWith(dependencyKey + '.')) {
                const suffix = fullKey.substring(dependencyKey.length)
                for (const dependent of dependencyValue) {
                    matches.push(dependent + suffix)
                }
            }
        }

        const allMatches = [...matches]
        for (const match of matches) {
            const transitive = findMatchingDependencies(match, dependencies, visited)
            allMatches.push(...transitive)
        }

        return [...new Set(allMatches)]
    }

    return { findMatchingDependencies }
})()

export default DependencyResolver
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = path.join(root, 'src')
const testsRoot = path.join(root, 'tests')

const layers = new Map([
    ['identity/uuid-item-map.js', 0],
    ['transforms/reverse-transform-evaluator.js', 0],
    ['dom/dom.js', 0],
    ['dom/node-holders.js', 0],
    ['reactivity/journal-control.js', 0],
    ['reactivity/dependency-resolver.js', 0],
    ['reactivity/reactivity-frame.js', 0],
    ['resolution/alias-resolver.js', 0],
    ['collections/array-helpers.js', 0],
    ['collections/expand-handler.js', 0],
    ['collections/paginator.js', 0],
    ['resolution/key-resolver.js', 1],
    ['reactivity/model-journal.js', 1],
    ['model/viewmodel-item-preparation.js', 1],
    ['model/model-synchronization.js', 2],
    ['model/viewmodel-array.js', 2],
    ['dataloaders/data-loader.js', 1],
    ['dataloaders/mvvm-data-loader.js', 3],
    ['rendering/default-node-attributes.js', 2],
    ['rendering/render-engine.js', 3],
    ['rendering/refresh-engine.js', 4],
    ['rendering/refresh-delegator.js', 5],
    ['rendering/notifier.js', 6],
    ['template-engine.js', 7]
])

async function getJavaScriptFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = await Promise.all(entries.map((entry) => {
        const entryPath = path.join(directory, entry.name)
        return entry.isDirectory() ? getJavaScriptFiles(entryPath) : [entryPath]
    }))
    return files.flat().filter((file) => file.endsWith('.js'))
}

async function getSrcImports(file) {
    const source = await readFile(file, 'utf8')
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1])
    return imports
        .filter((specifier) => specifier.startsWith('.'))
        .map((specifier) => path.relative(srcRoot, path.resolve(path.dirname(file), specifier)).replaceAll(path.sep, '/'))
        .filter((importedFile) => layers.has(importedFile))
}

describe('module architecture', () => {
    test('production modules only import lower abstraction layers', async () => {
        assert.equal(layers.size, (await getJavaScriptFiles(srcRoot)).length, 'Every source module must have an assigned layer')

        for (const [module, layer] of layers) {
            for (const dependency of await getSrcImports(path.join(srcRoot, module))) {
                assert.ok(layers.get(dependency) < layer, `${module} must not import same/higher layer ${dependency}`)
            }
        }
    })

    test('tests import one subject and only lower-layer collaborators', async () => {
        for (const testFile of await getJavaScriptFiles(testsRoot)) {
            if (testFile === fileURLToPath(import.meta.url)) {
                continue
            }

            const imports = await getSrcImports(testFile)
            assert.ok(imports.length > 0, `${path.relative(root, testFile)} must import its subject`)

            const subject = imports.find((importedFile) => path.basename(importedFile, '.js') === path.basename(testFile, '.test.js'))
            assert.ok(subject, `${path.relative(root, testFile)} must import a matching subject module`)

            for (const dependency of imports.filter((importedFile) => importedFile !== subject)) {
                assert.ok(layers.get(dependency) < layers.get(subject), `${path.relative(root, testFile)} must not import same/higher layer ${dependency}`)
            }
        }
    })
})

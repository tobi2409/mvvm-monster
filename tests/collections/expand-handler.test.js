import test from 'node:test'
import assert from 'node:assert/strict'

import ExpandHandler from '../../src/collections/expand-handler.js'

test('loads children once and toggles expansion', () => {
    const loadedParents = []
    const expand = ExpandHandler.create((parent) => loadedParents.push(parent))
    const parent = { expanded: false, childrenLoaded: false }

    expand(undefined, parent)
    expand(undefined, parent)

    assert.deepEqual(loadedParents, [parent])
    assert.deepEqual(parent, { expanded: false, childrenLoaded: true })
})

test('supports custom state attributes', () => {
    let loadCount = 0

    const expand = ExpandHandler.create(() => loadCount++, {
        expandedAttribute: 'isExpanded',
        childrenLoadedAttribute: 'hasLoadedChildren'
    })
    
    const parent = { isExpanded: false, hasLoadedChildren: false }

    expand(undefined, parent)

    assert.equal(loadCount, 1)
    assert.deepEqual(parent, { isExpanded: true, hasLoadedChildren: true })
})
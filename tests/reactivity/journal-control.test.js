import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as sleep } from 'node:timers/promises'
import JournalControl from '../../src/reactivity/journal-control.js'

describe('JournalControl', () => {
    test('disables journaling for synchronous and nested scopes', () => {
        const result = JournalControl.withoutJournaling(() => {
            assert.equal(JournalControl.isJournalingDisabled(), true)

            JournalControl.withoutJournaling(() => {
                assert.equal(JournalControl.isJournalingDisabled(), true)
            })

            assert.equal(JournalControl.isJournalingDisabled(), true)
            return 'result'
        })

        assert.equal(result, 'result')
        assert.equal(JournalControl.isJournalingDisabled(), false)
    })

    test('keeps journaling disabled until an asynchronous scope settles', async () => {
        await JournalControl.withoutJournaling(async () => {
            await sleep(2000)
            assert.equal(JournalControl.isJournalingDisabled(), true)
        })

        assert.equal(JournalControl.isJournalingDisabled(), false)
    })
})
const JournalControl = (function () {
    let journalingDisabledDepth = 0

    function isJournalingDisabled() {
        return journalingDisabledDepth > 0
    }

    function withoutJournaling(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('[JournalControl] withoutJournaling expected "callback" to be a function')
        }

        journalingDisabledDepth++

        try {
            const result = callback()

            if (result && typeof result.then === 'function') {
                return Promise.resolve(result).finally(() => journalingDisabledDepth--)
            }

            journalingDisabledDepth--
            return result
        } catch (error) {
            journalingDisabledDepth--
            throw error
        }
    }

    return {
        withoutJournaling,
        isJournalingDisabled
    }
})()

export default JournalControl
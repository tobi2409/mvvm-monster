const ReverseTransformEvaluator = (function () {

    function evaluate(value) {
        if (typeof value === 'function') {
            return evaluate(value())
        }

        if (Array.isArray(value)) {
            return value.map(evaluate)
        }

        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) =>
                [key, evaluate(nestedValue)]))
        }

        return value
    }

    return { evaluate }
})()

export default ReverseTransformEvaluator
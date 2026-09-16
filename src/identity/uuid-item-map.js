const UuidItemMap = (function () {
    const uuidToItemMap = new Map()
    const itemToUuidMap = new WeakMap()

    function setItemByUuid(uuid, item) {
        uuidToItemMap.set(uuid, item)
    }

    function getItemByUuid(uuid) {
        return uuidToItemMap.get(uuid)
    }

    function setUuidByItem(item, uuid) {
        itemToUuidMap.set(item, uuid)
    }

    function getUuidByItem(item) {
        return itemToUuidMap.get(item)
    }

    function ensureUuidForItem(item) {
        if (!item || typeof item !== 'object') {
            return undefined
        }

        const uuid = getUuidByItem(item) || `__uuid__${crypto.randomUUID()}`
        setItemByUuid(uuid, item)
        setUuidByItem(item, uuid)
        return uuid
    }

    return {
        setItemByUuid,
        getItemByUuid,
        setUuidByItem,
        getUuidByItem,
        ensureUuidForItem
    }
})()

export default UuidItemMap
// DOM Utilities: Mounting and DOM operations

const DomUtils = (function () {
    function mount(node, mountNode, insertBeforeAnchor = undefined) {
        if (insertBeforeAnchor) {
            mountNode.insertBefore(node, insertBeforeAnchor)
        } else {
            mountNode.appendChild(node)
        }
    }

    return {
        mount
    }
})()

export default DomUtils

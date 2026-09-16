# mvvm-monster

A lightweight reactive MVVM framework for declarative HTML, synchronized
model/view-model collections, and targeted DOM updates.

## Features

- Declarative templates with custom tags: `<get>`, `<each>`, `<if>`, `<template-use>`
- Reactive updates without full re-rendering
- Dependency-based refresh chaining (`dependencies` map)
- Efficient key-to-node tracking via internal node holders
- Nested context support for scoped access inside loops
- Array update support: `push`, `pop`, `shift`, `unshift`, `splice`
- Mapped model/view-model arrays with local state and prepared item insertion
- Optional model change journaling with `ModelJournal`

## Installation

```js
import TemplateEngine from '@tobi2409/mvvm-monster'
import ViewModelArray from '@tobi2409/mvvm-monster/viewmodel-array'
import ModelJournal from '@tobi2409/mvvm-monster/model-journal'
import DataLoader from '@tobi2409/mvvm-monster/data-loader'
```

## Examples (start here)

Browse the live demo files in the [GitHub repository](https://github.com/tobi2409/mvvm-monster/tree/main/examples).

Featured demos:

- [MVVM example](examples/mvvm/index.html)
- [Recursive template example](examples/recursive-template/index.html)

Interesting snippets from those demos:

### MVVM: computed fields + dependency chaining

```js
import TemplateEngine from '@tobi2409/mvvm-monster'
import ViewModelArray from '@tobi2409/mvvm-monster/viewmodel-array'

const viewModel = TemplateEngine.reactive({
  get fullName() {
    return `${this.firstName} ${this.lastName}`
  },
  get showWage() {
    return this.wage > 600
  },
  get fullInfo() {
    return `${this.fullName} earns $${this.wage}`
  },
  getBeautifiedData() {
    return ViewModelArray.get(
      model.rawPersonData,
      (p) => ({
        id: p.id,
        name: p.name,
        age: new Date().getFullYear() - p.birthyear,
        showEdit: false
      }),
      (item) => ({
        id: () => item.id,
        name: () => item.name,
        birthyear: () => new Date().getFullYear() - item.age
      }),
      { age: 'birthyear' }
    )
  }
}, document.getElementById('app-template-use'), {
  firstName: ['fullName'],
  lastName: ['fullName'],
  wage: ['showWage', 'fullInfo'],
  fullName: ['fullInfo']
})
```

Notes:

- Keeps stable mapped object identity per source item (internal cache).
- Supports `push`, `pop`, `shift`, `unshift`, `splice` via source synchronization.
- Add/insert/remove operations on mapped arrays are propagated back to the source model when `reverseTransform` is provided.

### Recursive template: self-referencing `<template-use>`

```html
<template id="folder-template">
  <each of="*list" as="item#">
    <li>
      📁 <get>item#.name</get>
      <ul>
        <template-use template-id="folder-template" data-list="item#.children"></template-use>
      </ul>
    </li>
  </each>
</template>
```

```js
toggleEdit: (e, dataElement) => {
  dataElement.editing = !dataElement.editing
},
delete: (e, dataElement, _, contextStack) => {
  const parent = contextStack.get(`item-level-${contextStack.size - 3}`)
  if (parent?.data?.children) {
    const index = parent.data.children.findIndex((c) => c === dataElement)
    if (index !== -1) parent.data.children.splice(index, 1)
  }
}
```

> The examples use local file paths and are intended to be run directly from the cloned repository. To try them out, clone the repo and open the HTML files in a browser:
>
> ```bash
> git clone https://github.com/tobi2409/mvvm-monster.git
> cd mvvm-monster
> ```

## Quick Start

### 1) Define a `<template>`

```html
<template id="user-template">
  <div class="user">
    <h2><get>name</get></h2>
    <p>Email: <get>email</get></p>

    <h3>Posts</h3>
    <each of="posts" as="post">
      <div class="post">
        <strong><get>post.title</get></strong>
        <p><get>post.content</get></p>
      </div>
    </each>
  </div>
</template>

<div id="mount-point"></div>
<template-use template-id="user-template" mount-id="mount-point"></template-use>
```

### 2) Initialize reactivity

```js
const templateUse = document.querySelector('template-use')

const data = TemplateEngine.reactive(
  {
    name: 'Alice',
    email: 'alice@example.com',
    posts: [
      { title: 'First Post', content: 'Hello World!' },
      { title: 'Second Post', content: 'Learning TemplateEngine' }
    ]
  },
  templateUse
)
```

### 3) Update data

```js
data.name = 'Alice Smith'
data.posts.push({ title: 'Third Post', content: 'Advanced features!' })
data.posts.splice(1, 0, { title: 'Inserted Post', content: 'In the middle!' })
```

## Template Syntax

### `<get>key</get>`

Renders a value from data/context.

```html
<get>user.name</get>
```

### `<each of="array" as="item">...</each>`

Loops over an array.

```html
<each of="users" as="user">
  <div><get>user.name</get></div>
</each>
```

> **Note:** Array items must be **objects**, not primitive values (strings, numbers, booleans).
> The engine uses a `WeakMap` internally to track item identity, which requires object references.
>
> ❌ Primitives are not supported:
> ```js
> data.tags = ['news', 'tech', 'sports']
> ```
>
> ✅ Wrap primitives in objects instead:
> ```js
> data.tags = [
>   { value: 'news' },
>   { value: 'tech' },
>   { value: 'sports' }
> ]
> ```
> ```html
> <each of="tags" as="tag">
>   <span><get>tag.value</get></span>
> </each>
> ```

### `<if test="expr">...</if>`

Conditionally renders content.

```html
<if test="isVisible">
  <span>Visible content</span>
</if>
```

### `<template-use ...></template-use>`

Mounts a `<template>` by ID.

```html
<template-use template-id="user-template" mount-id="mount-point"></template-use>
```

## API

### `TemplateEngine.reactive(data, templateUseNode, dependencies?)`

Creates a reactive view-model around `data` using `Object.defineProperties(...)` and binds updates to DOM nodes generated from the referenced `<template>`.

- `data`: source model object
- `templateUseNode`: `<template-use>` element
- `dependencies` (optional): dependency map for related refresh triggers

Returns: reactive view-model object

## Known limitation: object replacement notifications

Replacing a nested object does not automatically notify all child keys. These patterns are currently not sufficient on their own:

```js
d.person.address = { city: 'Köln' }
d.selectedPerson = { name: 'Mia' }
```

Use an explicit child assignment afterwards to trigger the child-key refresh:

```js
d.person.address = { city: 'Köln' }
d.person.address.city = 'Köln'

d.selectedPerson = { name: 'Mia' }
d.selectedPerson.name = 'Mia'
```

## Dependencies

Use the optional `dependencies` map when one property affects other derived properties.

```js
const raw = { firstName: 'Alice', lastName: 'Smith' }

const data = TemplateEngine.reactive(
  {
    get firstName() { return raw.firstName },
    set firstName(v) { raw.firstName = v },
    get fullName() { return `${raw.firstName} ${raw.lastName}` }
  },
  document.querySelector('template-use'),
  {
    firstName: ['fullName']
  }
)

data.firstName = 'Bob' // triggers refresh for firstName and fullName
```

Why this matters:

- Keeps derived values in sync without manual DOM handling.
- Makes reactive chains explicit and maintainable.
- Works well for computed/display-only fields.

## ViewModelArray

`ViewModelArray.get(modelArray, transform, reverseTransform?, propertyMapping?, state?)`
maps model items to view-model items and keeps the mapped array associated with
its source array. It returns a stable `{ data, state }` container.

```js
import ViewModelArray from '@tobi2409/mvvm-monster/viewmodel-array'

const viewModelPersons = ViewModelArray.get(
  model.persons,
  (person) => ({
    id: person.id,
    name: person.name,
    age: new Date().getFullYear() - person.birthyear
  }),
  (person) => ({
    id: () => person.id,
    name: () => person.name,
    birthyear: () => new Date().getFullYear() - person.age
  }),
  { age: 'birthyear' }
)
```

Arguments:

- `modelArray`: source array containing model objects.
- `transform`: required function that creates a view-model item.
- `reverseTransform`: optional function used to synchronize view-model changes back to the model. Its returned properties should be functions, so only the properties affected by a partial update need to be evaluated. It defaults to the identity transformation.
- `propertyMapping`: optional object mapping view-model property names to model property names, for example `{ age: 'birthyear' }`.
- `state`: optional object for UI state and actions associated with this mapped array.

The returned `data` array is used by `<each>`. The returned `state` object can
hold controls that do not belong to model items:

```js
const persons = ViewModelArray.get(
  model.persons,
  transformPerson,
  reverseTransformPerson,
  { age: 'birthyear' },
  {
    newPerson: { name: '' },
    expanded: true
  }
)

persons.data.push({ id: 1, name: 'Alice', age: 30 })
persons.state.newPerson.name = 'Bob'
```

Because `ViewModelArray.get` caches by `modelArray`, repeated calls return the
same container. The `transform`, `reverseTransform`, `propertyMapping`, and
`state` from the first call remain in use.

`ViewModelArray.get` caches the mapped array for a source array and preserves
mapped item identity. Array operations such as `push`, `pop`, `shift`,
`unshift`, and `splice` can therefore be rendered reactively and synchronized
back to the model when `reverseTransform` is provided. For partial property
updates, the functions returned by `reverseTransform` prevent unrelated model
properties from being recalculated.

### Preparing incomplete view-model items

`ViewModelArray.prepareItem(viewModelArrayData, preparedViewModelItem)` converts
an incomplete view-model item to a model item and then applies the normal
forward transform. It returns both objects without inserting them:

```js
const { modelItem, viewModelItem } = ViewModelArray.prepareItem(persons.data, {
  name: 'Alice',
  age: 30
})
```

For insertion into a reactive mapped array, pass the preparation flag as the
last array argument. The options object itself is not inserted:

```js
persons.data.push(
  { name: 'Alice', age: 30 },
  { extraArrayParams: { preparedViewModelItem: true } }
)
```

The same options format works with `unshift` and `splice`. The engine prepares
every inserted item before rendering and synchronizes the corresponding model
items. Use this only for items that still need the mapped array's reverse and
forward transforms; ordinary complete view-model items can be inserted without
the flag.

## DataLoader

`DataLoader.load` applies fetched data to one directly rendered model array.

```js
import DataLoader from '@tobi2409/mvvm-monster/data-loader'

DataLoader.load(
  result.items,
  parent,
  rootData,
  append
)
```

Use `ExpandHandler.create(loadData)` for lazy child loading and expanded-state
toggling.

```js
import ExpandHandler from '@tobi2409/mvvm-monster/expand-handler'

const expand = ExpandHandler.create((parent) => loadChildren(parent))
```

`MVVMDataLoader` provides the corresponding API when model and view model are
separate. It updates the model array and transforms the loaded items into the
view-model array.

```js
import MVVMDataLoader from '@tobi2409/mvvm-monster/mvvm-data-loader'

MVVMDataLoader.load(
  result.items,
  viewModelParent,
  modelParent,
  rootViewModelArray,
  rootModelArray,
  append
)
```

## ModelJournal

`ModelJournal.reactive(data, identifierProperty?)` instruments a model and logs
property and array changes to `console.log`. Array paths use `id` by default;
pass another identifier property when required.

```js
import ModelJournal from '@tobi2409/mvvm-monster/model-journal'

const model = ModelJournal.reactive({
  persons: [{ personId: 'p1', name: 'Alice' }]
}, 'personId')

model.persons[0].name = 'Alicia'
// { fullKey: 'persons.p1.name', change: { operation: 'set', value: 'Alicia' } }
```

Use `ModelJournal.withoutJournaling(callback)` for changes that should not be
logged. `ModelJournal.isJournalingDisabled()` reports whether such a scope is
currently active.

```js
await ModelJournal.withoutJournaling(async () => {
  model.persons.push({ personId: 'p2', name: 'Bob' })
})
```

## Internal architecture

Internal dependencies follow one direction:

- `identity`, `transforms`, and `dom`: focused import-free primitives.
- `resolution`: key and alias resolution built on stable item identity.
- `reactivity` and `model`: observation and model/view-model synchronization.
- `rendering`: initial rendering followed by refresh, delegation, and notification.
- `dataloaders` and `collections`: public data-loading and collection utilities.
- `template-engine.js`: the top-level composition root.

Production imports point only to explicitly lower abstractions. Tests mirror the
source areas and may import their subject plus lower-level collaborators, never
a peer or a higher-level module.

Refresh orchestration belongs to `Notifier`; the pure `DependencyResolver` only
calculates matching dependency keys. Lower layers therefore never import the
rendering layer.

## Technical background: NodeHolders and UUID identity

- **NodeHolders:** The engine tracks which DOM nodes depend on a particular "full key" using a segmented Map managed by the node-holders utility ([src/dom/node-holders.js](src/dom/node-holders.js)). Full keys (for example `users.3.name` or `item#.children.2.title`) are split into segments and stored in nested Maps; the leaf entries contain arrays of node-holders that reference that full key. When a property changes the engine builds the full key and looks up any matching holders to refresh — this enables targeted updates without scanning the entire DOM.

- **UUID / item identity:** For arrays the engine keeps stable per-item identities using a WeakMap-backed id cache (see [src/identity/uuid-item-map.js](src/identity/uuid-item-map.js)). When rendering `<each>` the engine assigns each object a stable id so that moving, inserting, or deleting items preserves existing DOM nodes for unchanged items. That reduces DOM churn and keeps per-item state (inputs, event handlers) stable across array mutations.

- **Benefits:** targeted refreshes for changed keys, minimal DOM re-creation, efficient nested/context lookups, and stable per-item state during array operations.

- **Caveats:** identity tracking requires array items to be objects (not primitives). Also, replacing a nested object does not automatically notify child keys — use explicit child-key assignments when needed (see "Known limitation: object replacement notifications").

References:
- Node holder implementation: [src/dom/node-holders.js](src/dom/node-holders.js)
- Mapped array helper: [src/model/viewmodel-array.js](src/model/viewmodel-array.js)
- Item identity helper: [src/identity/uuid-item-map.js](src/identity/uuid-item-map.js)
- Initial rendering and refresh dispatch: [src/rendering/render-engine.js](src/rendering/render-engine.js) and [src/rendering/refresh-delegator.js](src/rendering/refresh-delegator.js)

## Development

Run tests:

```bash
npm test
```

## Status

Active development — API may evolve.
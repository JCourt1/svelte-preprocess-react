[![svelte-preprocess-react](./static/svelte-preprocess-react.svg)](https://www.npmjs.com/package/svelte-preprocess-react)

# Svelte Preprocess React

Seamlessly use React components inside a Svelte app

Supports:

- Nesting (Slot & Children)
- Contexts
- SSR
- Hooks ([useStore](./docs/useStore.md) & [hooks](./docs/hooks.md))

# "Embrace, extend and extinguish"

This preprocessor is intended as temporary solution when migrating an existing large React codebase or when a third-party hasn't yet provided a Svelte adapter.  
After you've gradually converted all components to Svelte you can remove this preprocessor from your setup.

## Using React inside Svelte components

> Embrace

Inside the Svelte template prepend the name of the component with `react:` prefix.

Instead of `<Button>`, you'd write `<react:Button>`

You're also able to use libraries from the react ecosystem, react-youtube for example:

```svelte
<script>
  import YouTube from "react-youtube";
</script>

<react:YouTube videoId="AdNJ3fydeao" />
```

The snippet above would be generate:

```svelte
<script>
  import sveltify from "svelte-preprocess-react/sveltify";
  import { createPortal } from "react-dom";
  import ReactDOM from "react-dom/client";
  import { renderToString } from "react-dom/server";
  import YouTube from "react-youtube";

  const React$YouTube = sveltify(
    YouTube,
    createPortal,
    ReactDOM,
    renderToString
  );
</script>

<React$YouTube videoId="AdNJ3fydeao" />
```

## Setup

```sh
npm install svelte-preprocess-react
```

```js
// svelte.config.js
import preprocessReact from "svelte-preprocess-react/preprocessReact";

export default {
  preprocess: preprocessReact(),
};
```

When using other processors like [svelte-preprocess]() use:

```js
// svelte.config.js
import preprocess from "svelte-preprocess";
import preprocessReact from "svelte-preprocess-react/preprocessReact";

export default {
  preprocess: preprocessReact({
    preprocess: preprocess({ sourceMap: true }),
  }),
};
```

svelte-preprocess-react is a _markup_ preprocessor, these run before the _script_ preprocessors,
The preprocessor that is passed as an option is applied before running the preprocessReact preprocessor.

## Using Svelte inside React components

> Extend

Once you've converted a React component to Svelte, you'd want delete that React component, but some if other React components depended on that component you can use `reactify` to use the new Svelte component as a React component.

```jsx
import { reactify } from "svelte-preprocess-react";
import ButtonSvelte from "../components/Button.svelte";

const Button = reactify(ButtonSvelte);

function MyComponent() {
  return <Button onClick={() => console.log("clicked")}>Click me</Button>;
}
```

## Using multiple frameworks is a bad idea

> Extinguish

Using multiple frontend frameworks add overhead both in User and Developer experience.

- Increased download size
- Slower (each framework boundary adds overhead)
- Context switching, keeping the intricacies of both Svelte and React in your head slows down development

svelte-preprocess-react is a migration tool, it can be used to migrate _from_ or _to_ React, it's not a long term solution.

# More info

- [reactify()](./docs/reactify.md) Convert a Svelte component into an React component
- [hooks()](./docs/hooks.md) Using React hooks inside Svelte components
- [useStore](./docs/useStore.md) Using a Svelte Store in a React components
- [react-router](./docs/react-router.md) Migrate from react-router to SvelteKit
- [Architecture](./docs/architecture.md) svelte-preprocess-react's API Design-principles and System architecture

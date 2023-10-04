# Requirements

- npm, pnpm, or yarn (pnpm is recommended)

# Installation

`npm install` or `pnpm install`

## Usage

Create a .env file with a SERVER_HOST variable that points to a running server instance, such as:

```console
SERVER_HOST=http://127.0.0.1:8000
```

then

```console
npm run dev
```

## Building

To create a production version of your app:

```console
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

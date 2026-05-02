# NEPON Headsup — modern Vite version

Это современная версия текущего статического `dist` без старых зависимостей `react-scripts`, `firebase`, `grpc`, `node-sass`.

## Запуск локально

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
```

Готовая папка для Cloudflare Pages появится здесь:

```txt
dist
```

## Деплой на Cloudflare Pages через Wrangler

```bash
nvm use 20
npx wrangler login
npx wrangler pages deploy dist --project-name nepon-headsup
```

Дизайн и логика взяты из присланного `dist/index.html`, код только разложен на `src/styles.css` и `src/main.js`.

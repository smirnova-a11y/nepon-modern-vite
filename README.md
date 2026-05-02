# NEPON — modern Vite version

Это безопасная современная версия, собранная из текущего готового `dist`.
Дизайн и логика сохранены: категории, игра, настройки, localStorage, свайпы/наклон и импорт слов перенесены из текущего `index.html`.

## Запуск локально

```bash
npm install
npm run dev
```

Открой адрес, который покажет Vite, обычно: `http://localhost:5173`.

## Сборка

```bash
npm run build
```

Готовая папка появится здесь:

```txt
dist
```

## Деплой на Cloudflare Pages

Требуется Node 20+ для Wrangler:

```bash
nvm use 20
npm run build
npx wrangler pages deploy dist --project-name nepon-headsup
```

Важно: для Cloudflare загружай именно собранную папку `dist`, а не весь проект.

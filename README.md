# ROBO BOX
Локально: `npm install && npm run cert && npm start`.
Облако: GitHub → Render (Blueprint, render.yaml). HTTPS и wss на Render уже есть, cert не нужен.
База: выполнить schema.sql в Supabase; в Render задать SUPABASE_URL и SUPABASE_SERVICE_KEY (ключ только на сервере, не в GitHub).
Без этих переменных игра работает, просто результаты боёв не сохраняются.

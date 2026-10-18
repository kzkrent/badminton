# Турниры по бадминтону

Требования — в [SPEC.md](SPEC.md).

## Запуск

1. **Supabase.** Создайте проект на supabase.com.
   - SQL Editor → выполните [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql).
   - В [supabase/seed_owner.sql](supabase/seed_owner.sql) замените email на свой и выполните.
   - Authentication → URL Configuration: Site URL — адрес сайта; в Redirect URLs добавьте
     `http://localhost:3000/auth/confirm` и `https://<ваш-домен>/auth/confirm`.
2. **Переменные окружения.** Скопируйте `.env.example` в `.env.local` и заполните из
   Supabase → Project Settings → API.
3. **Локально:**
   ```bash
   npm install
   npm run dev
   ```
   Откройте http://localhost:3000.
4. **Vercel.** Импортируйте репозиторий, добавьте те же переменные окружения.

## Структура

- `src/app/[locale]/` — страницы (ru/en)
- `src/app/actions/` — серверные действия (вход, игроки, администраторы)
- `src/lib/` — Supabase-клиенты, роли, утилиты игроков
- `messages/` — переводы
- `supabase/` — схема БД и политики доступа

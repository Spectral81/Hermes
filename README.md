# UTEQ Seguridad

Monorepo: app móvil (Expo), panel web (Next.js en **Railway**) y Supabase (auth + perfiles).

## Arquitectura en la nube

| Servicio | Dónde |
|----------|-------|
| Web (login, registro, panel) | **Railway** |
| Auth + base de datos | **Supabase** (free) |
| App móvil | Expo Go / build local → apunta a Supabase |

## 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor** → ejecutar `supabase/migrations/001_profiles.sql`.
3. **Authentication → Providers → Email**: activar email + **Confirm email**.
4. **Authentication → URL Configuration** (usar tu URL de Railway):
   - **Site URL:** `https://TU-APP.up.railway.app`
   - **Redirect URLs:**
     - `https://TU-APP.up.railway.app/auth/callback`
     - `https://TU-APP.up.railway.app/login`
     - `uteq-seguridad://**`
5. Copiar **Project URL** y **anon key** (Settings → API).

## 2. Railway

1. Crear cuenta en [railway.app](https://railway.app).
2. **New Project → Deploy from GitHub repo** (conectar este repositorio).
3. Railway detecta `railway.toml` en la raíz y despliega `apps/web`.
4. En **Settings → Networking → Generate Domain** → obtienes `https://xxxx.up.railway.app`.
5. En **Variables**, agregar:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu anon key |
| `NEXT_PUBLIC_APP_URL` | `https://xxxx.up.railway.app` |

> Railway inyecta `PORT` automáticamente. No hace falta configurarlo.

6. Actualizar **Site URL** y **Redirect URLs** en Supabase con el dominio real de Railway.
7. Cada push a la rama conectada redeploya la web.

### Redeploy manual

Dashboard Railway → servicio → **Deploy** → **Redeploy**.

## 3. App móvil (Expo)

La móvil usa Supabase directamente (no Railway). Crear `.env` en la raíz:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm install
npm run dev:mobile
```

## Rutas web (Railway)

| Ruta | Descripción |
|------|-------------|
| `/login` | Iniciar sesión |
| `/register` | Registro |
| `/verify-email` | Aviso post-registro |
| `/auth/callback` | Confirmación email (Supabase) |
| `/dashboard` | Panel (requiere sesión) |

## Registro

- Solo `@uteq.edu.mx`
- Verificación por email → redirige a `/auth/callback` → `/dashboard`
- Perfil en tabla `profiles` vía trigger SQL

## Estructura

```
apps/web/          Next.js → Railway
apps/mobile/       Expo → Supabase
packages/shared/   Validaciones compartidas
supabase/          Migraciones SQL
railway.toml       Config deploy Railway
```

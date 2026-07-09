# HERMES UTEQ - Flutter Mobile (Phase 1)

This Flutter app replaces the Expo mobile app while keeping the same backend:

- Supabase auth/session
- Railway APIs (`/api/auth/*`, `/api/incidents*`)
- Shared business rules ported from `packages/shared/src/index.ts`

## Environment

Create `apps/mobile_flutter/.env` from `.env.example`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
WEB_API_URL=https://web-production-10a1.up.railway.app
```

You can also use `--dart-define`:

```bash
flutter run \
  --dart-define=SUPABASE_URL=https://your-project.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your-anon-key \
  --dart-define=WEB_API_URL=https://web-production-10a1.up.railway.app
```

## Run

```bash
cd apps/mobile_flutter
flutter pub get
flutter run
```

## Current parity scope (Phase 1)

- Auth: welcome, login, register, verify screen
- App shell: tabs (map, alerts, profile)
- Incidents: list/fetch, create report, detail, validate, like toggle
- Profile: show account + own reports + sign out

## QA checklist

1. **Auth login**: valid and invalid credentials against production API.
2. **Register**: validates matrícula/email/password with same messages as current app.
3. **Map**: loads incidents, filters by type, opens detail, validates reports.
4. **Create incident**: from map FAB, verify incident appears in map and alerts list.
5. **Alerts tab**: distance sorting (if location available), detail navigation.
6. **Validate flow**: increments likes and updates progress.
7. **Profile**: shows active user email and own reports.
8. **Sign out**: returns to `/auth`.

## Cutover plan

1. Keep `apps/mobile` as fallback during internal testing.
2. Validate all QA checklist items in Flutter (Android first, then iOS).
3. Freeze feature development in Expo app.
4. Publish Flutter build to testers.
5. Switch release channel to Flutter app once parity is accepted.

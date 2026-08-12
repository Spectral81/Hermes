# Pulsera SOS (ESP32)

1. Ejecuta en Supabase el SQL: `supabase/migrations/010_wearable_devices.sql`
2. En `.env.local` / Railway agrega `WEARABLE_SOS_KEY=...`
3. En el `.ino` configura WiFi, `DEVICE_CODE`, `SOS_KEY` (igual a `WEARABLE_SOS_KEY`) y `API_URL`
4. El alumno vincula ese `DEVICE_CODE` en Perfil → Pulsera SOS
5. Al pulsar el botón, se crea un incidente `panico` a nombre de ese alumno

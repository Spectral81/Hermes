# Desarrollo móvil con Expo Go (varios dispositivos)

## Varias personas escaneando el QR

Por defecto usa **LAN** (misma red Wi‑Fi):

```bash
cd apps/mobile
npm run start
```

Requisitos:
1. PC y teléfonos en la **misma red Wi‑Fi** (no datos móviles).
2. Windows: permitir **Node.js** en el firewall cuando lo pida.
3. Cada dispositivo escanea el mismo QR con **Expo Go** (Android/iOS).

## Si un dispositivo no carga

| Síntoma | Solución |
|--------|----------|
| Otro Wi‑Fi o datos móviles | `npm run start:tunnel` (más lento, funciona entre redes) |
| Solo funciona en el PC | No uses `localhost`; usa `start` o `start:lan` |
| Pantalla en blanco / timeout | Reinicia con `npm run start:lan` y recarga en Expo Go |
| Error de red al login | Revisa `EXPO_PUBLIC_SUPABASE_URL` en `apps/mobile/.env` |

## Comandos

| Comando | Uso |
|---------|-----|
| `npm run start` | LAN — **recomendado** para varios dispositivos en campus/oficina |
| `npm run start:tunnel` | Internet vía ngrok — cuando no están en la misma red |
| `npm run start:localhost` | Solo emulador en la misma PC |

## Nota

Expo Go permite **múltiples dispositivos** conectados al mismo bundler. Si falla, casi siempre es red/firewall o modo `localhost` en lugar de LAN.

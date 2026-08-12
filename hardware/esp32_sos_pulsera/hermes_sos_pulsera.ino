/*
 * HERMES — Pulsera SOS (ESP32)
 *
 * 1. Instala: WiFi, HTTPClient, ArduinoJson, WiFiClientSecure (incluido en ESP32).
 * 2. Cambia WIFI, DEVICE_CODE, SOS_KEY y API_URL.
 * 3. DEVICE_CODE debe coincidir con el que el alumno escribe en Perfil → Vincular pulsera.
 * 4. SOS_KEY debe ser igual a WEARABLE_SOS_KEY en Railway / .env.local.
 * 5. Botón entre GPIO 4 y GND (INPUT_PULLUP).
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// --- WiFi del campus / hotspot ---
const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASS = "TU_PASSWORD";

// --- Identidad de ESTA pulsera (escríbela también en una etiqueta) ---
const char* DEVICE_CODE = "HMS-A1B2";

// --- Misma clave que WEARABLE_SOS_KEY en el servidor ---
const char* SOS_KEY = "cambia-esta-clave-secreta";

// --- API HERMES (Railway o tu IP local) ---
const char* API_URL = "https://web-production-10a1.up.railway.app/api/sos/device";

// Opcional: Google Geolocation (si no hay key, usa coords del campus)
const char* GEO_API_KEY = ""; // vacío = fallback campus UTEQ

const int BOTON_PIN = 4;
bool estadoAnterior = HIGH;
unsigned long ultimoRebote = 0;
const unsigned long RETARDO_REBOTE = 50;

void setup() {
  Serial.begin(115200);
  pinMode(BOTON_PIN, INPUT_PULLUP);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println("\nWiFi OK");
  Serial.print("Device code: ");
  Serial.println(DEVICE_CODE);
}

void loop() {
  bool estadoActual = digitalRead(BOTON_PIN);
  if (estadoActual != estadoAnterior) {
    ultimoRebote = millis();
  }

  if ((millis() - ultimoRebote) > RETARDO_REBOTE) {
    if (estadoActual == LOW) {
      Serial.println("SOS pulsado");
      float lat = 20.6534;
      float lng = -100.4045;
      if (strlen(GEO_API_KEY) > 0) {
        obtenerUbicacion(lat, lng);
      }
      enviarSOS(lat, lng);
      delay(10000);
    }
  }
  estadoAnterior = estadoActual;
}

bool obtenerUbicacion(float &lat, float &lng) {
  int n = WiFi.scanNetworks();
  if (n <= 0) return false;

  String body = "{\"wifiAccessPoints\":[";
  int lim = n > 8 ? 8 : n;
  for (int i = 0; i < lim; i++) {
    body += "{\"macAddress\":\"" + WiFi.BSSIDstr(i) + "\",\"signalStrength\":" + String(WiFi.RSSI(i)) + "}";
    if (i < lim - 1) body += ",";
  }
  body += "]}";

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = String("https://www.googleapis.com/geolocation/v1/geolocate?key=") + GEO_API_KEY;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  bool ok = false;
  if (code == 200) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, http.getString());
    lat = doc["location"]["lat"].as<float>();
    lng = doc["location"]["lng"].as<float>();
    ok = true;
  }
  http.end();
  WiFi.scanDelete();
  return ok;
}

void enviarSOS(float lat, float lng) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sin WiFi");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.begin(client, API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Hermes-Device-Key", SOS_KEY);

  String payload = "{";
  payload += "\"device_code\":\"" + String(DEVICE_CODE) + "\",";
  payload += "\"lat\":" + String(lat, 6) + ",";
  payload += "\"lng\":" + String(lng, 6);
  payload += "}";

  int code = http.POST(payload);
  Serial.print("HTTP ");
  Serial.println(code);
  Serial.println(http.getString());
  http.end();
}

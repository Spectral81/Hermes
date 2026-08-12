/*
 * HERMES — Pulsera SOS (ESP32)
 *
 * LOCAL:
 *   API_URL = "http://TU_IP_LAN:3000/api/sos/device"
 *   SOS_KEY = mismo valor que WEARABLE_SOS_KEY en apps/web/.env.local
 *
 * Botón: GPIO 4 ↔ GND (INPUT_PULLUP)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// --- WiFi (mismo que tu PC) ---
const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASS = "TU_PASSWORD";

// --- Debe coincidir con Perfil → Vincular pulsera ---
const char* DEVICE_CODE = "HMS-A1B2";

// --- Igual a WEARABLE_SOS_KEY en .env.local ---
const char* SOS_KEY = "hermes-sos-dev-local";

// --- LOCAL: usa http + IP de tu PC (ej. 192.168.1.68) ---
// --- PRODUCCIÓN: https://web-production-10a1.up.railway.app/api/sos/device ---
const char* API_URL = "http://192.168.1.68:3000/api/sos/device";

// Google Geolocation API (WiFi). Vacío = centro del campus.
// Actívala en Google Cloud: APIs → Geolocation API → crear clave.
const char* GEO_API_KEY = "AIzaSyDgPGz0IwKlle-h5rc1hUdaPwKVpsdjwhc";

const float CAMPUS_LAT = 20.6534;
const float CAMPUS_LNG = -100.4045;

const int BOTON_PIN = 4;
bool estadoAnterior = HIGH;
unsigned long ultimoRebote = 0;
const unsigned long RETARDO_REBOTE = 50;

bool isHttpsUrl(const char* url) {
  return String(url).startsWith("https://");
}

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
  Serial.print("IP ESP: ");
  Serial.println(WiFi.localIP());
  Serial.print("Device code: ");
  Serial.println(DEVICE_CODE);
  Serial.print("API: ");
  Serial.println(API_URL);
}

void loop() {
  bool estadoActual = digitalRead(BOTON_PIN);
  if (estadoActual != estadoAnterior) {
    ultimoRebote = millis();
  }

  if ((millis() - ultimoRebote) > RETARDO_REBOTE) {
    if (estadoActual == LOW) {
      Serial.println("SOS pulsado");
      float lat = CAMPUS_LAT;
      float lng = CAMPUS_LNG;
      bool geoOk = false;
      if (strlen(GEO_API_KEY) > 0) {
        geoOk = obtenerUbicacion(lat, lng);
      } else {
        Serial.println("Sin GEO_API_KEY: usando campus UTEQ");
      }
      Serial.print("Coords ");
      Serial.print(geoOk ? "(WiFi): " : "(fallback): ");
      Serial.print(lat, 6);
      Serial.print(", ");
      Serial.println(lng, 6);
      reconectarWiFi();
      enviarSOS(lat, lng);
      delay(10000);
    }
  }
  estadoAnterior = estadoActual;
}

void reconectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.println("Reconectando WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) {
    delay(400);
    Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? "\nWiFi OK" : "\nWiFi falló");
}

bool obtenerUbicacion(float &lat, float &lng) {
  Serial.println("Escaneando WiFi para ubicar...");
  int n = WiFi.scanNetworks();
  Serial.print("Redes: ");
  Serial.println(n);
  if (n <= 0) {
    WiFi.scanDelete();
    return false;
  }

  String body = "{\"considerIp\":true,\"wifiAccessPoints\":[";
  int lim = n > 8 ? 8 : n;
  for (int i = 0; i < lim; i++) {
    body += "{\"macAddress\":\"" + WiFi.BSSIDstr(i) + "\",\"signalStrength\":" + String(WiFi.RSSI(i)) + "}";
    if (i < lim - 1) body += ",";
  }
  body += "]}";
  WiFi.scanDelete();
  reconectarWiFi();

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  String url = String("https://www.googleapis.com/geolocation/v1/geolocate?key=") + GEO_API_KEY;
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  Serial.print("Geo HTTP ");
  Serial.println(code);
  bool ok = false;
  String resp = http.getString();
  if (code == 200) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, resp);
    lat = doc["location"]["lat"].as<float>();
    lng = doc["location"]["lng"].as<float>();
    ok = lat != 0 && lng != 0;
  } else {
    Serial.println(resp);
  }
  http.end();
  return ok;
}

void enviarSOS(float lat, float lng) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sin WiFi");
    return;
  }

  HTTPClient http;
  WiFiClient clientHttp;
  WiFiClientSecure clientHttps;

  if (isHttpsUrl(API_URL)) {
    clientHttps.setInsecure();
    http.begin(clientHttps, API_URL);
  } else {
    http.begin(clientHttp, API_URL);
  }

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
  if (code < 0) {
    Serial.print("Error conexion: ");
    Serial.println(http.errorToString(code));
    Serial.println("Revisa: PC y ESP en mismo WiFi, IP correcta, npm run dev:web, firewall puerto 3000");
  } else {
    Serial.println(http.getString());
  }
  http.end();
}

/*
 * =========================================================================
 * LumiControl IoT - Firmware ESP32 (Arduino / ESP-IDF)
 * =========================================================================
 * Comunicación bidireccional mediante protocolo MQTT vía Wi-Fi.
 * 
 * Tópicos configurados:
 * - Suscripción: hogar/luz1/comando   (Recibe instrucciones desde la app Android: "ENCENDER" / "APAGAR")
 * - Publicación: hogar/luz1/estado    (Envía confirmación del estado real al broker: "ENCENDIDO" / "APAGADO")
 * 
 * Librerías requeridas:
 * - WiFi.h (incluida en el core de ESP32)
 * - PubSubClient (por Nick O'Leary, instalable desde el Gestor de Librerías)
 * =========================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>

// --- Configuración de Red Wi-Fi ---
const char* WIFI_SSID     = "MiRedWiFi_Hogar";
const char* WIFI_PASSWORD = "PasswordSeguro123";

// --- Configuración del Broker MQTT ---
const char* MQTT_BROKER   = "broker.emqx.io"; // O tu broker local: "192.168.1.104"
const int   MQTT_PORT     = 1883;
const char* MQTT_CLIENT_ID= "ESP32_LumiControl_Hab1";

// --- Definición de Tópicos ---
const char* TOPIC_COMANDO = "hogar/luz1/comando"; // Mensajes recibidos desde Android
const char* TOPIC_ESTADO  = "hogar/luz1/estado";  // Feedback publicado hacia Android

// --- Hardware Pins ---
const int RELAY_PIN       = 23; // Pin de control del Relé (Luz 1)
const int LED_STATUS_PIN  = 2;  // LED integrado indicador de conexión MQTT

WiFiClient espClient;
PubSubClient client(espClient);

// Función callback: Se ejecuta automáticamente al recibir un mensaje en "hogar/luz1/comando"
void callback(char* topic, byte* payload, unsigned int length) {
  // Convertir el payload de bytes a String
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();

  Serial.print("[MQTT RX] Tópico: ");
  Serial.print(topic);
  Serial.print(" | Mensaje: ");
  Serial.println(message);

  // Validar si el mensaje corresponde al control de luz1
  if (String(topic) == TOPIC_COMANDO) {
    if (message.equalsIgnoreCase("ENCENDER") || message.equalsIgnoreCase("ON")) {
      // Activar relé físico
      digitalWrite(RELAY_PIN, HIGH);
      Serial.println("-> Acción ejecutada: Luz 1 ENCENDIDA");

      // Publicar confirmación en el tópico de estado para que Android actualice la interfaz
      client.publish(TOPIC_ESTADO, "ENCENDIDO", true);
      Serial.println("-> [MQTT TX] hogar/luz1/estado -> ENCENDIDO");
    } 
    else if (message.equalsIgnoreCase("APAGAR") || message.equalsIgnoreCase("OFF")) {
      // Desactivar relé físico
      digitalWrite(RELAY_PIN, LOW);
      Serial.println("-> Acción ejecutada: Luz 1 APAGADA");

      // Publicar confirmación en el tópico de estado
      client.publish(TOPIC_ESTADO, "APAGADO", true);
      Serial.println("-> [MQTT TX] hogar/luz1/estado -> APAGADO");
    }
  }
}

// Conexión a Wi-Fi
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Conectando a Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("✓ Conexión Wi-Fi exitosa!");
  Serial.print("Dirección IP asignada: ");
  Serial.println(WiFi.localIP());
}

// Reconexión automática al Broker MQTT
void reconnect() {
  while (!client.connected()) {
    Serial.print("Intentando conectar con broker MQTT...");
    
    // Conectar usando Last Will Testament (LWT) opcional para reportar offline
    if (client.connect(MQTT_CLIENT_ID)) {
      Serial.println(" ¡Conectado!");
      digitalWrite(LED_STATUS_PIN, HIGH);

      // Suscribirse al tópico de comando de Luz 1
      client.subscribe(TOPIC_COMANDO);
      Serial.print("Suscrito al tópico: ");
      Serial.println(TOPIC_COMANDO);

      // Publicar estado inicial al arrancar
      bool currentState = digitalRead(RELAY_PIN);
      client.publish(TOPIC_ESTADO, currentState ? "ENCENDIDO" : "APAGADO", true);
    } else {
      Serial.print("Fallo de conexión, rc=");
      Serial.print(client.state());
      Serial.println(". Reintentando en 5 segundos...");
      digitalWrite(LED_STATUS_PIN, LOW);
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  // Configuración de pines de salida
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_STATUS_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_STATUS_PIN, LOW);

  // Inicializar conexiones
  setup_wifi();
  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop(); // Mantiene la conexión MQTT activa y procesa mensajes entrantes
}

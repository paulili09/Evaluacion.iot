/*
 * =========================================================================
 * LumiControl IoT - Firmware ESP32 Bluetooth (Comunicación Directa con Celular)
 * =========================================================================
 * Permite controlar el relé directamente desde el celular Android mediante Bluetooth
 * sin necesidad de router Wi-Fi, Internet ni Broker intermediario.
 * 
 * Nombre de Bluetooth del ESP32: "ESP32_LumiControl"
 * 
 * Protocolo de comunicación:
 * - Celular -> ESP32: Envía "ENCENDER\n" o "APAGAR\n" (o "1" / "0")
 * - ESP32 -> Celular: Responde con confirmación "ENCENDIDO\n" o "APAGADO\n"
 * =========================================================================
 */

#include "BluetoothSerial.h"

#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error Bluetooth no está habilitado en la configuración de la placa ESP32.
#endif

// Objeto de Bluetooth Serial
BluetoothSerial SerialBT;

// Definición de pines
const int RELAY_PIN      = 23; // Pin de conexión del módulo de relé
const int LED_STATUS_PIN = 2;  // LED integrado en el ESP32

void setup() {
  Serial.begin(115200);

  // Configurar pines de hardware
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_STATUS_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);     // Iniciar apagado por seguridad
  digitalWrite(LED_STATUS_PIN, LOW);

  // Iniciar servicio Bluetooth con el nombre identificador para el celular
  SerialBT.begin("ESP32_LumiControl");
  
  Serial.println("==================================================");
  Serial.println("ESP32 Bluetooth Listo!");
  Serial.println("Abre los ajustes de Bluetooth en tu celular y vincula:");
  Serial.println("-> Dispositivo: 'ESP32_LumiControl'");
  Serial.println("==================================================");
}

void loop() {
  // Verificar si el celular ha enviado datos vía Bluetooth
  if (SerialBT.available()) {
    String comando = SerialBT.readStringUntil('\n');
    comando.trim(); // Eliminar espacios o saltos de línea sobrantes

    Serial.print("[Bluetooth RX desde Celular]: ");
    Serial.println(comando);

    if (comando.equalsIgnoreCase("ENCENDER") || comando == "1") {
      // 1. Activar el relé físico
      digitalWrite(RELAY_PIN, HIGH);
      digitalWrite(LED_STATUS_PIN, HIGH);
      Serial.println("-> Relé accionado: LUZ ENCENDIDA");

      // 2. Enviar respuesta de confirmación al celular
      SerialBT.println("ENCENDIDO");
      Serial.println("-> [Bluetooth TX hacia Celular]: ENCENDIDO");
    } 
    else if (comando.equalsIgnoreCase("APAGAR") || comando == "0") {
      // 1. Desactivar el relé físico
      digitalWrite(RELAY_PIN, LOW);
      digitalWrite(LED_STATUS_PIN, LOW);
      Serial.println("-> Relé accionado: LUZ APAGADA");

      // 2. Enviar respuesta de confirmación al celular
      SerialBT.println("APAGADO");
      Serial.println("-> [Bluetooth TX hacia Celular]: APAGADO");
    } 
    else if (comando.equalsIgnoreCase("ESTADO?")) {
      // Consultar estado actual
      bool estadoActual = digitalRead(RELAY_PIN);
      SerialBT.println(estadoActual ? "ENCENDIDO" : "APAGADO");
    }
  }

  delay(20);
}

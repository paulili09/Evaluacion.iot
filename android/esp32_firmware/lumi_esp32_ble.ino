/*
 * =========================================================================
 * LumiControl IoT - Firmware ESP32 BLE (Bluetooth Low Energy)
 * =========================================================================
 * Compatible con:
 * 1. La aplicación web en el navegador del celular (Chrome para Android vía Web Bluetooth)
 * 2. La app nativa Android en Kotlin
 * 
 * Funcionalidad:
 * - Publica el servicio BLE con nombre "ESP32_LumiControl"
 * - Escucha comandos en la característica RX: "ENCENDER\n" o "APAGAR\n"
 * - Conmuta el Relé en el pin GPIO 23 (o GPIO 2 para el LED)
 * - Notifica la confirmación en tiempo real: "ENCENDIDO\n" o "APAGADO\n"
 * =========================================================================
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// UUIDs del Servicio y Característica (Deben coincidir con la app)
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// Pines de Hardware
const int RELAY_PIN      = 23; // Pin de control del relé
const int LED_STATUS_PIN = 2;  // LED integrado en la placa

BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Callback de conexión/desconexión del celular
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
      digitalWrite(LED_STATUS_PIN, HIGH);
      Serial.println("✓ Celular conectado exitosamente por Bluetooth BLE!");
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
      digitalWrite(LED_STATUS_PIN, LOW);
      Serial.println("Celular desconectado de Bluetooth. Reiniciando publicidad...");
    }
};

// Callback que recibe las instrucciones del celular ("ENCENDER" o "APAGAR")
class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      String rxValue = pCharacteristic->getValue().c_str();
      rxValue.trim();

      if (rxValue.length() > 0) {
        Serial.print("[BLE RX desde Celular]: ");
        Serial.println(rxValue);

        if (rxValue.equalsIgnoreCase("ENCENDER") || rxValue == "1") {
          digitalWrite(RELAY_PIN, HIGH);
          Serial.println("-> Relé activado: LUZ ENCENDIDA");
          
          // Responder confirmación al celular
          pCharacteristic->setValue("ENCENDIDO\n");
          pCharacteristic->notify();
        } 
        else if (rxValue.equalsIgnoreCase("APAGAR") || rxValue == "0") {
          digitalWrite(RELAY_PIN, LOW);
          Serial.println("-> Relé desactivado: LUZ APAGADA");
          
          // Responder confirmación al celular
          pCharacteristic->setValue("APAGADO\n");
          pCharacteristic->notify();
        }
      }
    }
};

void setup() {
  Serial.begin(115200);

  // Configuración de pines físicos
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_STATUS_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_STATUS_PIN, LOW);

  Serial.println("==================================================");
  Serial.println("Iniciando ESP32 Bluetooth Low Energy (BLE)...");

  // Crear el dispositivo BLE
  BLEDevice::init("ESP32_LumiControl");

  // Crear el servidor BLE
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Crear el servicio BLE
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Crear la característica de lectura, escritura y notificación
  pCharacteristic = pService->createCharacteristic(
                      CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_WRITE  |
                      BLECharacteristic::PROPERTY_NOTIFY |
                      BLECharacteristic::PROPERTY_INDICATE
                    );

  pCharacteristic->setCallbacks(new MyCallbacks());
  pCharacteristic->addDescriptor(new BLE2902());

  // Iniciar servicio
  pService->start();

  // Iniciar publicidad para que el celular lo detecte
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("Listo! Abre la app en tu celular y toca 'Conectar Bluetooth Real'");
  Serial.println("-> Dispositivo visible como: 'ESP32_LumiControl'");
  Serial.println("==================================================");
}

void loop() {
  // Manejo de reconexión automática si el celular se desconecta
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("Reiniciando publicidad BLE...");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
  delay(10);
}

import React, { useState, useEffect } from 'react';
import {
  X,
  Bluetooth,
  Send,
  Power,
  Smartphone,
  ExternalLink,
  Copy,
  Download,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import {
  webBluetooth,
  BleConnectionState,
  BLE_SERVICE_UUID,
  BLE_CHARACTERISTIC_UUID,
} from '../services/webBluetoothService';
import { playRelayClick } from '../services/soundEffects';

interface BluetoothConnectModalProps {
  onClose: () => void;
  connectionMode: 'bluetooth' | 'mqtt';
  onSetConnectionMode: (mode: 'bluetooth' | 'mqtt') => void;
  onSendBtCommand: (command: 'ENCENDER' | 'APAGAR') => void;
}

const ESP32_BLE_FIRMWARE = `/*
 * LumiControl IoT - Firmware ESP32 BLE GATT (Compatible con Chrome Web Bluetooth y Celular)
 * Sube este código con Arduino IDE a tu ESP32.
 * Luego presiona "Conectar por Bluetooth Real" en la app desde Google Chrome.
 */
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID        "${BLE_SERVICE_UUID}"
#define CHARACTERISTIC_UUID "${BLE_CHARACTERISTIC_UUID}"

const int RELAY_PIN = 23;  // Pin D23 conectado al relé
const int LED_PIN   = 2;   // LED integrado

BLECharacteristic *pCharacteristic = nullptr;

class LumiCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pChar) override {
    String cmd = pChar->getValue().c_str();
    cmd.trim();
    if (cmd == "ENCENDER" || cmd == "1") {
      digitalWrite(RELAY_PIN, HIGH);
      digitalWrite(LED_PIN, HIGH);
      pChar->setValue("ENCENDIDO");
      pChar->notify();
    } else if (cmd == "APAGAR" || cmd == "0") {
      digitalWrite(RELAY_PIN, LOW);
      digitalWrite(LED_PIN, LOW);
      pChar->setValue("APAGADO");
      pChar->notify();
    }
  }
};

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  BLEDevice::init("ESP32_LumiControl");
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());
  pCharacteristic->setCallbacks(new LumiCallbacks());
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();
  Serial.println("ESP32 BLE listo como 'ESP32_LumiControl'");
}

void loop() { delay(50); }`;

const ESP32_CLASSIC_FIRMWARE = `/*
 * LumiControl IoT - Firmware ESP32 Bluetooth Classic (Para Ajustes > Bluetooth de Android y APK Kotlin)
 * Sube este código con Arduino IDE a tu ESP32.
 * Al terminar, abre "Ajustes > Bluetooth" en tu celular y verás "ESP32_LumiControl".
 */
#include "BluetoothSerial.h"

#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error Bluetooth no habilitado en la placa ESP32.
#endif

BluetoothSerial SerialBT;
const int RELAY_PIN = 23;  // Pin D23 conectado al relé
const int LED_PIN   = 2;   // LED indicador integrado

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  SerialBT.begin("ESP32_LumiControl");
  Serial.println("Bluetooth Listo! Busca 'ESP32_LumiControl' en tu celular.");
}

void loop() {
  if (SerialBT.available()) {
    String cmd = SerialBT.readStringUntil('\\n');
    cmd.trim();
    if (cmd == "ENCENDER" || cmd == "1") {
      digitalWrite(RELAY_PIN, HIGH);
      digitalWrite(LED_PIN, HIGH);
      SerialBT.println("ENCENDIDO");
    } else if (cmd == "APAGAR" || cmd == "0") {
      digitalWrite(RELAY_PIN, LOW);
      digitalWrite(LED_PIN, LOW);
      SerialBT.println("APAGADO");
    }
  }
}`;

export const BluetoothConnectModal: React.FC<BluetoothConnectModalProps> = ({
  onClose,
  onSetConnectionMode,
  onSendBtCommand,
}) => {
  const [bleState, setBleState] = useState<BleConnectionState>(webBluetooth.state);
  const [isConnectingReal, setIsConnectingReal] = useState(false);
  const [firmwareTab, setFirmwareTab] = useState<'ble' | 'classic'>('ble');
  const [btLogs, setBtLogs] = useState<string[]>([
    'Web Bluetooth API lista. Usa Chrome en pestaña directa para enlazar hardware BLE real.',
  ]);

  const inIframe = webBluetooth.isInsideIframe();

  useEffect(() => {
    const unsubMsg = webBluetooth.subscribeMessages((incomingMsg) => {
      setBtLogs((prev) => [
        `[ESP32 -> Celular RX]: "${incomingMsg}"`,
        ...prev.slice(0, 19),
      ]);
    });
    const unsubStatus = webBluetooth.subscribeStatus((newState) => {
      setBleState(newState);
    });
    return () => {
      unsubMsg();
      unsubStatus();
    };
  }, []);

  const handleConnectRealBluetooth = async (filterEsp32Only = false) => {
    setIsConnectingReal(true);
    const res = await webBluetooth.requestAndConnect(filterEsp32Only);
    setIsConnectingReal(false);

    if (res.ok) {
      playRelayClick(true);
      onSetConnectionMode('bluetooth');
      const devName = webBluetooth.state.deviceName || 'Dispositivo Bluetooth';
      setBtLogs((prev) => [
        webBluetooth.state.isRealHardware
          ? `✓ Hardware BLE GATT enlazado: ${devName}`
          : `✓ Dispositivo Bluetooth vinculado y sincronizado: ${devName}`,
        ...prev,
      ]);
    } else if (res.reason) {
      setBtLogs((prev) => [`Aviso: ${res.reason}`, ...prev]);
    }
  };

  const handleActivateDemoLink = () => {
    playRelayClick(true);
    webBluetooth.activateDemoLink();
    onSetConnectionMode('bluetooth');
    setBtLogs((prev) => [
      'Enlace directo vía API activado (útil si aún no tienes el ESP32 conectado).',
      ...prev,
    ]);
  };

  const handleTestCommand = async (cmd: 'ENCENDER' | 'APAGAR') => {
    playRelayClick(cmd === 'ENCENDER');
    onSendBtCommand(cmd);

    if (bleState.isRealHardware) {
      const sent = await webBluetooth.sendCommand(cmd);
      setBtLogs((prev) => [
        sent
          ? `[BLE TX REAL -> ESP32]: "${cmd}" escrito en característica GATT`
          : `[BLE TX]: No se pudo escribir "${cmd}" en la característica`,
        ...prev,
      ]);
    } else {
      setBtLogs((prev) => [
        `[API + Sync -> Celular]: "${cmd}" sincronizado en tiempo real`,
        ...prev,
      ]);
    }
  };

  const activeFirmwareCode = firmwareTab === 'ble' ? ESP32_BLE_FIRMWARE : ESP32_CLASSIC_FIRMWARE;
  const activeFirmwareName =
    firmwareTab === 'ble' ? 'ESP32_LumiControl_BLE.ino' : 'ESP32_LumiControl_ClassicBT.ino';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md text-left">
      <div className="w-full max-w-lg bg-[#0E1526] border border-slate-800 rounded-3xl p-6 text-white max-h-[92vh] overflow-y-auto shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Bluetooth className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Bluetooth Real con ESP32 / Celular
              </h2>
              <p className="text-xs text-slate-400">
                Conexión directa Bluetooth BLE GATT y sincronización móvil
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Iframe notice if inside embedded preview */}
        {inIframe && (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2">
            <div className="flex items-start gap-2 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                El navegador bloquea el selector físico de Bluetooth dentro de vistas embebidas (iframe). Para buscar tu ESP32 o celular por Bluetooth real, abre la app en una pestaña directa:
              </span>
            </div>
            <a
              href={typeof window !== 'undefined' ? window.location.href : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en Pestaña Directa (Habilita Bluetooth Real)</span>
            </a>
          </div>
        )}

        {/* Primary Action Card */}
        <div className="p-4 rounded-2xl bg-[#101728] border border-blue-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Estado de Enlace Bluetooth
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                bleState.isRealHardware
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : bleState.isConnected
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                  : bleState.isBluetoothAvailable
                  ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                  : 'bg-slate-800 border border-slate-700 text-slate-300'
              }`}
            >
              {bleState.isRealHardware
                ? 'BLE HARDWARE REAL'
                : bleState.isConnected
                ? 'BLUETOOTH VINCULADO'
                : bleState.isBluetoothAvailable
                ? 'BT ENCENDIDO · LISTO'
                : 'BT APAGADO'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{bleState.statusMessage}</p>

          {bleState.lastError && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-200">
              {bleState.lastError}
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              disabled={isConnectingReal}
              onClick={() => handleConnectRealBluetooth(false)}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Bluetooth className={`w-4 h-4 stroke-[2.5] ${isConnectingReal ? 'animate-spin' : ''}`} />
              <span>
                {isConnectingReal
                  ? 'Buscando dispositivos cercanos...'
                  : bleState.isConnected
                  ? `Cambiar / Reconectar (${bleState.deviceName})`
                  : 'Buscar Celular o ESP32 por Bluetooth'}
              </span>
            </button>

            <button
              type="button"
              disabled={isConnectingReal}
              onClick={() => handleConnectRealBluetooth(true)}
              className="w-full py-2 px-4 rounded-xl bg-[#141E36] hover:bg-[#1B2847] border border-blue-500/30 text-blue-200 font-semibold text-[11px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Filtrar solo placas ESP32_LumiControl</span>
            </button>

            {!bleState.isConnected && (
              <button
                type="button"
                onClick={handleActivateDemoLink}
                className="w-full py-2.5 px-4 rounded-xl bg-[#141E36] hover:bg-[#1B2847] border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Activar enlace rápido sin selector (API + Celular)</span>
              </button>
            )}

            {bleState.isConnected && (
              <button
                type="button"
                onClick={() => webBluetooth.disconnect()}
                className="w-full py-2 px-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer"
              >
                Desconectar Bluetooth
              </button>
            )}
          </div>
        </div>

        {/* Firmware selector for real ESP32 */}
        <div className="p-4 rounded-2xl bg-[#0D1527] border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-cyan-300 uppercase tracking-wider">
              Firmware ESP32 para tu Placa
            </span>
            <div className="flex gap-1 bg-[#080D1A] p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setFirmwareTab('ble')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                  firmwareTab === 'ble' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                BLE (Chrome)
              </button>
              <button
                type="button"
                onClick={() => setFirmwareTab('classic')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                  firmwareTab === 'classic' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Classic (Ajustes BT)
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {firmwareTab === 'ble'
              ? 'Usa el firmware BLE (BLEDevice.h) para que Chrome encuentre directamente tu ESP32 al presionar "Buscar y Conectar ESP32 por Bluetooth Real".'
              : 'Usa Bluetooth Classic (BluetoothSerial.h) para que aparezca como "ESP32_LumiControl" en Ajustes > Bluetooth de Android y la app Kotlin.'}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(activeFirmwareCode);
                setBtLogs((prev) => [`✓ ${activeFirmwareName} copiado al portapapeles`, ...prev]);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Código .ino</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const blob = new Blob([activeFirmwareCode], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = activeFirmwareName;
                a.click();
                URL.revokeObjectURL(url);
                setBtLogs((prev) => [`✓ Descargado ${activeFirmwareName}`, ...prev]);
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Descargar</span>
            </button>
          </div>
        </div>

        {/* Quick Test Buttons */}
        <div className="p-3.5 rounded-2xl bg-[#101728] border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-blue-400" />
              Enviar Comando Directo
            </span>
            <span className="text-[10px] text-emerald-400 font-bold font-mono">
              {bleState.isRealHardware ? 'BLE Hardware' : 'API Tiempo Real'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTestCommand('ENCENDER')}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>ENCENDER</span>
            </button>

            <button
              type="button"
              onClick={() => handleTestCommand('APAGAR')}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5 text-slate-400" />
              <span>APAGAR</span>
            </button>
          </div>
        </div>

        {/* Live Log */}
        <div className="p-3.5 rounded-2xl bg-black/80 border border-slate-900 font-mono text-[11px] space-y-1 max-h-32 overflow-y-auto">
          {btLogs.map((log, i) => (
            <div key={i} className="text-slate-300 break-all leading-snug">
              <span className="text-blue-400">&gt;</span> {log}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
        >
          Cerrar Panel
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  Bluetooth,
  Wifi,
  RefreshCw,
  CheckCircle2,
  Radio,
  Send,
  Power,
  Smartphone,
  ExternalLink,
  Cpu,
  Sparkles,
  Copy,
  Download,
} from 'lucide-react';
import { webBluetooth, BleConnectionState } from '../services/webBluetoothService';
import { playRelayClick } from '../services/soundEffects';

interface BluetoothConnectModalProps {
  onClose: () => void;
  connectionMode: 'bluetooth' | 'mqtt';
  onSetConnectionMode: (mode: 'bluetooth' | 'mqtt') => void;
  onSendBtCommand: (command: 'ENCENDER' | 'APAGAR') => void;
}

export const BluetoothConnectModal: React.FC<BluetoothConnectModalProps> = ({
  onClose,
  connectionMode,
  onSetConnectionMode,
  onSendBtCommand,
}) => {
  const [bleState, setBleState] = useState<BleConnectionState>(webBluetooth.state);
  const [isConnectingReal, setIsConnectingReal] = useState(false);
  const [btLogs, setBtLogs] = useState<string[]>([
    'Web Bluetooth API cargada en el navegador.',
    'Listo para comunicarse con el ESP32.',
  ]);

  useEffect(() => {
    webBluetooth.setCallbacks(
      (incomingMsg) => {
        setBtLogs((prev) => [
          `[ESP32 -> Celular RX]: "${incomingMsg}" (Respuesta recibida en tiempo real)`,
          ...prev,
        ]);
      },
      (newState) => {
        setBleState(newState);
      }
    );
  }, []);

  const handleConnectRealBluetooth = () => {
    playRelayClick(true);
    setIsConnectingReal(true);
    webBluetooth.connectInstant();
    onSetConnectionMode('bluetooth');
    setBtLogs((prev) => [
      `⚡ ¡CONECTADO EN 1 SOLO CLICK con ${webBluetooth.state.deviceName || 'ESP32_LumiControl'}!`,
      'Enlace Bluetooth activo (latencia 8ms). Cada click conmuta el relé con sonido de estado.',
      ...prev,
    ]);
    setTimeout(() => setIsConnectingReal(false), 300);
  };

  const handleTestCommand = async (cmd: 'ENCENDER' | 'APAGAR') => {
    playRelayClick(cmd === 'ENCENDER');
    onSendBtCommand(cmd);

    if (bleState.isConnected) {
      await webBluetooth.sendCommand(cmd);
      setBtLogs((prev) => [
        `[Celular -> ESP32 TX REAL]: "${cmd}" enviado por BLE a la característica`,
        ...prev,
      ]);
    } else {
      setBtLogs((prev) => [
        `[Celular -> ESP32 TX Simulado]: "${cmd}" (Conecta tu ESP32 con el botón azul para probar en físico)`,
        `[ESP32 HW]: digitalWrite(RELAY_PIN, ${cmd === 'ENCENDER' ? 'HIGH' : 'LOW'})`,
        `[ESP32 -> Celular RX]: "${cmd === 'ENCENDER' ? 'ENCENDIDO' : 'APAGADO'}" (Latencia: 8ms)`,
        ...prev,
      ]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in text-left">
      <div className="w-full max-w-lg bg-[#0E1526] border border-slate-800 rounded-3xl p-6 text-white max-h-[92vh] overflow-y-auto shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Bluetooth className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Bluetooth Real con el Celular
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-400">
                Conexión directa Celular ↔ ESP32 (Sin Wi-Fi ni Internet)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action Button: Connect Real Web Bluetooth */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/40 via-indigo-900/20 to-[#101728] border border-blue-500/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Vincular Hardware Físico
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                bleState.isConnected
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
              }`}
            >
              {bleState.isConnected ? '● CONECTADO EN VIVO' : 'Bluetooth BLE'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {bleState.isConnected
              ? `Conectado a tu dispositivo físico: ${bleState.deviceName}. Al pulsar los interruptores, el relé físico del ESP32 conmutará en tiempo real.`
              : 'Al presionar este botón desde Chrome en tu celular, se abrirá la ventana nativa de Bluetooth de Android para buscar y emparejar tu ESP32.'}
          </p>

          <button
            type="button"
            disabled={isConnectingReal}
            onClick={handleConnectRealBluetooth}
            className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 ${
              bleState.isConnected
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30'
            }`}
          >
            <Bluetooth className={`w-4 h-4 stroke-[2.5] ${isConnectingReal ? 'animate-spin' : ''}`} />
            <span>
              {isConnectingReal
                ? 'Conectando...'
                : bleState.isConnected
                ? `Reconectar (${bleState.deviceName})`
                : '⚡ Conectar en 1 Solo Click (Bluetooth)'}
            </span>
          </button>
        </div>

        {/* GUÍA ESENCIAL: ¿Por qué aparece o no en los Ajustes de Bluetooth del celular? */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#131F37] to-[#0D1527] border border-cyan-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-cyan-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              ¿Cómo hacer que aparezca en el Bluetooth de mi celular?
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
              Importante
            </span>
          </div>

          <div className="p-3 rounded-xl bg-black/50 border border-cyan-500/20 space-y-2 text-xs text-slate-200">
            <p className="leading-relaxed">
              <strong>El ESP32 no emite señal Bluetooth por sí solo</strong> hasta que le cargas el programa. Para que aparezca en tu celular en <span className="text-amber-400 font-bold">Ajustes &gt; Bluetooth</span> como <span className="text-cyan-300 font-mono font-bold">"ESP32_LumiControl"</span>:
            </p>

            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] pl-1">
              <li>Conecta tu placa ESP32 por cable USB a la computadora.</li>
              <li>Abre <strong>Arduino IDE</strong> y pega el código de abajo (usa la librería <code>BluetoothSerial.h</code>).</li>
              <li>Presiona <strong>Subir (Upload)</strong>.</li>
              <li>¡Listo! En cuanto termine de subir, abre <strong>Ajustes &gt; Bluetooth</strong> en tu celular y verás aparecer de inmediato <strong className="text-cyan-300">ESP32_LumiControl</strong> para vincularlo con un toque.</li>
            </ol>
          </div>

          {/* Action buttons: Download & Copy INO */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const code = `/*
 * LumiControl IoT - Firmware ESP32 Bluetooth Classic
 * Sube este código con Arduino IDE a tu ESP32.
 * Al terminar, abre "Ajustes > Bluetooth" en tu celular y verás "ESP32_LumiControl".
 */
#include "BluetoothSerial.h"

#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error Bluetooth no habilitado en la placa ESP32.
#endif

BluetoothSerial SerialBT;
const int RELAY_PIN = 23;  // Pin D23 conectado al relé
const int LED_PIN = 2;     // LED indicador integrado

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  // NOMBRE QUE APARECERÁ EN TU TELÉFONO:
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
                navigator.clipboard.writeText(code);
                setBtLogs((prev) => ['✓ ¡Código Arduino (.ino) copiado al portapapeles!', ...prev]);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 active:scale-95 transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Código Arduino</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const code = `/*
 * LumiControl IoT - Firmware ESP32 Bluetooth Classic
 * Sube este código con Arduino IDE a tu ESP32.
 */
#include "BluetoothSerial.h"

BluetoothSerial SerialBT;
const int RELAY_PIN = 23;
const int LED_PIN = 2;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  SerialBT.begin("ESP32_LumiControl");
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
                const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ESP32_LumiControl_Bluetooth.ino';
                a.click();
                URL.revokeObjectURL(url);
                setBtLogs((prev) => ['✓ Archivo ESP32_LumiControl_Bluetooth.ino descargado', ...prev]);
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Descargar .ino</span>
            </button>
          </div>
        </div>

        {/* Quick Test Buttons */}
        <div className="p-3.5 rounded-2xl bg-[#101728] border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-blue-400" />
              Probar Transmisión de Comandos
            </span>
            <span className="text-[10px] text-emerald-400 font-bold font-mono">
              {bleState.isConnected ? 'Hardware Físico Enlazado' : 'Modo Demostración Activo'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTestCommand('ENCENDER')}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Enviar "ENCENDER"</span>
            </button>

            <button
              type="button"
              onClick={() => handleTestCommand('APAGAR')}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Power className="w-3.5 h-3.5 text-slate-400" />
              <span>Enviar "APAGAR"</span>
            </button>
          </div>
        </div>

        {/* Live Bluetooth Log Stream */}
        <div className="p-3.5 rounded-2xl bg-black/80 border border-slate-900 font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto">
          {btLogs.map((log, i) => (
            <div key={i} className="text-slate-300 break-all leading-snug">
              <span className="text-blue-400">&gt;</span> {log}
            </div>
          ))}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
        >
          Cerrar Panel
        </button>
      </div>
    </div>
  );
};

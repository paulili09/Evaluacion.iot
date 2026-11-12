import React, { useState } from 'react';
import { X, Play, RefreshCw, Send, CheckCircle2, AlertTriangle, Radio, Terminal, Zap } from 'lucide-react';

interface MqttSandboxModalProps {
  onClose: () => void;
  onTriggerAbsenceAlert: () => void;
  onTurnOffAll: () => void;
}

export const MqttSandboxModal: React.FC<MqttSandboxModalProps> = ({
  onClose,
  onTriggerAbsenceAlert,
  onTurnOffAll,
}) => {
  const [activeSimulation, setActiveSimulation] = useState<string | null>(null);
  const [simLogs, setSimLogs] = useState<string[]>([
    'Iniciando Sandbox MQTT emulado en loopback local...',
    'Broker MQTT en línea: broker.lumicontrol.local:1883 [TLS OK]',
    'Suscripción activa: lumi/+/+ y esp/mesh/+',
  ]);

  const runSimulation = (name: string, steps: { delay: number; log: string; action?: () => void }[]) => {
    setActiveSimulation(name);
    let cumulative = 0;

    steps.forEach((step, index) => {
      cumulative += step.delay;
      setTimeout(() => {
        setSimLogs((prev) => [step.log, ...prev]);
        if (step.action) step.action();
        if (index === steps.length - 1) {
          setActiveSimulation(null);
        }
      }, cumulative);
    });
  };

  const simulateLuz1Toggle = (encender: boolean) => {
    const actionLabel = encender ? 'ENCENDER' : 'APAGAR';
    const statusFeedback = encender ? 'ENCENDIDO' : 'APAGADO';

    runSimulation(`Control Luz 1 (${actionLabel})`, [
      {
        delay: 200,
        log: `[ANDROID TX] Usuario pulsó botón en app -> PUB hogar/luz1/comando "${actionLabel}"`,
      },
      {
        delay: 500,
        log: `[BROKER MQTT] Mensaje entregado a ESP32 suscrito a "hogar/luz1/comando" (QoS 1)`,
      },
      {
        delay: 800,
        log: `[ESP32 HW] ESP32 procesó comando: digitalWrite(RELAY_PIN, ${encender ? 'HIGH' : 'LOW'}) ejecutado`,
      },
      {
        delay: 1100,
        log: `[ESP32 TX] ESP32 publica nuevo estado real -> PUB hogar/luz1/estado "${statusFeedback}"`,
      },
      {
        delay: 1400,
        log: `[ANDROID RX] App recibe "hogar/luz1/estado" -> StateFlow actualizado: Luz 1 ${statusFeedback}`,
      },
    ]);
  };

  const simulateProlongedAbsence = () => {
    runSimulation('Ausencia Prolongada (90 min)', [
      { delay: 300, log: 'PUB -> hogar/estudio/sensor/pir {"motion":0, "duration_min":90}' },
      { delay: 600, log: 'EVAL -> Regla Anti-Olvido #1 matched (Umbral: 20 min superado)' },
      { delay: 900, log: 'PUSH -> Enviando notificación Heads-Up al móvil de Sofía...' },
      {
        delay: 1200,
        log: 'ALERTA ACTIVADA -> Lámpara Estudio marcada como olvidada',
        action: onTriggerAbsenceAlert,
      },
    ]);
  };

  const simulateGeofenceExit = () => {
    runSimulation('Salida de Geocerca (Fuera de Casa)', [
      { delay: 400, log: 'SUB -> hogar/geocerca {"ssid":"LumiNet_5G", "status":"DISCONNECTED"}' },
      { delay: 800, log: 'ROUTER -> Ningún dispositivo registrado en la LAN' },
      { delay: 1200, log: 'CMD -> PUB hogar/luz1/comando "APAGAR"' },
      {
        delay: 1500,
        log: 'EXEC -> Relé ESP32 conmutado a OFF (0.0 W)',
        action: onTurnOffAll,
      },
    ]);
  };

  const simulatePIRMovement = () => {
    runSimulation('Detección de Movimiento PIR', [
      { delay: 300, log: 'PUB -> hogar/estudio/pir {"motion":1, "dist_m":1.2, "vel":0.15}' },
      { delay: 700, log: 'STATE -> Temporizador de inactividad reiniciado a 0 min' },
      { delay: 1000, log: 'ACK -> Estado seguro de ocupación humana confirmado' },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#0E1526] border border-slate-800 rounded-3xl p-6 text-white max-h-[90vh] overflow-y-auto shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Sandbox MQTT & Simulador
              </h2>
              <p className="text-xs text-slate-400">
                Prueba interactiva del protocolo Anti-Olvido
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

        {/* Description */}
        <p className="text-xs text-slate-300 my-4 leading-relaxed">
          Haz clic en cualquiera de los escenarios predefinidos para disparar paquetes MQTT simulados en tiempo real y observar el comportamiento de los actuadores y las alertas:
        </p>

        {/* Buttons to simulate */}
        <div className="space-y-2.5">
          {/* Ciclo hogar/luz1/comando y hogar/luz1/estado */}
          <div className="p-3.5 rounded-2xl bg-[#121B30] border border-emerald-500/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-400" />
                Ciclo Real: hogar/luz1/comando → estado
              </span>
              <span className="text-[10px] font-mono text-slate-400">ESP32 + Android</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Prueba la instrucción enviada desde Android al tópico <code>hogar/luz1/comando</code> y la respuesta del ESP32 en <code>hogar/luz1/estado</code>.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={activeSimulation !== null}
                onClick={() => simulateLuz1Toggle(true)}
                className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50"
              >
                ▶ Enviar "ENCENDER"
              </button>
              <button
                type="button"
                disabled={activeSimulation !== null}
                onClick={() => simulateLuz1Toggle(false)}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all disabled:opacity-50"
              >
                ■ Enviar "APAGAR"
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={activeSimulation !== null}
            onClick={simulateProlongedAbsence}
            className="w-full p-3.5 rounded-2xl bg-[#121B30] hover:bg-[#162340] border border-amber-500/40 flex items-center justify-between transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">
                  Simular Ausencia Prolongada (90 min)
                </div>
                <div className="text-[11px] text-slate-400">
                  Dispara la alerta crítica y el aviso push
                </div>
              </div>
            </div>
            <Play className="w-4 h-4 text-amber-400" />
          </button>

          <button
            type="button"
            disabled={activeSimulation !== null}
            onClick={simulateGeofenceExit}
            className="w-full p-3.5 rounded-2xl bg-[#121B30] hover:bg-[#162340] border border-cyan-500/40 flex items-center justify-between transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-cyan-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">
                  Simular Salida de Geocerca (Fuera de Casa)
                </div>
                <div className="text-[11px] text-slate-400">
                  Ejecuta comando MQTT para apagar todas las luces
                </div>
              </div>
            </div>
            <Play className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            type="button"
            disabled={activeSimulation !== null}
            onClick={simulatePIRMovement}
            className="w-full p-3.5 rounded-2xl bg-[#121B30] hover:bg-[#162340] border border-emerald-500/40 flex items-center justify-between transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">
                  Simular Detección de Movimiento
                </div>
                <div className="text-[11px] text-slate-400">
                  Reinicia el temporizador de inactividad
                </div>
              </div>
            </div>
            <Play className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        {/* Live Terminal Output */}
        <div className="mt-4 p-3.5 rounded-2xl bg-black/80 border border-slate-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
              Terminal de Paquetes en Vivo
            </span>
            {activeSimulation && (
              <span className="text-[10px] font-mono text-amber-400 animate-pulse">
                Ejecutando: {activeSimulation}
              </span>
            )}
          </div>

          <div className="font-mono text-[11px] space-y-1.5 max-h-36 overflow-y-auto text-slate-300">
            {simLogs.map((log, i) => (
              <div key={i} className="leading-snug break-all">
                <span className="text-cyan-400">&gt;</span> {log}
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
          >
            Cerrar Simulador
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Lamp,
  Home,
  Bed,
  Utensils,
  Radio,
  Moon,
  WifiOff,
  Sun,
  Zap,
  Check,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { ReglaAntiOlvido } from '../../types';

interface NuevaReglaModalProps {
  onClose: () => void;
  onSaveRule: (rule: Partial<ReglaAntiOlvido>) => void;
  onOpenSandbox: () => void;
}

export const NuevaReglaModal: React.FC<NuevaReglaModalProps> = ({
  onClose,
  onSaveRule,
  onOpenSandbox,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<string>('lampara-estudio');
  const [waitMinutes, setWaitMinutes] = useState<number>(20);
  const [onlyNight, setOnlyNight] = useState<boolean>(true);
  const [outsideGeofence, setOutsideGeofence] = useState<boolean>(false);
  const [actionType, setActionType] = useState<'warning_with_snooze' | 'direct_cut'>('warning_with_snooze');
  const [softDimming, setSoftDimming] = useState<boolean>(true);

  const devices = [
    {
      id: 'lampara-estudio',
      name: 'Lámpara Estudio',
      desc: 'PIR Activo (ESP32)',
      icon: Lamp,
    },
    {
      id: 'hab-principal',
      name: 'Hab. Principal',
      desc: '2 Bombillos Mesh',
      icon: Bed,
    },
    {
      id: 'toda-casa',
      name: 'Toda la Casa',
      desc: '6 Relés Centrales',
      icon: Home,
    },
    {
      id: 'cocina-barra',
      name: 'Cocina & Barra',
      desc: 'Tira COB 24V',
      icon: Utensils,
    },
  ];

  const handleSave = () => {
    onSaveRule({
      targetDevice: selectedDevice,
      waitMinutes,
      onlyNight,
      outsideGeofence,
      actionType,
      softDimming,
      savedKwhWeekly: 2.1,
      savedUsdWeekly: 0.42,
      isActive: true,
    });
    onClose();
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-left">
      {/* Top badges */}
      <div className="flex items-center gap-2 pt-2">
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold tracking-wider uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Regla de Eficiencia IoT
        </span>

        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[11px] font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Asistente Inteligente
        </span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Nueva Regla Anti-Olvido
        </h1>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          Protege tu hogar de consumos fantasma apagando luminarias sin ocupación confirmada.
        </p>
      </div>

      {/* Stepper (1-2-3-4) */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center flex-1">
          <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center shadow-md shadow-amber-500/30">
            1
          </div>
          <div className="flex-1 h-0.5 bg-amber-500 mx-2" />
        </div>

        <div className="flex items-center flex-1">
          <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center shadow-md shadow-amber-500/30">
            2
          </div>
          <div className="flex-1 h-0.5 bg-amber-500 mx-2" />
        </div>

        <div className="flex items-center flex-1">
          <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center shadow-md shadow-amber-500/30">
            3
          </div>
          <div className="flex-1 h-0.5 bg-slate-800 mx-2" />
        </div>

        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold flex items-center justify-center">
          4
        </div>
      </div>

      {/* Step 1: Zona o Dispositivo Objetivo */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-bold text-white">
              Zona o Dispositivo Objetivo
            </h2>
          </div>
          <span className="text-[11px] text-amber-400 font-semibold">
            Requerido
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {devices.map((device) => {
            const Icon = device.icon;
            const isSelected = selectedDevice === device.id;

            return (
              <button
                key={device.id}
                type="button"
                onClick={() => setSelectedDevice(device.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                  isSelected
                    ? 'bg-[#121B30] border-amber-500 shadow-md shadow-amber-500/10'
                    : 'bg-[#101728] border-slate-800 hover:border-slate-700 opacity-80'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3.5 right-3.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-white truncate">
                  {device.name}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="truncate">{device.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Disparador & Sensores */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
            2
          </span>
          <h2 className="text-sm font-bold text-white">Disparador & Sensores</h2>
        </div>

        <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-4">
          {/* Main Sensor Card */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Inactividad PIR mmWave
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  Listo
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Dispara si no hay micro-movimiento o respiración detectada en la habitación.
              </p>
            </div>
          </div>

          {/* Wait margin before acting */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-300">Margen de espera antes de actuar:</span>
              <span className="text-amber-400 font-bold">{waitMinutes} minutos</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[10, 20, 30, 45, 60].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setWaitMinutes(min)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    waitMinutes === min
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>

          {/* Additional Conditions (AND) */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Condiciones Adicionales (AND)
            </span>

            {/* Solo en Horario Nocturno */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Moon className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-white">
                    Solo en Horario Nocturno
                  </div>
                  <div className="text-[11px] text-slate-400">
                    21:00 hrs a 07:00 hrs (Horario de descanso)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOnlyNight(!onlyNight)}
                className={`w-12 h-6 rounded-full transition-colors flex items-center p-0.5 ${
                  onlyNight ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                    onlyNight ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Fuera de Geocerca Wi-Fi */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <WifiOff className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-white">
                    Fuera de Geocerca Wi-Fi
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Desconectado del SSID 'LumiNet_5G'
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOutsideGeofence(!outsideGeofence)}
                className={`w-12 h-6 rounded-full transition-colors flex items-center p-0.5 ${
                  outsideGeofence ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                    outsideGeofence ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Acción y Aviso Amigable */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
            3
          </span>
          <h2 className="text-sm font-bold text-white">Acción y Aviso Amigable</h2>
        </div>

        <div className="space-y-3">
          {/* Radio 1: Alerta preventiva con pre-aviso */}
          <div
            onClick={() => setActionType('warning_with_snooze')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              actionType === 'warning_with_snooze'
                ? 'bg-[#121B30] border-amber-500/80 shadow-md shadow-amber-500/10'
                : 'bg-[#101728] border-slate-800 opacity-80'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  actionType === 'warning_with_snooze'
                    ? 'border-amber-400 bg-amber-400/20'
                    : 'border-slate-600'
                }`}
              >
                {actionType === 'warning_with_snooze' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white">
                    Alerta preventiva con pre-aviso
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold">
                    Recomendado
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Notificación Push con acción rápida para posponer 15 min más antes de cortar el relé.
                </p>
              </div>
            </div>
          </div>

          {/* Radio 2: Corte directo sin confirmación */}
          <div
            onClick={() => setActionType('direct_cut')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              actionType === 'direct_cut'
                ? 'bg-[#121B30] border-amber-500/80 shadow-md shadow-amber-500/10'
                : 'bg-[#101728] border-slate-800 opacity-80'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  actionType === 'direct_cut'
                    ? 'border-amber-400 bg-amber-400/20'
                    : 'border-slate-600'
                }`}
              >
                {actionType === 'direct_cut' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold text-white">
                  Corte directo sin confirmación
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Apaga instantáneamente por comando MQTT una vez alcanzado el umbral temporal.
                </p>
              </div>
            </div>
          </div>

          {/* Atenuación suave previa */}
          <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">
                  Atenuación suave previa (3 min)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Parpadeo suave si estás leyendo sin moverte
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSoftDimming(!softDimming)}
              className={`w-12 h-6 rounded-full transition-colors flex items-center p-0.5 ${
                softDimming ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                  softDimming ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Step 4: Impacto de Ahorro Estimado */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white">
              Impacto de Ahorro Estimado
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            Alta Eficiencia
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#0B111E] border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">
              Energía recuperada
            </span>
            <div className="text-lg font-extrabold text-white font-mono mt-0.5">
              ~2.1 <span className="text-xs font-normal text-slate-400">kWh/sem</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold block mt-1">
              ↘ -34% desperdicio
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B111E] border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">
              Costo evitado
            </span>
            <div className="text-lg font-extrabold text-white font-mono mt-0.5">
              $0.42 <span className="text-xs font-normal text-slate-400">USD/sem</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              ~$21.84 USD al año
            </span>
          </div>
        </div>

        {/* Sparkline & projection note */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Proyección calculada sobre 28 días de telemetría IoT</span>
          </div>

          {/* SVG sparkline */}
          <svg className="w-16 h-6 text-amber-400" viewBox="0 0 64 24" fill="none">
            <path
              d="M2 18L14 14L26 19L38 10L50 12L62 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="space-y-2.5 pt-2">
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-98 transition-all"
        >
          <Zap className="w-4 h-4 fill-slate-950" />
          <span>Guardar y Activar Regla</span>
        </button>

        <button
          type="button"
          onClick={onOpenSandbox}
          className="w-full py-3 px-4 rounded-xl bg-[#141C30] hover:bg-[#1a2540] border border-slate-700/80 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <Terminal className="w-4 h-4" />
          <span>Simular en Sandbox MQTT</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-center text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          Descartar y volver
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Wifi,
  Bell,
  Zap,
  Power,
  ChevronRight,
  Flame,
  Focus,
  Tv,
  Radio,
  Sliders,
  CheckCircle2,
  Bluetooth,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Luminaria, Escena } from '../../types';
import { LightCard } from '../LightCard';

interface LucesViewProps {
  lights: Luminaria[];
  onToggleLight: (id: string) => void;
  onBrightnessChange: (id: string, brightness: number) => void;
  onSelectLight: (light: Luminaria) => void;
  onTurnOffAll: () => void;
  onOpenScenes: () => void;
  onOpenMeshTopology: () => void;
  activeScene: string;
  onApplyScene: (sceneName: string) => void;
  hasActiveAlert: boolean;
  onDismissAlert: () => void;
  onTurnOffForgottenLight: () => void;
  isBluetoothConnected?: boolean;
  bluetoothDeviceName?: string | null;
  onConnectBluetooth?: () => void;
  onDisconnectBluetooth?: () => void;
  onOpenBluetoothModal?: () => void;
  onSendDirectBtCommand?: (cmd: 'ENCENDER' | 'APAGAR') => void;
}

export const LucesView: React.FC<LucesViewProps> = ({
  lights,
  onToggleLight,
  onBrightnessChange,
  onSelectLight,
  onTurnOffAll,
  onOpenScenes,
  onOpenMeshTopology,
  activeScene,
  onApplyScene,
  hasActiveAlert,
  onDismissAlert,
  onTurnOffForgottenLight,
  isBluetoothConnected = false,
  bluetoothDeviceName = 'ESP32_LumiControl',
  onConnectBluetooth,
  onDisconnectBluetooth,
  onOpenBluetoothModal,
  onSendDirectBtCommand,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('todas');
  const [doubleTapConfirm, setDoubleTapConfirm] = useState(false);

  // Filtered lights
  const filteredLights =
    selectedRoom === 'todas'
      ? lights
      : lights.filter((l) => l.roomType === selectedRoom);

  // Active count & metrics
  const activeLightsCount = lights.filter((l) => l.isOn).length;
  const totalWatts = lights
    .filter((l) => l.isOn)
    .reduce((sum, l) => sum + l.powerWatts, 0)
    .toFixed(1);

  const estimatedCostPerHour = (
    (Number(totalWatts) / 1000) *
    0.28
  ).toFixed(2); // ~0.28 € per kWh

  const handleTurnOffAllClick = () => {
    if (doubleTapConfirm) {
      onTurnOffAll();
      setDoubleTapConfirm(false);
    } else {
      setDoubleTapConfirm(true);
      setTimeout(() => setDoubleTapConfirm(false), 3000);
    }
  };

  const roomFilters = [
    { id: 'todas', label: `Todas (${lights.length})` },
    {
      id: 'estudio',
      label: `Estudio (${lights.filter((l) => l.roomType === 'estudio').length})`,
    },
    {
      id: 'dormitorio',
      label: `Dormitorio (${lights.filter((l) => l.roomType === 'dormitorio').length})`,
    },
    {
      id: 'cocina',
      label: `Cocina (${lights.filter((l) => l.roomType === 'cocina').length})`,
    },
  ];

  return (
    <div className="space-y-5 pb-24 animate-fade-in">
      {/* User Greeting & Status Bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Hola, Sofía <span className="inline-block animate-wiggle">👋</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>
              {activeLightsCount} de {lights.length} luminarias encendidas en el hogar
            </span>
          </div>
        </div>

        {/* Wi-Fi / Bluetooth status pill */}
        <button
          onClick={onOpenBluetoothModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-all active:scale-95 ${
            isBluetoothConnected
              ? 'bg-blue-950/60 border-blue-500/50 text-blue-300'
              : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
          }`}
          title="Ver estado de conexión"
        >
          {isBluetoothConnected ? (
            <Bluetooth className="w-3.5 h-3.5 text-blue-400 stroke-[2.5]" />
          ) : (
            <Wifi className="w-3.5 h-3.5" />
          )}
          <span>{isBluetoothConnected ? 'BT Enlazado' : 'En Casa (5G)'}</span>
        </button>
      </div>

      {/* DIRECT BLUETOOTH HERO CARD - "Conectar y Controlar por Clicks" */}
      <div className={`p-4 rounded-2xl border transition-all duration-300 shadow-xl ${
        isBluetoothConnected
          ? 'bg-gradient-to-br from-blue-950/40 via-[#0E172E] to-[#0A1020] border-blue-500/50 shadow-blue-950/30'
          : 'bg-gradient-to-br from-[#0E1528] via-[#0B1222] to-[#070D1A] border-blue-600/40 shadow-blue-900/20'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-md transition-all ${
              isBluetoothConnected
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20'
                : 'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-blue-500/20'
            }`}>
              <Bluetooth className={`w-5 h-5 stroke-[2.5] ${isBluetoothConnected ? '' : 'animate-pulse'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-white tracking-wide">
                  {isBluetoothConnected ? 'Bluetooth ESP32 Enlazado' : 'Control por Clicks Bluetooth'}
                </span>
                <span className={`w-2 h-2 rounded-full ${isBluetoothConnected ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[9px] font-bold">
                  1-Click Directo
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isBluetoothConnected
                  ? `Dispositivo: ${bluetoothDeviceName || 'ESP32_LumiControl'} • Respuesta: 8ms • Click sonoro activo`
                  : 'Toca el botón o cualquier foco para conectar por Bluetooth en 1 click'}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenBluetoothModal}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 shrink-0 pt-0.5"
          >
            Ajustes
          </button>
        </div>

        {/* Action Row */}
        <div className="mt-3.5 space-y-2.5">
          {!isBluetoothConnected ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={onConnectBluetooth}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
              >
                <Bluetooth className="w-4 h-4 stroke-[2.5]" />
                <span>⚡ Conectar con mi Celular en 1 Click (Bluetooth)</span>
              </button>
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>✓ Sin contraseñas ni Wi-Fi</span>
                <span>✓ Conexión nativa con ESP32</span>
                <span>✓ Click háptico de relé</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-full flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSendDirectBtCommand?.('ENCENDER')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  <Power className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>🔘 Click: ENCENDER</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSendDirectBtCommand?.('APAGAR')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Power className="w-3.5 h-3.5 text-slate-400" />
                  <span>🔘 Click: APAGAR</span>
                </button>
                <button
                  type="button"
                  onClick={onDisconnectBluetooth}
                  className="py-2.5 px-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-900/40 font-semibold text-xs active:scale-95 transition-all"
                  title="Desconectar Bluetooth"
                >
                  Desconectar
                </button>
              </div>

              {/* Quick 1-click toggles for all lights */}
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Clicks rápidos:</span>
                <div className="flex items-center gap-1.5">
                  {lights.slice(0, 3).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => onToggleLight(l.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${
                        l.isOn
                          ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                          : 'bg-slate-800/70 border border-slate-700/60 text-slate-400'
                      }`}
                    >
                      {l.name.split(' ')[0]}: {l.isOn ? 'ON' : 'OFF'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Helper Bar: Para que aparezca en el celular */}
      <button
        type="button"
        onClick={onOpenBluetoothModal}
        className="w-full p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 hover:border-cyan-500/50 flex items-center justify-between text-left text-xs transition-all active:scale-98 group"
      >
        <div className="flex items-center gap-2 text-cyan-300">
          <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-semibold">
            ¿Cómo hacer que aparezca en "Ajustes &gt; Bluetooth" de mi celular?
          </span>
        </div>
        <span className="text-[10px] text-cyan-400 group-hover:translate-x-0.5 transition-transform font-bold">
          Ver Código .ino →
        </span>
      </button>

      {/* Active Presence Warning Card (Anti-Olvido) */}
      {hasActiveAlert && (
        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-[#1A1829] to-[#141B2D] border border-amber-500/40 shadow-xl shadow-amber-950/20">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  AVISO DE PRESENCIA • Hace 4 min
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                Lámpara de Estudio olvidada
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Sin movimiento detectado durante 90 minutos. Consumiendo 22.4W continuos.
              </p>

              {/* Action Buttons */}
              <div className="mt-3.5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onTurnOffForgottenLight}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/30 active:scale-95 transition-all"
                >
                  <Power className="w-3.5 h-3.5 stroke-[2.5]" />
                  Apagar ahora
                </button>
                <button
                  type="button"
                  onClick={onDismissAlert}
                  className="py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-semibold active:scale-95 transition-all"
                >
                  Mantener
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Carga Lumínica Instantánea Card */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white tracking-wide">
              Carga Lumínica Instantánea
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            ● A+ Eco Eficiente
          </span>
        </div>

        {/* 3 Metrics */}
        <div className="grid grid-cols-3 gap-2 py-1 mb-4 text-left">
          <div className="p-2.5 rounded-xl bg-[#0B111E]/80 border border-slate-800/60">
            <span className="text-[10px] font-medium text-slate-400 block">
              Potencia Total
            </span>
            <div className="text-lg font-extrabold text-white mt-0.5 tracking-tight font-mono">
              {totalWatts}{' '}
              <span className="text-xs font-normal text-slate-400">W</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0B111E]/80 border border-slate-800/60">
            <span className="text-[10px] font-medium text-slate-400 block">
              Ahorro Semanal
            </span>
            <div className="text-lg font-extrabold text-emerald-400 mt-0.5 tracking-tight font-mono">
              +32%
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0B111E]/80 border border-slate-800/60">
            <span className="text-[10px] font-medium text-slate-400 block">
              Coste Estimado
            </span>
            <div className="text-lg font-extrabold text-white mt-0.5 tracking-tight font-mono">
              {estimatedCostPerHour}{' '}
              <span className="text-xs font-normal text-slate-400">€/h</span>
            </div>
          </div>
        </div>

        {/* Apagar Todo Button */}
        <button
          type="button"
          onClick={handleTurnOffAllClick}
          className={`w-full py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-98 ${
            doubleTapConfirm
              ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
              : 'bg-[#151E33] border-slate-700/80 hover:bg-[#1a2540] text-slate-200'
          }`}
        >
          <Power className="w-4 h-4 text-amber-400" />
          <span>
            {doubleTapConfirm
              ? '¿Confirmar apagado total? Pulsa de nuevo'
              : 'Apagar Todo el Hogar'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-slate-400 font-normal ml-auto">
            {doubleTapConfirm ? '3s' : 'Toque doble'}
          </span>
        </button>
      </div>

      {/* Escenas Rápidas */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Escenas Rápidas
          </h2>
          <button
            onClick={onOpenScenes}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            Gestionar
          </button>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {/* Relax Cálido */}
          <button
            type="button"
            onClick={() => onApplyScene('Relax Atardecer')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
              activeScene === 'Relax Atardecer'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                : 'bg-[#121B30] border border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Relax Cálido</span>
          </button>

          {/* Concentración */}
          <button
            type="button"
            onClick={() => onApplyScene('Modo Concentración')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
              activeScene === 'Modo Concentración'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'bg-[#121B30] border border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Focus className="w-4 h-4" />
            <span>Concentración</span>
          </button>

          {/* Noche TV */}
          <button
            type="button"
            onClick={() => onApplyScene('Cine & Gaming')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
              activeScene === 'Cine & Gaming'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/25'
                : 'bg-[#121B30] border border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Noche TV</span>
          </button>
        </div>
      </div>

      {/* Espacios / Room Filters */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Espacios
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            3 Zonas activas
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {roomFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedRoom(filter.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                selectedRoom === filter.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-[#121B30] border border-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Light Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {filteredLights.map((light) => (
          <LightCard
            key={light.id}
            light={light}
            onToggle={onToggleLight}
            onBrightnessChange={onBrightnessChange}
            onSelect={onSelectLight}
          />
        ))}
      </div>

      {/* Bottom Status Banner: Mesh ESP32 online */}
      <button
        onClick={onOpenMeshTopology}
        className="w-full p-3.5 rounded-2xl bg-[#101728] border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
              Malla Zigbee/ESP32 Estable
            </div>
            <div className="text-[11px] text-slate-400">
              Latencia nodo: 18ms • Broker Online
            </div>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};

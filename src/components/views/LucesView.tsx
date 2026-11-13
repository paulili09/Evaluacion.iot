import React, { useState } from 'react';
import {
  Bell,
  Zap,
  Power,
  ChevronRight,
  Flame,
  Focus,
  Tv,
  Radio,
  Bluetooth,
  Smartphone,
  Plus,
  Search,
  Box,
  Usb,
  Wifi,
  UserCheck,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { Luminaria } from '../../types';
import { AndroidDeviceNode, AuthUser } from '../../services/apiClient';
import { LightCard } from '../LightCard';

interface LucesViewProps {
  lights: Luminaria[];
  isLoading?: boolean;
  onToggleLight: (id: string) => void;
  onBrightnessChange: (id: string, brightness: number) => void;
  onSelectLight: (light: Luminaria) => void;
  onOpenCreateLight: () => void;
  onTurnOffAll: () => void;
  onOpenScenes: () => void;
  onOpenMeshTopology: () => void;
  onOpen3DView: () => void;
  activeScene: string;
  onApplyScene: (sceneName: string) => void;
  hasActiveAlert: boolean;
  onDismissAlert: () => void;
  onTurnOffForgottenLight: () => void;
  isBluetoothConnected?: boolean;
  isBluetoothAvailable?: boolean;
  bluetoothDeviceName?: string | null;
  bluetoothStatusMessage?: string;
  onConnectBluetooth?: () => void;
  onDisconnectBluetooth?: () => void;
  onOpenBluetoothModal?: () => void;
  onSendDirectBtCommand?: (cmd: 'ENCENDER' | 'APAGAR') => void;
  isUsbConnected?: boolean;
  usbDeviceName?: string | null;
  onOpenUsbModal?: () => void;
  devices?: AndroidDeviceNode[];
  activeDeviceId?: string;
  authUser?: AuthUser | null;
  onSwitchAccount?: () => void;
  onOpenDevicesTab?: () => void;
}

export const LucesView: React.FC<LucesViewProps> = ({
  lights,
  isLoading = false,
  onToggleLight,
  onBrightnessChange,
  onSelectLight,
  onOpenCreateLight,
  onTurnOffAll,
  onOpenScenes,
  onOpenMeshTopology,
  onOpen3DView,
  activeScene,
  onApplyScene,
  hasActiveAlert,
  onDismissAlert,
  onTurnOffForgottenLight,
  isBluetoothConnected = false,
  isBluetoothAvailable = true,
  bluetoothDeviceName = 'ESP32_LumiControl',
  bluetoothStatusMessage,
  onConnectBluetooth,
  onDisconnectBluetooth,
  onOpenBluetoothModal,
  onSendDirectBtCommand,
  isUsbConnected = false,
  usbDeviceName = null,
  onOpenUsbModal,
  devices = [],
  activeDeviceId,
  authUser,
  onSwitchAccount,
  onOpenDevicesTab,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [doubleTapConfirm, setDoubleTapConfirm] = useState(false);

  const filteredLights = lights.filter((l) => {
    const matchesRoom = selectedRoom === 'todas' || l.roomType === selectedRoom;
    const matchesSearch =
      !searchTerm.trim() ||
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.room.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRoom && matchesSearch;
  });

  const activeLightsCount = lights.filter((l) => l.isOn).length;
  const totalWatts = lights
    .filter((l) => l.isOn)
    .reduce((sum, l) => sum + l.powerWatts, 0)
    .toFixed(1);

  const estimatedCostPerHour = ((Number(totalWatts) / 1000) * 0.28).toFixed(2);

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
    { id: 'estudio', label: `Estudio (${lights.filter((l) => l.roomType === 'estudio').length})` },
    { id: 'dormitorio', label: `Dormitorio (${lights.filter((l) => l.roomType === 'dormitorio').length})` },
    { id: 'cocina', label: `Cocina (${lights.filter((l) => l.roomType === 'cocina').length})` },
    { id: 'salon', label: `Salón (${lights.filter((l) => l.roomType === 'salon').length})` },
  ];

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Greeting & Quick Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Panel de Luminarias
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {activeLightsCount} de {lights.length} luminarias activas · Sincronización JWT + ESP32 Bluetooth
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenUsbModal}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              isUsbConnected
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-[#121B30] hover:bg-[#192642] border-slate-700 text-slate-200'
            }`}
          >
            <Usb className="w-4 h-4 text-cyan-400" />
            <span>{isUsbConnected ? `USB: ${usbDeviceName || 'Conectado'}` : 'Sincronizar Cable USB'}</span>
          </button>

          <button
            type="button"
            onClick={onOpen3DView}
            className="px-3.5 py-2 rounded-xl bg-[#121B30] hover:bg-[#192642] border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Box className="w-4 h-4 text-cyan-400" />
            <span>Vista 3D</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateLight}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Luminaria</span>
          </button>
        </div>
      </div>

      {/* Top Two-Column Workspace on Desktop: Bluetooth 1-Click + Carga Lumínica */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DIRECT BLUETOOTH CARD */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-300 ${
            isBluetoothConnected
              ? 'bg-gradient-to-br from-blue-950/40 via-[#0E172E] to-[#0A1020] border-blue-500/50'
              : 'bg-[#101728] border-slate-800'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  isBluetoothConnected
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                }`}
              >
                <Bluetooth className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>
                    {isBluetoothConnected
                      ? `Bluetooth Enlazado: ${bluetoothDeviceName || 'Equipo BLE'}`
                      : 'Bluetooth Directo (Celular / ESP32)'}
                  </span>
                  {!isBluetoothConnected && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isBluetoothAvailable
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isBluetoothAvailable ? 'BT Encendido' : 'Enciende Bluetooth'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBluetoothConnected
                    ? `${bluetoothDeviceName || 'Equipo Bluetooth'} · Conectado y sincronizado en vivo`
                    : bluetoothStatusMessage ||
                      'Al encender el Bluetooth de tu celular o ESP32, pulsa Conectar para elegirlo'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenBluetoothModal}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold shrink-0 cursor-pointer"
            >
              Ajustes BT
            </button>
          </div>

          <div className="mt-4 space-y-2.5">
            {!isBluetoothConnected ? (
              <div className="space-y-2">
                {typeof window !== 'undefined' && window.self !== window.top && (
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 font-semibold text-[11px] flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                    <span>Abrir en pestaña directa (desbloquea Bluetooth real del navegador)</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={onConnectBluetooth}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Bluetooth className="w-4 h-4 stroke-[2.5]" />
                  <span>Buscar y Conectar Bluetooth (Celular / ESP32)</span>
                </button>
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Detecta dispositivos al encender BT</span>
                  <span>Celular &amp; ESP32</span>
                  <span>1-Click</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSendDirectBtCommand?.('ENCENDER')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Click: ENCENDER</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSendDirectBtCommand?.('APAGAR')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5 text-slate-400" />
                    <span>Click: APAGAR</span>
                  </button>
                  <button
                    type="button"
                    onClick={onDisconnectBluetooth}
                    className="py-2.5 px-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 hover:bg-rose-900/50 font-semibold text-xs cursor-pointer"
                  >
                    Desconectar
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Clicks rápidos:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {lights.slice(0, 3).map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => onToggleLight(l.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
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

          <button
            type="button"
            onClick={onOpenBluetoothModal}
            className="mt-3 w-full pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Configurar visibilidad en "Ajustes &gt; Bluetooth"</span>
            </span>
            <span className="text-[11px] font-semibold">Ver .ino →</span>
          </button>
        </div>

        {/* Carga Lumínica Instantánea */}
        <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Carga Lumínica Instantánea</h2>
              </div>
              <span className="text-xs text-emerald-400 font-semibold">Clase A+ Eco</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="p-3 rounded-xl bg-[#0B111E] border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Potencia Total</span>
                <div className="text-xl font-extrabold text-white mt-0.5 font-mono">
                  {totalWatts} <span className="text-xs font-normal text-slate-400">W</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B111E] border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Ahorro Semanal</span>
                <div className="text-xl font-extrabold text-emerald-400 mt-0.5 font-mono">+32%</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B111E] border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Coste Est.</span>
                <div className="text-xl font-extrabold text-white mt-0.5 font-mono">
                  {estimatedCostPerHour} <span className="text-xs font-normal text-slate-400">€/h</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTurnOffAllClick}
            className={`w-full py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
              doubleTapConfirm
                ? 'bg-rose-600 border-rose-500 text-white'
                : 'bg-[#151E33] border-slate-700/80 hover:bg-[#1a2540] text-slate-200'
            }`}
          >
            <Power className="w-4 h-4 text-amber-400" />
            <span>
              {doubleTapConfirm
                ? 'Confirmar apagado total (pulsa de nuevo)'
                : 'Apagar Todo el Hogar (API + MQTT)'}
            </span>
          </button>
        </div>
      </div>

      {/* Celulares y Dispositivos Sincronizados en Tiempo Real */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-cyan-500/30 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Celulares y Equipos Sincronizados ({devices.length})</span>
                {authUser && (
                  <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    Sesión: {authUser.full_name} (@{authUser.username})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Cada teléfono conectado por Cable USB, Código o Sesión JWT aparece aquí en vivo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onSwitchAccount && (
              <button
                type="button"
                onClick={onSwitchAccount}
                className="px-3 py-1.5 rounded-xl bg-[#141F36] hover:bg-[#1B2947] border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cambiar cuenta</span>
              </button>
            )}
            {onOpenUsbModal && (
              <button
                type="button"
                onClick={onOpenUsbModal}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Usb className="w-3.5 h-3.5" />
                <span>Vincular Celular (USB)</span>
              </button>
            )}
            {onOpenDevicesTab && (
              <button
                type="button"
                onClick={onOpenDevicesTab}
                className="px-3 py-1.5 rounded-xl bg-[#141F36] hover:bg-[#1B2947] border border-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
              >
                Ver Red Completa
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {devices.map((dev) => {
            const isCurrent = dev.id === activeDeviceId;
            return (
              <div
                key={dev.id}
                className={`p-3 rounded-xl border transition-colors ${
                  isCurrent
                    ? 'bg-cyan-950/30 border-cyan-500/50'
                    : 'bg-[#0B111E] border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">{dev.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">{dev.model}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isCurrent ? 'Este equipo' : 'Sincronizado'}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono">
                  <span
                    className={`flex items-center gap-1 ${
                      dev.channel === 'usb'
                        ? 'text-cyan-300'
                        : dev.channel === 'bluetooth'
                        ? 'text-blue-300'
                        : 'text-emerald-300'
                    }`}
                  >
                    {dev.channel === 'usb' ? (
                      <Usb className="w-3 h-3" />
                    ) : dev.channel === 'bluetooth' ? (
                      <Bluetooth className="w-3 h-3" />
                    ) : (
                      <Wifi className="w-3 h-3" />
                    )}
                    {dev.channel === 'usb'
                      ? 'Cable USB'
                      : dev.channel === 'bluetooth'
                      ? 'Bluetooth'
                      : 'Wi-Fi'}
                  </span>
                  <span className="text-slate-400">
                    {dev.channel === 'usb' ? '<1ms' : `${dev.rssiDbm} dBm`} · {dev.batteryPct}%
                  </span>
                </div>

                {(dev.usbDetails || dev.lastCommand) && (
                  <div className="mt-1.5 text-[10px] font-mono text-slate-400 truncate">
                    {dev.usbDetails || `Último: ${dev.lastCommand}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Presence Warning Card */}
      {hasActiveAlert && (
        <div className="p-4 rounded-2xl bg-[#141B2D] border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                Aviso Anti-Olvido · Sensor mmWave
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">
                Lámpara de Estudio encendida sin presencia detectada
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                90 minutos sin movimiento registrado · Consumo continuo de 22.4W.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onTurnOffForgottenLight}
              className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Apagar ahora</span>
            </button>
            <button
              type="button"
              onClick={onDismissAlert}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Mantener
            </button>
          </div>
        </div>
      )}

      {/* Escenas Rápidas + Filtros y Búsqueda */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
            Escenas:
          </span>
          <button
            type="button"
            onClick={() => onApplyScene('Relax Atardecer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeScene === 'Relax Atardecer'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-[#121B30] border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Relax Cálido</span>
          </button>
          <button
            type="button"
            onClick={() => onApplyScene('Modo Concentración')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeScene === 'Modo Concentración'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-[#121B30] border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Focus className="w-3.5 h-3.5" />
            <span>Concentración</span>
          </button>
          <button
            type="button"
            onClick={() => onApplyScene('Cine & Gaming')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
              activeScene === 'Cine & Gaming'
                ? 'bg-indigo-500 text-white font-bold'
                : 'bg-[#121B30] border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Noche TV</span>
          </button>
          <button
            type="button"
            onClick={onOpenScenes}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 px-2 whitespace-nowrap cursor-pointer"
          >
            Todas →
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar luminaria o zona..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#101728] border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Room Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {roomFilters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setSelectedRoom(filter.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedRoom === filter.id
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-[#121B30] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Skeleton Loaders o Grid de Luminarias */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Cargando luminarias">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-3 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 rounded-xl bg-slate-800" />
                <div className="w-12 h-6 rounded-full bg-slate-800" />
              </div>
              <div className="h-4 w-2/3 rounded bg-slate-800" />
              <div className="h-3 w-1/2 rounded bg-slate-800/70" />
              <div className="h-2 w-full rounded bg-slate-800 mt-4" />
            </div>
          ))}
        </div>
      ) : filteredLights.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#101728] border border-slate-800 text-center space-y-2">
          <p className="text-sm font-semibold text-white">No hay luminarias que coincidan</p>
          <p className="text-xs text-slate-400">
            Ajusta el filtro de habitación o crea una nueva luminaria vía API REST.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      )}

      {/* Mesh Topology Banner */}
      <button
        type="button"
        onClick={onOpenMeshTopology}
        className="w-full p-4 rounded-2xl bg-[#101728] border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between text-left cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
              Malla Zigbee / ESP32 Estable
            </div>
            <div className="text-[11px] text-slate-400">
              Latencia nodo: 18ms · Topología y nodos disponibles
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};

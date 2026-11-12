import React, { useState } from 'react';
import {
  ShieldCheck,
  Bell,
  Clock,
  Leaf,
  Power,
  RotateCcw,
  Sliders,
  MapPin,
  UserCheck,
  CheckCircle2,
  X,
  Radio,
  Plus,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Incidente } from '../../types';

interface AutomatizacionViewProps {
  onOpenNewRule: () => void;
  onOpenScenes: () => void;
  onTurnOffForgottenLight: () => void;
  hasActiveAlert: boolean;
  onDismissAlert: () => void;
  incidents: Incidente[];
  onUndoIncident: (id: string) => void;
}

export const AutomatizacionView: React.FC<AutomatizacionViewProps> = ({
  onOpenNewRule,
  onOpenScenes,
  onTurnOffForgottenLight,
  hasActiveAlert,
  onDismissAlert,
  incidents,
  onUndoIncident,
}) => {
  const [unreadCount, setUnreadCount] = useState<number>(4);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(true);
  const [inactivityThreshold, setInactivityThreshold] = useState<number>(30);
  const [isAdjustingThreshold, setIsAdjustingThreshold] = useState<boolean>(false);
  const [snoozedMessage, setSnoozedMessage] = useState<string | null>(null);

  const handleMarkAsRead = () => {
    setUnreadCount(0);
  };

  const handleSnooze = () => {
    setSnoozedMessage('Temporizador pospuesto por 15 minutos.');
    setTimeout(() => {
      setSnoozedMessage(null);
      onDismissAlert();
    }, 1800);
  };

  return (
    <div className="space-y-5 pb-24 animate-fade-in text-left">
      {/* Top Filter & Read Status Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {unreadCount} no leídas
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium whitespace-nowrap">
              Al día
            </span>
          )}

          <span className="px-3 py-1 rounded-full bg-[#121B30] border border-slate-800 text-slate-300 text-xs font-medium whitespace-nowrap">
            Filtro: Todas
          </span>
        </div>

        <button
          onClick={handleMarkAsRead}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold whitespace-nowrap transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Marcar leídas</span>
        </button>
      </div>

      {/* Title & Radar Status */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Centro Anti-Olvido
        </h1>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Radar Activo</span>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Avisos hoy */}
        <div className="p-3 rounded-2xl bg-[#101728] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Avisos hoy</span>
            <Bell className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">3</div>
          <span className="text-[10px] text-amber-400/90 font-medium mt-1">
            +1 vs ayer
          </span>
        </div>

        {/* Resp. media */}
        <div className="p-3 rounded-2xl bg-[#101728] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Resp. media</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            4.2<span className="text-xs font-normal text-slate-400 ml-0.5">m</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium mt-1">
            -1.1 min
          </span>
        </div>

        {/* Ahorro */}
        <div className="p-3 rounded-2xl bg-[#101728] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Ahorro</span>
            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            1.8<span className="text-xs font-normal text-slate-400 ml-0.5">kWh</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-1">
            ≈ $0.34 USD
          </span>
        </div>
      </div>

      {/* Critical Alert Card */}
      {hasActiveAlert && (
        <div className="relative p-4 rounded-2xl bg-[#141B2D] border border-amber-500/50 shadow-xl shadow-amber-950/30">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                ALERTA CRÍTICA • Ahora mismo
              </span>
            </div>
            <button
              onClick={onDismissAlert}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-extrabold text-white">
            ¡Luz encendida sin presencia!
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            <strong className="text-white">Lámpara de Estudio</strong> lleva{' '}
            <strong className="text-amber-300">90 minutos</strong> encendida sin
            registrar movimiento en el sensor PIR mmWave de estancia.
          </p>

          {/* Sensor mmWave tag */}
          <div className="mt-3 p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 text-[11px] text-cyan-300 font-mono">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sensor mmWave Estudio • 0.00 m/s mov.</span>
          </div>

          {/* Toast response if snoozed */}
          {snoozedMessage && (
            <div className="mt-2 text-xs font-semibold text-emerald-400">
              {snoozedMessage}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onTurnOffForgottenLight}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 active:scale-95 transition-all"
            >
              <Power className="w-3.5 h-3.5 stroke-[2.5]" />
              Apagar (MQTT)
            </button>
            <button
              type="button"
              onClick={handleSnooze}
              className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Clock className="w-3.5 h-3.5" />
              Posponer 15m
            </button>
          </div>
        </div>
      )}

      {/* Button to Create Rule */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenNewRule}
          className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nueva Regla Anti-Olvido</span>
        </button>

        <button
          type="button"
          onClick={onOpenScenes}
          className="py-3 px-4 rounded-2xl bg-[#121B30] border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 active:scale-98 transition-all"
        >
          <span>Escenas</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Incidentes Recientes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Incidentes Recientes
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Últimas 24 horas</span>
        </div>

        <div className="space-y-3">
          {incidents.map((incident) => {
            return (
              <div
                key={incident.id}
                className="p-4 rounded-2xl bg-[#101728] border border-slate-800/80 transition-all hover:border-slate-700"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      incident.type === 'auto-resolved'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : incident.type === 'geofence'
                        ? 'bg-cyan-500/15 text-cyan-400'
                        : 'bg-purple-500/15 text-purple-400'
                    }`}
                  >
                    {incident.type === 'auto-resolved' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : incident.type === 'geofence' ? (
                      <MapPin className="w-5 h-5" />
                    ) : (
                      <UserCheck className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-white truncate">
                        {incident.title}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          incident.type === 'auto-resolved'
                            ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-400'
                            : incident.type === 'geofence'
                            ? 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        ● {incident.typeLabel}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {incident.timeAgo} • {incident.specs}
                    </div>

                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {incident.description}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {incident.metricLabel}
                      </span>

                      {incident.canUndo && (
                        <button
                          type="button"
                          onClick={() => onUndoIncident(incident.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                        >
                          Deshacer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Umbrales & Alertas Sonoras */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Umbrales & Alertas Sonoras
              </h3>
              <p className="text-xs text-slate-400">
                Sensibilidad mmWave y tonos prioritarios
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSoundAlertsEnabled(!soundAlertsEnabled)}
            className={`w-12 h-6 rounded-full transition-colors flex items-center p-0.5 ${
              soundAlertsEnabled ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 flex items-center justify-center text-amber-400 transition-transform ${
                soundAlertsEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {soundAlertsEnabled && <CheckCircle2 className="w-3 h-3" />}
            </div>
          </button>
        </div>

        {/* Inactivity Threshold slider / display */}
        <div className="p-3 rounded-xl bg-[#0B111E] border border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-mono">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Umbral actual: {inactivityThreshold} min inactividad
            </span>
            <button
              onClick={() => setIsAdjustingThreshold(!isAdjustingThreshold)}
              className="text-amber-400 hover:text-amber-300 font-semibold text-xs flex items-center gap-0.5"
            >
              {isAdjustingThreshold ? 'Listo' : 'Ajustar >'}
            </button>
          </div>

          {isAdjustingThreshold && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <input
                type="range"
                min="5"
                max="90"
                step="5"
                value={inactivityThreshold}
                onChange={(e) => setInactivityThreshold(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-slate-800 accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>5 min (Rápido)</span>
                <span>30 min (Recomendado)</span>
                <span>90 min (Relax)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security local node note */}
      <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span>Protocolo Anti-Olvido ESP32 activo 24/7 en nodo local</span>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ShieldCheck,
  Bell,
  Clock,
  Leaf,
  Power,
  Sliders,
  MapPin,
  UserCheck,
  CheckCircle2,
  X,
  Radio,
  Plus,
  ChevronRight,
  Zap,
  Trash2,
} from 'lucide-react';
import { Incidente, ReglaAntiOlvido } from '../../types';
import { isSoundEnabled, setSoundEnabled, playRelayClick } from '../../services/soundEffects';

interface AutomatizacionViewProps {
  rules: ReglaAntiOlvido[];
  isLoading?: boolean;
  onToggleRule: (rule: ReglaAntiOlvido) => void;
  onDeleteRule: (id: string) => void;
  onOpenNewRule: () => void;
  onOpenScenes: () => void;
  onTurnOffForgottenLight: () => void;
  hasActiveAlert: boolean;
  onDismissAlert: () => void;
  incidents: Incidente[];
  onUndoIncident: (id: string) => void;
  unreadCount?: number;
  onMarkAllRead?: () => void;
}

export const AutomatizacionView: React.FC<AutomatizacionViewProps> = ({
  rules,
  isLoading = false,
  onToggleRule,
  onDeleteRule,
  onOpenNewRule,
  onOpenScenes,
  onTurnOffForgottenLight,
  hasActiveAlert,
  onDismissAlert,
  incidents,
  onUndoIncident,
  unreadCount,
  onMarkAllRead,
}) => {
  const [localUnreadDismissed, setLocalUnreadDismissed] = useState<boolean>(false);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(() => isSoundEnabled());
  const [inactivityThreshold, setInactivityThreshold] = useState<number>(() => {
    if (typeof window === 'undefined') return 30;
    const saved = Number(localStorage.getItem('lumi_inactivity_threshold'));
    return saved >= 5 && saved <= 90 ? saved : 30;
  });
  const [isAdjustingThreshold, setIsAdjustingThreshold] = useState<boolean>(false);
  const [snoozedMessage, setSnoozedMessage] = useState<string | null>(null);

  const effectiveUnreadCount =
    unreadCount !== undefined
      ? unreadCount
      : localUnreadDismissed
      ? 0
      : (hasActiveAlert ? 1 : 0) + incidents.length;

  const activeRules = rules.filter((r) => r.isActive);
  const totalSavedKwh = activeRules.reduce((sum, r) => sum + r.savedKwhWeekly, 0);
  const totalSavedUsd = activeRules.reduce((sum, r) => sum + r.savedUsdWeekly, 0);

  const handleToggleSoundAlerts = () => {
    const next = !soundAlertsEnabled;
    setSoundAlertsEnabled(next);
    setSoundEnabled(next);
    if (next) {
      playRelayClick(true);
    }
  };

  const handleThresholdChange = (val: number) => {
    setInactivityThreshold(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumi_inactivity_threshold', String(val));
    }
  };

  const handleMarkRead = () => {
    if (onMarkAllRead) {
      onMarkAllRead();
    } else {
      setLocalUnreadDismissed(true);
      onDismissAlert();
    }
  };

  const handleSnooze = () => {
    setSnoozedMessage('Temporizador pospuesto por 15 minutos.');
    setTimeout(() => {
      setSnoozedMessage(null);
      onDismissAlert();
    }, 1500);
  };

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Centro Anti-Olvido y Reglas API
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {effectiveUnreadCount > 0 ? `${effectiveUnreadCount} alertas recientes` : 'Alertas al día'} · Radar mmWave ESP32 activo
          </p>
        </div>

        <div className="flex items-center gap-2">
          {effectiveUnreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkRead}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Marcar leídas</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenNewRule}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Regla</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Reglas activas</span>
            <Bell className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {activeRules.length}
          </div>
          <span className="text-[11px] text-amber-400 mt-1 block">Sincronizadas con API</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Umbral Global</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {inactivityThreshold}<span className="text-xs font-normal text-slate-400 ml-0.5">m</span>
          </div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Radar mmWave activo</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Ahorro semanal</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {totalSavedKwh.toFixed(1)}<span className="text-xs font-normal text-slate-400 ml-0.5">kWh</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">≈ ${totalSavedUsd.toFixed(2)} USD</span>
        </div>
      </div>

      {/* Critical Alert Card */}
      {hasActiveAlert && (
        <div className="p-4 rounded-2xl bg-[#141B2D] border border-amber-500/40 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Alerta Crítica · Sensor mmWave Estudio
                </span>
                <h3 className="text-base font-bold text-white">Luz encendida sin presencia</h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismissAlert}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
              aria-label="Descartar alerta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Lámpara de Estudio lleva 90 minutos encendida sin registrar movimiento (0.00 m/s).
          </p>

          {snoozedMessage && (
            <div className="text-xs font-semibold text-emerald-400">{snoozedMessage}</div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onTurnOffForgottenLight}
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Apagar (API + MQTT)</span>
            </button>
            <button
              type="button"
              onClick={handleSnooze}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Posponer 15m</span>
            </button>
            <button
              type="button"
              onClick={onOpenScenes}
              className="py-2.5 px-4 rounded-xl bg-[#121B30] border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1 ml-auto cursor-pointer"
            >
              <span>Escenas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Real CRUD Rules from /api/reglas/ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Reglas Configuradas (/api/reglas/)
          </h2>
          <span className="text-xs text-slate-400">{rules.length} reglas</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-[#101728] border border-slate-800 animate-pulse space-y-2">
                <div className="h-4 w-1/2 bg-slate-800 rounded" />
                <div className="h-3 w-3/4 bg-slate-800/70 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl bg-[#101728] border border-slate-800 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">{rule.deviceLabel}</div>
                  <div className="text-xs text-slate-400">
                    Disparador: {rule.triggerType} · Espera: {rule.waitMinutes} min
                  </div>
                  <div className="text-[11px] text-emerald-400 font-medium">
                    Ahorro est.: {rule.savedKwhWeekly} kWh/sem · {rule.onlyNight ? 'Solo nocturno' : '24 horas'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleRule(rule)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 cursor-pointer ${
                      rule.isActive ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                    aria-label={`Activar o desactivar regla ${rule.deviceLabel}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                        rule.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRule(rule.id)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 cursor-pointer"
                    aria-label={`Eliminar regla ${rule.deviceLabel}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incidentes Recientes & Umbrales side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Incidentes Recientes
            </h2>
            <span className="text-xs text-slate-400">Últimas 24 horas</span>
          </div>

          <div className="space-y-3">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="p-4 rounded-2xl bg-[#101728] border border-slate-800/80 flex items-start gap-3"
              >
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
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white truncate">{incident.title}</h3>
                    <span className="text-[11px] font-semibold text-emerald-400 shrink-0">
                      {incident.typeLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {incident.timeAgo} · {incident.specs}
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
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                      >
                        Deshacer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Umbrales & Alertas Sonoras */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Sensibilidad Global
          </h2>
          <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Alertas Sonoras</h3>
                  <p className="text-xs text-slate-400">Relé y avisos</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleSoundAlerts}
                className={`w-12 h-6 rounded-full transition-colors flex items-center p-0.5 cursor-pointer ${
                  soundAlertsEnabled ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                    soundAlertsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#0B111E] border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5 font-mono">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  Umbral: {inactivityThreshold} min
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdjustingThreshold(!isAdjustingThreshold)}
                  className="text-amber-400 hover:text-amber-300 font-semibold text-xs cursor-pointer"
                >
                  {isAdjustingThreshold ? 'Listo' : 'Ajustar'}
                </button>
              </div>

              {isAdjustingThreshold && (
                <input
                  type="range"
                  min="5"
                  max="90"
                  step="5"
                  value={inactivityThreshold}
                  onChange={(e) => handleThresholdChange(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-slate-800 accent-amber-500 cursor-pointer"
                />
              )}
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Protocolo Anti-Olvido ESP32 activo 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

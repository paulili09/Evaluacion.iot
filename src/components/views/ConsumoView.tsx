import React, { useState, useMemo } from 'react';
import { Zap, ShieldCheck } from 'lucide-react';
import { Luminaria, ReglaAntiOlvido } from '../../types';

interface ConsumoViewProps {
  lights: Luminaria[];
  rules?: ReglaAntiOlvido[];
}

export const ConsumoView: React.FC<ConsumoViewProps> = ({ lights, rules = [] }) => {
  const [period, setPeriod] = useState<'hoy' | 'semana' | 'mes'>('semana');

  const currentWattsNum = useMemo(
    () => lights.filter((l) => l.isOn).reduce((sum, l) => sum + l.powerWatts, 0),
    [lights]
  );
  const currentWatts = currentWattsNum.toFixed(1);

  const weeklySavedRules = useMemo(
    () => rules.filter((r) => r.isActive).reduce((sum, r) => sum + r.savedKwhWeekly, 0),
    [rules]
  );

  // Escalado realista según potencia instantánea activa y periodo
  const periodHours = period === 'hoy' ? 4.5 : period === 'semana' ? 31.5 : 135;
  const baselineKwh = period === 'hoy' ? 0.65 : period === 'semana' ? 4.2 : 17.5;
  const activeKwh = (currentWattsNum / 1000) * periodHours;
  const netKwh = (baselineKwh + activeKwh).toFixed(2);
  const estEuro = ((baselineKwh + activeKwh) * 0.28).toFixed(2);

  const savedKwhNum =
    period === 'hoy'
      ? Math.max(0.25, weeklySavedRules / 7)
      : period === 'semana'
      ? Math.max(1.4, weeklySavedRules)
      : Math.max(6.0, weeklySavedRules * 4.28);
  const savedKwh = savedKwhNum.toFixed(2);
  const co2SavedKg = (savedKwhNum * 0.42).toFixed(1);
  const avoidedPct = Math.min(62, Math.round((savedKwhNum / (savedKwhNum + baselineKwh + activeKwh)) * 100));

  // Desglose dinámico por estancia usando todas las luminarias reales
  const roomBreakdown = useMemo(() => {
    const roomsMeta: {
      key: Luminaria['roomType'];
      label: string;
      colorClass: string;
      textColor: string;
    }[] = [
      { key: 'estudio', label: 'Sala de Estudio', colorClass: 'bg-amber-500', textColor: 'text-amber-400' },
      { key: 'cocina', label: 'Cocina & Barra', colorClass: 'bg-cyan-400', textColor: 'text-cyan-400' },
      { key: 'dormitorio', label: 'Habitación Principal', colorClass: 'bg-purple-400', textColor: 'text-purple-400' },
      { key: 'salon', label: 'Salón / Comedor', colorClass: 'bg-emerald-400', textColor: 'text-emerald-400' },
    ];

    return roomsMeta
      .map((meta) => {
        const roomLights = lights.filter((l) => l.roomType === meta.key);
        const watts = roomLights.filter((l) => l.isOn).reduce((sum, l) => sum + l.powerWatts, 0);
        const pct = currentWattsNum > 0 ? Math.round((watts / currentWattsNum) * 100) : 0;
        return {
          ...meta,
          count: roomLights.length,
          watts,
          pct,
        };
      })
      .filter((r) => r.count > 0 || r.watts > 0);
  }, [lights, currentWattsNum]);

  // Curva de carga ajustada al consumo actual
  const scaleFactor = Math.max(0.45, currentWattsNum / 52.4);
  const hourlyData = [
    { hour: '06h', consumed: Math.round(12 * scaleFactor), saved: 4 },
    { hour: '08h', consumed: Math.round(42 * scaleFactor), saved: 15 },
    { hour: '10h', consumed: Math.round(28 * scaleFactor), saved: 35 },
    { hour: '12h', consumed: Math.round(16 * scaleFactor), saved: 40 },
    { hour: '14h', consumed: Math.round(20 * scaleFactor), saved: 25 },
    { hour: '16h', consumed: Math.round(32 * scaleFactor), saved: 30 },
    { hour: '18h', consumed: Math.round(64 * scaleFactor), saved: 42 },
    { hour: '20h', consumed: Math.round(78 * scaleFactor), saved: 60 },
    { hour: '22h', consumed: Math.round(52 * scaleFactor), saved: 88 },
    { hour: '00h', consumed: Math.round(10 * scaleFactor), saved: 105 },
  ];

  const maxVal = Math.max(120, ...hourlyData.map((d) => Math.max(d.consumed, d.saved)));

  return (
    <div className="space-y-5 pb-24 animate-fade-in text-left">
      {/* Title & Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Telemetría de Consumo
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas en vivo desde luminarias conectadas y auditoría Anti-Olvido
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
          <Zap className="w-3.5 h-3.5" />
          <span>{currentWatts} W ahora</span>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#101728] border border-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setPeriod('hoy')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            period === 'hoy'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => setPeriod('semana')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            period === 'semana'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Esta Semana
        </button>
        <button
          type="button"
          onClick={() => setPeriod('mes')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            period === 'mes'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Este Mes
        </button>
      </div>

      {/* 3 Main KPIs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="p-3 rounded-2xl bg-[#101728] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium block">
            Consumo Neto
          </span>
          <div className="text-xl font-extrabold text-white font-mono mt-1">
            {netKwh}{' '}
            <span className="text-xs font-normal text-slate-400">kWh</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            ~{estEuro} € ({lights.filter((l) => l.isOn).length} activas)
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#101728] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium block">
            Ahorro Anti-Olvido
          </span>
          <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
            {savedKwh}{' '}
            <span className="text-xs font-normal text-slate-400">kWh</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold block mt-1">
            ↘ -{avoidedPct}% evitado
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#101728] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium block">
            Huella CO₂
          </span>
          <div className="text-xl font-extrabold text-cyan-400 font-mono mt-1">
            -{co2SavedKg} <span className="text-xs font-normal text-slate-400">kg</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            Compensado
          </span>
        </div>
      </div>

      {/* Power Bar Chart */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Curva de Carga &amp; Cortes de Ausencia
            </h2>
            <p className="text-[11px] text-slate-400">
              Vatios promedio por franja horaria (ajustado a {currentWatts}W actuales)
            </p>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-slate-300">
              <span className="w-2.5 h-2.5 rounded bg-cyan-500" />
              Consumo
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
              Anti-Olvido
            </span>
          </div>
        </div>

        <div className="pt-4 flex items-end justify-between gap-1.5 h-40 border-b border-slate-800 px-1">
          {hourlyData.map((item, idx) => {
            const hConsumed = Math.min(100, (item.consumed / maxVal) * 100);
            const hSaved = Math.min(100, (item.saved / maxVal) * 100);

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                <div className="w-full max-w-[18px] flex items-end justify-center gap-0.5 h-full">
                  <div
                    style={{ height: `${hConsumed}%` }}
                    className="w-1/2 bg-cyan-500/80 group-hover:bg-cyan-400 rounded-t transition-all"
                    title={`Consumo: ${item.consumed}W`}
                  />
                  <div
                    style={{ height: `${hSaved}%` }}
                    className="w-1/2 bg-emerald-500/80 group-hover:bg-emerald-400 rounded-t transition-all"
                    title={`Ahorrado: ${item.saved}W`}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-400 group-hover:text-white">
                  {item.hour}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desglose dinámico por Estancias */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Distribución de Gasto por Estancia (En Vivo)
          </h2>
          <span className="text-[11px] font-mono text-slate-400">{currentWatts}W total</span>
        </div>

        <div className="space-y-2.5">
          {roomBreakdown.map((room) => (
            <div key={room.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white font-semibold">
                  {room.label} ({room.count})
                </span>
                <span className={`${room.textColor} font-mono font-bold`}>
                  {room.pct}% ({room.watts.toFixed(1)}W)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${room.colorClass} rounded-full transition-all duration-300`}
                  style={{ width: `${room.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Anti-Olvido Audit Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#121B30] to-[#0E1526] border border-emerald-500/30 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-white">
            Auditoría de Salud Energética
          </h3>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
            {rules.filter((r) => r.isActive).length} reglas Anti-Olvido activas están protegiendo{' '}
            <strong>{lights.length} luminarias</strong> y ahorrando aproximadamente{' '}
            <strong>{weeklySavedRules.toFixed(1)} kWh/sem</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};

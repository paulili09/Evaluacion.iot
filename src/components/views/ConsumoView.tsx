import React, { useState } from 'react';
import {
  Zap,
  TrendingDown,
  DollarSign,
  Leaf,
  Calendar,
  Clock,
  ShieldCheck,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';
import { Luminaria } from '../../types';

interface ConsumoViewProps {
  lights: Luminaria[];
}

export const ConsumoView: React.FC<ConsumoViewProps> = ({ lights }) => {
  const [period, setPeriod] = useState<'hoy' | 'semana' | 'mes'>('semana');

  const currentWatts = lights
    .filter((l) => l.isOn)
    .reduce((sum, l) => sum + l.powerWatts, 0)
    .toFixed(1);

  // Hourly consumption data for visual chart
  const hourlyData = [
    { hour: '06h', consumed: 12, saved: 0 },
    { hour: '08h', consumed: 45, saved: 15 },
    { hour: '10h', consumed: 28, saved: 35 },
    { hour: '12h', consumed: 15, saved: 40 },
    { hour: '14h', consumed: 18, saved: 25 },
    { hour: '16h', consumed: 32, saved: 30 },
    { hour: '18h', consumed: 68, saved: 42 },
    { hour: '20h', consumed: 85, saved: 60 },
    { hour: '22h', consumed: 54, saved: 90 },
    { hour: '00h', consumed: 8, saved: 110 },
  ];

  const maxVal = 120;

  return (
    <div className="space-y-5 pb-24 animate-fade-in text-left">
      {/* Title & Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Telemetría de Consumo
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas de potencia y auditoría de consumos fantasma
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
          onClick={() => setPeriod('hoy')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            period === 'hoy'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => setPeriod('semana')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            period === 'semana'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Esta Semana
        </button>
        <button
          onClick={() => setPeriod('mes')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
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
            {period === 'hoy' ? '1.4' : period === 'semana' ? '9.8' : '41.2'}{' '}
            <span className="text-xs font-normal text-slate-400">kWh</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {period === 'hoy' ? '~0.39 €' : period === 'semana' ? '~2.74 €' : '~11.53 €'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#101728] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium block">
            Ahorro Anti-Olvido
          </span>
          <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
            {period === 'hoy' ? '0.35' : period === 'semana' ? '2.10' : '8.90'}{' '}
            <span className="text-xs font-normal text-slate-400">kWh</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold block mt-1">
            ↘ -34% evitado
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#101728] border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium block">
            Huella CO₂
          </span>
          <div className="text-xl font-extrabold text-cyan-400 font-mono mt-1">
            -4.2 <span className="text-xs font-normal text-slate-400">kg</span>
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
              Curva de Carga & Cortes de Ausencia
            </h2>
            <p className="text-[11px] text-slate-400">
              Vatios promedio por franja horaria
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

        {/* Bar chart representation */}
        <div className="pt-4 flex items-end justify-between gap-1.5 h-40 border-b border-slate-800 px-1">
          {hourlyData.map((item, idx) => {
            const hConsumed = (item.consumed / maxVal) * 100;
            const hSaved = (item.saved / maxVal) * 100;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                <div className="w-full max-w-[18px] flex items-end justify-center gap-0.5 h-full">
                  {/* Consumed bar */}
                  <div
                    style={{ height: `${hConsumed}%` }}
                    className="w-1/2 bg-cyan-500/80 group-hover:bg-cyan-400 rounded-t transition-all"
                    title={`Consumo: ${item.consumed}W`}
                  />
                  {/* Saved bar */}
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

      {/* Desglose por Estancias */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Distribución de Gasto por Estancia
        </h2>

        <div className="space-y-2.5">
          {/* Estudio */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white font-semibold">Sala de Estudio</span>
              <span className="text-amber-400 font-mono font-bold">42% (22.4W)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '42%' }} />
            </div>
          </div>

          {/* Cocina */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white font-semibold">Cocina & Barra</span>
              <span className="text-cyan-400 font-mono font-bold">31% (16.0W)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: '31%' }} />
            </div>
          </div>

          {/* Dormitorio */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white font-semibold">Habitación Principal</span>
              <span className="text-purple-400 font-mono font-bold">27% (14.0W)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full" style={{ width: '27%' }} />
            </div>
          </div>
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
            Se han prevenido <strong>38.5 horas</strong> de consumo fantasma este mes gracias a los 14 cortes automáticos ejecutados por los sensores mmWave.
          </p>
        </div>
      </div>
    </div>
  );
};

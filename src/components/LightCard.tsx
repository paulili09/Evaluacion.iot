import React from 'react';
import { Lamp, Lightbulb, Sparkles, Sliders, Check } from 'lucide-react';
import { Luminaria } from '../types';

interface LightCardProps {
  light: Luminaria;
  onToggle: (id: string, e?: React.MouseEvent) => void;
  onBrightnessChange: (id: string, value: number) => void;
  onSelect: (light: Luminaria) => void;
}

export const LightCard: React.FC<LightCardProps> = ({
  light,
  onToggle,
  onBrightnessChange,
  onSelect,
}) => {
  const getLightIcon = () => {
    switch (light.iconType) {
      case 'lamp':
        return Lamp;
      case 'ceiling':
        return Sliders;
      case 'strip':
        return Sparkles;
      case 'spot':
      case 'bedside':
      default:
        return Lightbulb;
    }
  };

  const Icon = getLightIcon();

  return (
    <div
      onClick={() => onSelect(light)}
      className={`relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left select-none ${
        light.isOn
          ? 'bg-[#121B30] border-slate-700/80 shadow-lg shadow-black/20 hover:border-amber-500/40'
          : 'bg-[#0E1526]/80 border-slate-800/60 opacity-80 hover:opacity-100 hover:border-slate-700'
      }`}
    >
      {/* Top row: Icon & Switch */}
      <div className="flex items-center justify-between mb-3">
        {/* Icon (Click to toggle) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(light.id, e);
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
            light.isOn
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-md shadow-amber-500/10'
              : 'bg-slate-800/70 text-slate-500 border border-slate-700/50 hover:text-slate-300'
          }`}
          title="Click para encender o apagar"
        >
          <Icon className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Toggle switch with checkmark */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(light.id, e);
          }}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex items-center p-0.5 ${
            light.isOn ? 'bg-amber-500' : 'bg-slate-700'
          }`}
          aria-label={`Encender o apagar ${light.name}`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-slate-950 flex items-center justify-center text-amber-400 transition-transform duration-200 shadow-sm ${
              light.isOn ? 'translate-x-6' : 'translate-x-0'
            }`}
          >
            {light.isOn ? (
              <Check className="w-3 h-3 text-amber-400 stroke-[3]" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-500" />
            )}
          </div>
        </button>
      </div>

      {/* Meta tag */}
      <div className="flex items-center gap-1.5 text-[11px] mb-1">
        {light.pirActive && (
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            PIR Activo
          </span>
        )}
        {light.modeLabel && (
          <span className="text-amber-300/90 font-medium truncate">
            {light.modeLabel}
          </span>
        )}
        {light.scheduleLabel && (
          <span className="text-slate-400 font-medium">
            ⏱ {light.scheduleLabel}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-white tracking-tight truncate mb-0.5">
        {light.name}
      </h3>

      {/* Room & Power */}
      <p className="text-xs text-slate-400 truncate mb-3">
        {light.room} •{' '}
        <span className={light.isOn ? 'text-amber-400/90 font-semibold' : 'text-slate-500'}>
          {light.isOn ? `${light.powerWatts}W` : 'Inactivo'}
        </span>
      </p>

      {/* Brightness bar & control */}
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-1.5">
          <span>Brillo</span>
          <span className={light.isOn ? 'text-white font-semibold' : 'text-slate-500'}>
            {light.isOn ? `${light.brightness}%` : '0%'}
          </span>
        </div>

        <div className="relative flex items-center">
          <input
            type="range"
            min="1"
            max="100"
            disabled={!light.isOn}
            value={light.isOn ? light.brightness : 0}
            onChange={(e) => onBrightnessChange(light.id, Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-amber-500 focus:outline-none disabled:opacity-40"
          />
        </div>
      </div>
    </div>
  );
};

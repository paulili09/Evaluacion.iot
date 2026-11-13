import React, { useState, useEffect } from 'react';
import { X, Sun, Flame, Sliders, Check, Radio, Trash2 } from 'lucide-react';
import { Luminaria } from '../types';

interface LightDetailModalProps {
  light: Luminaria | null;
  onClose: () => void;
  onUpdate: (updated: Luminaria) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}

export const LightDetailModal: React.FC<LightDetailModalProps> = ({
  light,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [name, setName] = useState(light?.name ?? '');
  const [room, setRoom] = useState(light?.room ?? '');
  const [brightness, setBrightness] = useState(light?.brightness ?? 80);
  const [colorTemp, setColorTemp] = useState(light?.colorTemp ?? 3000);
  const [isOn, setIsOn] = useState(light?.isOn ?? false);
  const [pirEnabled, setPirEnabled] = useState(light?.pirActive ?? false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (light) {
      setName(light.name);
      setRoom(light.room);
      setBrightness(light.brightness);
      setColorTemp(light.colorTemp);
      setIsOn(light.isOn);
      setPirEnabled(light.pirActive ?? false);
      setConfirmDelete(false);
    }
  }, [light]);

  if (!light) return null;

  const handleSave = async () => {
    setIsBusy(true);
    try {
      await onUpdate({
        ...light,
        name: name.trim() || light.name,
        room: room.trim() || light.room,
        isOn,
        brightness,
        colorTemp,
        pirActive: pirEnabled,
        powerWatts: isOn ? Number(((brightness / 100) * 25).toFixed(1)) : 0,
      });
      onClose();
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsBusy(true);
    try {
      await onDelete(light.id);
      onClose();
    } finally {
      setIsBusy(false);
    }
  };

  const tempPresets = [
    { label: 'Cálido Vela (2000K)', value: 2000, color: '#FF9E4A' },
    { label: 'Hogar Cálido (2700K)', value: 2700, color: '#FFB877' },
    { label: 'Lectura Neutra (4000K)', value: 4000, color: '#FFF1E0' },
    { label: 'Luz Solar Fría (6000K)', value: 6000, color: '#D9EEFF' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0E1526] border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 text-white max-h-[90vh] overflow-y-auto shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-amber-400 uppercase">
              PATCH / DELETE · {light.id}
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">{light.name}</h2>
            <p className="text-xs text-slate-400">{light.room}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Editable Name & Room */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="edit-lum-name" className="block text-[11px] font-medium text-slate-400 mb-1">
              Nombre de luminaria
            </label>
            <input
              id="edit-lum-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090E1C] border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label htmlFor="edit-lum-room" className="block text-[11px] font-medium text-slate-400 mb-1">
              Habitación
            </label>
            <input
              id="edit-lum-room"
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#090E1C] border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Main On/Off Switch */}
        <div className="mt-4 p-4 rounded-2xl bg-[#131D33] border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isOn ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'
              }`}
            >
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Estado de la Luminaria</p>
              <p className="text-xs text-slate-400">
                {isOn ? 'Encendida · Consumo activo' : 'Apagada · 0.0W Standby'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOn(!isOn)}
            className={`w-14 h-8 rounded-full transition-colors flex items-center p-1 cursor-pointer ${
              isOn ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-slate-950 flex items-center justify-center text-amber-400 transition-transform ${
                isOn ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {isOn && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </button>
        </div>

        {/* Brightness Slider */}
        <div className="mt-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Intensidad de Brillo
            </span>
            <span className="text-sm font-bold text-amber-400 font-mono">
              {isOn ? `${brightness}%` : '0%'}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            disabled={!isOn}
            value={isOn ? brightness : 0}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-amber-500 disabled:opacity-40"
          />
        </div>

        {/* Color Temperature (Kelvin) */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              Temperatura de Color (CCT)
            </span>
            <span className="text-sm font-bold text-amber-300 font-mono">
              {colorTemp} K
            </span>
          </div>

          <div
            className="w-full h-4 rounded-xl mb-3 border border-slate-700"
            style={{
              background: 'linear-gradient(to right, #FF9E4A, #FFD1A4, #FFF4E8, #CDE5FF)',
            }}
          />

          <input
            type="range"
            min="2000"
            max="6500"
            step="100"
            disabled={!isOn}
            value={colorTemp}
            onChange={(e) => setColorTemp(Number(e.target.value))}
            className="w-full h-2.5 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-amber-400 disabled:opacity-40"
          />

          <div className="grid grid-cols-2 gap-2 mt-3">
            {tempPresets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                disabled={!isOn}
                onClick={() => setColorTemp(preset.value)}
                className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border text-left transition-colors cursor-pointer ${
                  colorTemp === preset.value
                    ? 'border-amber-400 bg-amber-500/10 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                  style={{ backgroundColor: preset.color }}
                />
                <span className="truncate">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PIR Toggle */}
        <div className="mt-5 p-4 rounded-2xl bg-[#131D33] border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Sensor mmWave / PIR</p>
              <p className="text-xs text-slate-400">
                {pirEnabled ? 'Supervisión de presencia activa' : 'Apagado manual únicamente'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPirEnabled(!pirEnabled)}
            className={`w-12 h-6 rounded-full transition-colors flex items-center p-0.5 cursor-pointer ${
              pirEnabled ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                pirEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Telemetry payload preview */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-400">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span>Payload MQTT + API PATCH</span>
            <span className="text-emerald-400 font-semibold">QoS 1</span>
          </div>
          <code className="text-amber-300 break-all">
            {`lumi/${light.roomType}/${light.id}/set -> {"state":"${
              isOn ? 'ON' : 'OFF'
            }","bri":${isOn ? brightness : 0},"cct":${colorTemp},"pir":${pirEnabled}}`}
          </code>
        </div>

        {/* Delete + Save Actions */}
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {onDelete && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleDeleteClick}
              className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                confirmDelete
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/40'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{confirmDelete ? 'Confirmar Eliminar' : 'Eliminar'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isBusy ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Plus, Lamp, Lightbulb, Sparkles, Sliders } from 'lucide-react';
import { Luminaria } from '../types';

interface CreateLuminariaModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    room: string;
    roomType: Luminaria['roomType'];
    brightness: number;
    colorTemp: number;
    iconType: Luminaria['iconType'];
    isOn: boolean;
  }) => Promise<void>;
}

export const CreateLuminariaModal: React.FC<CreateLuminariaModalProps> = ({
  isOpen,
  isSubmitting,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('Estudio');
  const [roomType, setRoomType] = useState<Luminaria['roomType']>('estudio');
  const [iconType, setIconType] = useState<Luminaria['iconType']>('lamp');
  const [brightness, setBrightness] = useState(80);
  const [colorTemp, setColorTemp] = useState(3200);
  const [isOn, setIsOn] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Ingresa un nombre para la luminaria.');
      return;
    }
    setErrorMsg(null);
    try {
      await onCreate({
        name: name.trim(),
        room: room.trim() || 'Estudio',
        roomType,
        brightness,
        colorTemp,
        iconType,
        isOn,
      });
      setName('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'No se pudo crear la luminaria en el servidor.');
    }
  };

  const iconOptions: { value: Luminaria['iconType']; label: string; icon: React.ReactNode }[] = [
    { value: 'lamp', label: 'Lámpara', icon: <Lamp className="w-4 h-4" /> },
    { value: 'ceiling', label: 'Plafón', icon: <Sliders className="w-4 h-4" /> },
    { value: 'strip', label: 'Tira LED', icon: <Sparkles className="w-4 h-4" /> },
    { value: 'spot', label: 'Foco Spot', icon: <Lightbulb className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0E1526] border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 text-white max-h-[92vh] overflow-y-auto shadow-2xl text-left">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-amber-400 uppercase">
              POST /api/luminarias/ (JWT Protected)
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">Nueva Luminaria IoT</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor="lum-name" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre del dispositivo
            </label>
            <input
              id="lum-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Foco Terraza Norte"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#090E1C] border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lum-room" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre de habitación
              </label>
              <input
                id="lum-room"
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Estudio"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090E1C] border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label htmlFor="lum-roomtype" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Zona del modelo 3D
              </label>
              <select
                id="lum-roomtype"
                value={roomType}
                onChange={(e) => {
                  const val = e.target.value as Luminaria['roomType'];
                  setRoomType(val);
                  if (val === 'estudio') setRoom('Estudio');
                  if (val === 'dormitorio') setRoom('Dormitorio Ppal');
                  if (val === 'cocina') setRoom('Cocina');
                  if (val === 'salon') setRoom('Salón');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090E1C] border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="estudio">Estudio</option>
                <option value="dormitorio">Dormitorio</option>
                <option value="cocina">Cocina</option>
                <option value="salon">Salón</option>
              </select>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo de Luminaria</span>
            <div className="grid grid-cols-4 gap-2">
              {iconOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIconType(opt.value)}
                  className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${
                    iconType === opt.value
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-[#090E1C] border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.icon}
                  <span className="text-[11px]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Brillo inicial</span>
                <span className="text-amber-400 font-mono font-bold">{brightness}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold">Temperatura</span>
                <span className="text-amber-300 font-mono font-bold">{colorTemp} K</span>
              </div>
              <input
                type="range"
                min="2000"
                max="6500"
                step="100"
                value={colorTemp}
                onChange={(e) => setColorTemp(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          <label className="flex items-center justify-between p-3 rounded-xl bg-[#090E1C] border border-slate-800 cursor-pointer">
            <span className="text-xs font-semibold text-slate-200">Encender inmediatamente al registrar</span>
            <input
              type="checkbox"
              checked={isOn}
              onChange={(e) => setIsOn(e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
          </label>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? 'Guardando...' : 'Crear en API'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

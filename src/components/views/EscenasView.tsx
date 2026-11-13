import React, { useState } from 'react';
import {
  Sparkles,
  Flame,
  Focus,
  Tv,
  Moon,
  Sliders,
  Play,
  Check,
  MoreVertical,
  Sun,
  Clock,
  BookmarkPlus,
  Trash2,
} from 'lucide-react';
import { Escena, Luminaria } from '../../types';

interface EscenasViewProps {
  escenas: Escena[];
  lights?: Luminaria[];
  activeSceneId: string;
  onActivateScene: (id: string) => void;
  onCreateScene?: (payload: {
    name: string;
    category?: 'favoritas' | 'circadianas' | 'inmersivas';
    temperature: number;
    intensity: number;
    targetZones: ('estudio' | 'dormitorio' | 'cocina' | 'salon')[];
    transitionType: 'smooth' | 'instant';
    activateNow?: boolean;
  }) => Promise<void> | void;
  onDeleteScene?: (id: string) => Promise<void> | void;
  onBack?: () => void;
}

export const EscenasView: React.FC<EscenasViewProps> = ({
  escenas,
  lights = [],
  activeSceneId,
  onActivateScene,
  onCreateScene,
  onDeleteScene,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'favoritas' | 'circadianas' | 'inmersivas'>('favoritas');
  const [transitionType, setTransitionType] = useState<'smooth' | 'instant'>('smooth');
  const [syncedZones, setSyncedZones] = useState<{
    estudio: boolean;
    salon: boolean;
    dormitorio: boolean;
    cocina: boolean;
  }>({
    estudio: true,
    salon: true,
    dormitorio: false,
    cocina: false,
  });
  const [customName, setCustomName] = useState<string>('');
  const [composerKelvin, setComposerKelvin] = useState<number>(2700);
  const [composerIntensity, setComposerIntensity] = useState<number>(75);
  const [circadianEnabled, setCircadianEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('lumi_circadian_enabled') !== 'false';
  });
  const [openMenuSceneId, setOpenMenuSceneId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  const filteredScenes = escenas.filter((s) => {
    if (selectedCategory === 'favoritas') return true;
    return s.category === selectedCategory;
  });

  const activeZones = (Object.keys(syncedZones) as ('estudio' | 'salon' | 'dormitorio' | 'cocina')[]).filter(
    (k) => syncedZones[k]
  );

  const countLightsInZone = (zone: 'estudio' | 'salon' | 'dormitorio' | 'cocina') =>
    lights.filter((l) => l.roomType === zone).length;

  const handleToggleCircadian = () => {
    const next = !circadianEnabled;
    setCircadianEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumi_circadian_enabled', String(next));
    }
  };

  const handleSaveCustomScene = async () => {
    const targetZones = activeZones.length > 0 ? activeZones : (['estudio'] as ('estudio' | 'salon' | 'dormitorio' | 'cocina')[]);
    const resolvedName = customName.trim() || `Ambiente ${composerKelvin}K`;

    setIsSaving(true);
    try {
      if (onCreateScene) {
        await onCreateScene({
          name: resolvedName,
          category: composerKelvin <= 3000 ? 'circadianas' : 'inmersivas',
          temperature: composerKelvin,
          intensity: composerIntensity,
          targetZones,
          transitionType,
          activateNow: true,
        });
      }
      setCustomName('');
      setSavedSuccessMsg(`¡Escena "${resolvedName}" guardada y aplicada a ${targetZones.length} zona(s)!`);
      setTimeout(() => setSavedSuccessMsg(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const kelvinLabel =
    composerKelvin <= 2800
      ? 'Cálido Hogar'
      : composerKelvin <= 4200
      ? 'Neutro Balanceado'
      : 'Frío Concentración';

  return (
    <div className="space-y-5 pb-24 animate-fade-in text-left">
      {/* Top Header line */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[11px] font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          Scene Studio 2.4
        </span>

        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {activeZones.length} Zonas seleccionadas
        </span>
      </div>

      {/* Main Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Escenas Inteligentes
        </h1>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          Ambientes predefinidos con calibración circadiana, atenuación háptica y orquestación grupal ESP32.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCategory('favoritas')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === 'favoritas'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-[#121B30] border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          Todas ({escenas.length})
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('circadianas')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === 'circadianas'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-[#121B30] border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
          Circadianas
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('inmersivas')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === 'inmersivas'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-[#121B30] border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          Inmersivas
        </button>
      </div>

      {/* Featured Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl h-44 sm:h-52 group">
        <img
          src="/src/assets/images/smart_home_evening_scene_1794437958578.jpg"
          alt="Atardecer Mediterráneo"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase drop-shadow">
              Perfil Solar Activo
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight drop-shadow-md">
              Atardecer Mediterráneo
            </h3>
          </div>

          <div className="text-right">
            <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-bold text-amber-300">
              Ciclo {circadianEnabled ? 'Auto Activo' : 'En Pausa'}
            </span>
            <span className="block text-[10px] text-slate-300 mt-1 font-medium">
              Transición progresiva
            </span>
          </div>
        </div>
      </div>

      {/* Escenas Populares */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Escenas Disponibles
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            Toque para conmutar
          </span>
        </div>

        <div className="space-y-3">
          {filteredScenes.map((scene) => {
            const isActive = activeSceneId === scene.id;
            const isMenuOpen = openMenuSceneId === scene.id;

            return (
              <div
                key={scene.id}
                className={`p-4 rounded-2xl border transition-all relative ${
                  isActive
                    ? 'bg-[#121B30] border-amber-500/70 shadow-lg shadow-amber-950/20'
                    : 'bg-[#101728] border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {scene.id === 'sc-1' ? (
                        <Flame className="w-5 h-5" />
                      ) : scene.id === 'sc-2' ? (
                        <Focus className="w-5 h-5" />
                      ) : scene.id === 'sc-3' ? (
                        <Tv className="w-5 h-5" />
                      ) : (
                        <Moon className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white">
                          {scene.name}
                        </h3>
                        {scene.badge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              scene.badgeType === 'live'
                                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                                : scene.badgeType === 'pir'
                                ? 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-400'
                                : scene.badgeType === 'immersive'
                                ? 'bg-purple-950/60 border border-purple-500/30 text-purple-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {scene.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {scene.description}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenMenuSceneId(isMenuOpen ? null : scene.id)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                      aria-label={`Opciones de ${scene.name}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-20 w-44 rounded-xl bg-[#0B111E] border border-slate-700 shadow-2xl p-1.5 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            onActivateScene(scene.id);
                            setOpenMenuSceneId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 flex items-center gap-2 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 text-amber-400" />
                          <span>Activar ahora</span>
                        </button>
                        {scene.isCustom && onDeleteScene && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteScene(scene.id);
                              setOpenMenuSceneId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/60 text-xs text-rose-300 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar escena</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Grid 3 metrics */}
                <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-xl bg-[#0B111E] border border-slate-800/80 text-left font-mono">
                  <div>
                    <span className="text-[10px] font-sans text-slate-400 block">
                      {scene.id === 'sc-3' ? 'Tonalidad' : 'Temperatura'}
                    </span>
                    <span className="text-xs font-bold text-amber-300">
                      {scene.tempLabel || `${scene.temperature} K`}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-sans text-slate-400 block">
                      {scene.id === 'sc-3' ? 'Fondo TV' : 'Intensidad'}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {scene.intensity}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-sans text-slate-400 block">
                      {scene.id === 'sc-2'
                        ? 'Sensor PIR'
                        : scene.id === 'sc-3'
                        ? 'Perímetro'
                        : scene.id === 'sc-4'
                        ? 'Disparador'
                        : 'Consumo'}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      {scene.id === 'sc-2'
                        ? '1.2m'
                        : scene.id === 'sc-3'
                        ? 'OFF'
                        : scene.id === 'sc-4'
                        ? 'Radar 24G'
                        : `${scene.powerWatts} W`}
                    </span>
                  </div>
                </div>

                {/* Footer note & Action button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {scene.footerNote}
                  </span>

                  <button
                    type="button"
                    onClick={() => onActivateScene(scene.id)}
                    className={`py-1.5 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Activa
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        Activar escena
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Crear Escena Dinámica */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Crear Escena Dinámica
              </h3>
              <p className="text-[11px] text-slate-400">
                Compositor conectado al backend JWT y Casa 3D
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
            ESP-Mesh
          </span>
        </div>

        {/* Nombre de la Escena */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Nombre del Ambiente
          </label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={`Ej. Ambiente ${composerKelvin}K / Noche de Estudio`}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B111E] border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Transición de cambio de ambiente */}
        <div>
          <span className="text-xs font-semibold text-slate-300 block mb-2">
            Transición de cambio de ambiente
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTransitionType('smooth')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                transitionType === 'smooth'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span>Suave (3 seg)</span>
            </button>

            <button
              type="button"
              onClick={() => setTransitionType('instant')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                transitionType === 'instant'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span>Instantánea (0s)</span>
            </button>
          </div>
        </div>

        {/* Zonas lumínicas sincronizadas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">
              Zonas lumínicas sincronizadas
            </span>
            <button
              type="button"
              onClick={() =>
                setSyncedZones({ estudio: true, salon: true, dormitorio: true, cocina: true })
              }
              className="text-[11px] text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
            >
              Seleccionar todas
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: 'estudio', title: 'Estudio', fallback: '2 focos GU10' },
                { key: 'salon', title: 'Salón', fallback: 'Tira LED + Plafón' },
                { key: 'dormitorio', title: 'Dormitorio', fallback: 'Mesitas auxiliares' },
                { key: 'cocina', title: 'Cocina', fallback: 'Bajomuebles LED' },
              ] as const
            ).map((z) => {
              const checked = syncedZones[z.key];
              const count = countLightsInZone(z.key);
              return (
                <button
                  key={z.key}
                  type="button"
                  onClick={() =>
                    setSyncedZones((prev) => ({ ...prev, [z.key]: !prev[z.key] }))
                  }
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors text-left ${
                    checked
                      ? 'bg-[#131D33] border-amber-500/60 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      checked
                        ? 'bg-amber-500 border-amber-500 text-slate-950'
                        : 'border-slate-600'
                    }`}
                  >
                    {checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="text-xs truncate">
                    <span className="font-bold block">{z.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {count > 0 ? `${count} luminaria(s)` : z.fallback}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Punto de Color y Calidez */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">
              Punto de Color y Calidez
            </span>
            <span className="text-xs font-bold text-amber-400 font-mono">
              {composerKelvin}K ({kelvinLabel})
            </span>
          </div>

          <div
            className="w-full h-3 rounded-xl mb-2.5 border border-slate-700"
            style={{
              background: 'linear-gradient(to right, #FF9E4A, #FFB877, #FFF1E0, #D9EEFF)',
            }}
          />

          <input
            type="range"
            min="2000"
            max="6500"
            step="100"
            value={composerKelvin}
            onChange={(e) => setComposerKelvin(Number(e.target.value))}
            className="w-full h-2 rounded-lg bg-slate-800 accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Intensidad */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-300">
              Intensidad / Brillo objetivo
            </span>
            <span className="text-xs font-bold text-white font-mono">
              {composerIntensity}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={composerIntensity}
            onChange={(e) => setComposerIntensity(Number(e.target.value))}
            className="w-full h-2 rounded-lg bg-slate-800 accent-amber-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Rutinas Circadianas */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Rutinas Circadianas
              </h3>
              <p className="text-[11px] text-slate-400">
                Sincronización geolocalizada
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleCircadian}
            className={`w-12 h-6 rounded-full transition-colors flex items-center p-0.5 cursor-pointer ${
              circadianEnabled ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                circadianEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Puesta de Sol */}
        <div className="p-3 rounded-xl bg-[#0B111E] border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Flame className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-xs font-bold text-white">
                Puesta de Sol Dinámica
              </div>
              <div className="text-[11px] text-slate-400">
                Hoy a las 20:41 • Activa 'Relax Atardecer'
              </div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            {circadianEnabled ? 'Auto GPS' : 'Pausado'}
          </span>
        </div>

        {/* Despertador Solar */}
        <div className="p-3 rounded-xl bg-[#0B111E] border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-xs font-bold text-white">
                Despertador Solar Gradual
              </div>
              <div className="text-[11px] text-slate-400">
                07:00 AM • Rampa lumínica de 20 minutos
              </div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
            Lun-Vie
          </span>
        </div>
      </div>

      {savedSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* Button: Guardar Nueva Escena */}
      <button
        type="button"
        disabled={isSaving}
        onClick={handleSaveCustomScene}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
      >
        <BookmarkPlus className="w-4 h-4" />
        <span>
          {isSaving ? 'Guardando en API REST...' : 'Guardar y Aplicar Escena Personalizada'}
        </span>
      </button>
    </div>
  );
};

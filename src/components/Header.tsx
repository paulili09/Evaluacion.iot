import { ArrowLeft, Wifi, Radio, Bluetooth } from 'lucide-react';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  statusText?: string;
  connectionMode?: 'bluetooth' | 'mqtt';
  onOpenMesh?: () => void;
  onOpenBluetooth?: () => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  statusText,
  connectionMode = 'bluetooth',
  onOpenMesh,
  onOpenBluetooth,
  onOpenProfile,
}) => {
  return (
    <header className="sticky top-0 z-30 px-4 py-3 bg-[#080D1A]/90 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack ? (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors active:scale-95"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : null}

        <div className="flex items-center gap-2.5">
          {/* Logo icon with glowing ambient bulb & circuit ring */}
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Radio className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080D1A]" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-white">
                {title || 'LumiControl IoT'}
              </span>
            </div>
            {!showBack && (
              <span className="text-[10px] text-slate-400 font-medium">
                {connectionMode === 'bluetooth' ? 'Bluetooth Direct Link' : 'Home Mesh Network'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Status indicator pill - opens Bluetooth/Connection modal */}
        <button
          onClick={onOpenBluetooth || onOpenMesh}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all active:scale-95 ${
            connectionMode === 'bluetooth'
              ? 'bg-blue-950/40 border-blue-500/50 text-blue-400 hover:bg-blue-900/40 shadow-sm shadow-blue-500/20'
              : 'bg-[#111A2E] border-slate-700/60 text-emerald-400 hover:border-emerald-500/50'
          }`}
          title="Gestionar conexión Bluetooth y MQTT"
        >
          {connectionMode === 'bluetooth' ? (
            <Bluetooth className="w-3.5 h-3.5 text-blue-400 stroke-[2.5]" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <span className="tracking-wide">
            {statusText || (connectionMode === 'bluetooth' ? 'Bluetooth / ESP32' : 'MQTT / ESP32')}
          </span>
        </button>

        {/* User avatar */}
        <button
          onClick={onOpenProfile}
          className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-slate-700 hover:ring-amber-500 transition-all active:scale-95"
          title="Perfil de Sofía Mendoza"
        >
          <img
            src="/src/assets/images/avatar_sofia_mendoza_1794437958356.jpg"
            alt="Sofía Mendoza"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback avatar container if image fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="w-full h-full bg-gradient-to-br from-amber-600 to-indigo-800 flex items-center justify-center text-xs font-bold text-white">
            SM
          </div>
        </button>
      </div>
    </header>
  );
};

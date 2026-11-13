import React from 'react';
import { ArrowLeft, Radio, Bluetooth, Wifi, Code2, Usb } from 'lucide-react';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  connectionMode?: 'bluetooth' | 'mqtt' | 'usb';
  isBluetoothConnected?: boolean;
  isUsbConnected?: boolean;
  userFullName?: string;
  userUsername?: string;
  onOpenBluetooth?: () => void;
  onOpenUsb?: () => void;
  onOpenKotlinViewer?: () => void;
  onOpenProfile?: () => void;
}

function getInitials(fullName?: string, username?: string): string {
  const source = (fullName || username || 'LU').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  connectionMode = 'bluetooth',
  isBluetoothConnected = false,
  isUsbConnected = false,
  userFullName,
  userUsername,
  onOpenBluetooth,
  onOpenUsb,
  onOpenKotlinViewer,
  onOpenProfile,
}) => {
  const initials = getInitials(userFullName, userUsername);
  const isSofia = userUsername?.toLowerCase() === 'sofia';

  return (
    <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 bg-[#080D1A]/95 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap truncate">
            {title || 'LumiControl IoT'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onOpenKotlinViewer && (
          <button
            type="button"
            onClick={onOpenKotlinViewer}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121B30] hover:bg-[#192642] border border-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Código .kt / .ino</span>
          </button>
        )}

        {onOpenUsb && (
          <button
            type="button"
            onClick={onOpenUsb}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              isUsbConnected || connectionMode === 'usb'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-[#121B30] hover:bg-[#192642] border border-cyan-500/40 text-cyan-300'
            }`}
            title="Sincronizar con teléfono o ESP32 por cable USB"
          >
            <Usb className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">
              {isUsbConnected ? 'USB Enlazado' : 'Cable USB'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenBluetooth}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
            isBluetoothConnected
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {connectionMode === 'mqtt' ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <Bluetooth className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
          <span className="hidden xs:inline sm:inline">
            {isBluetoothConnected ? 'BT Enlazado' : 'BT 1-Click'}
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-2 pl-1 pr-2 sm:pr-2.5 py-1 rounded-full bg-[#101728] border border-slate-700 hover:border-amber-500 transition-all cursor-pointer shrink-0"
          title="Ver cuenta y sesión"
          aria-label="Abrir perfil"
        >
          <div className="relative w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-amber-600 to-indigo-800 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {isSofia ? (
              <img
                src="/src/assets/images/avatar_sofia_mendoza_1794437958356.jpg"
                alt={userFullName || 'Usuario'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          {userUsername && (
            <span className="hidden sm:inline text-xs font-semibold text-slate-200 max-w-[90px] truncate">
              @{userUsername}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

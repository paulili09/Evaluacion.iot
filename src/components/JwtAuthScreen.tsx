import React, { useState } from 'react';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  UserPlus,
  Usb,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { loginJwt, registerJwt, claimPairingSession, AuthUser } from '../services/apiClient';

interface JwtAuthScreenProps {
  onAuthenticated: (
    user: AuthUser,
    pairedInfo?: { deviceId: string; deviceName: string; channel: 'bluetooth' | 'wifi' | 'usb' }
  ) => void;
}

export const JwtAuthScreen: React.FC<JwtAuthScreenProps> = ({ onAuthenticated }) => {
  const isMobileUa =
    typeof navigator !== 'undefined' && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

  const [mode, setMode] = useState<'login' | 'register' | 'pair'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [deviceRole, setDeviceRole] = useState<'phone' | 'pc'>(isMobileUa ? 'phone' : 'pc');
  const [customDeviceName, setCustomDeviceName] = useState(
    isMobileUa ? 'Mi Teléfono Android' : 'PC · Control Central'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const buildDevicePayload = (user: AuthUser) => {
    const cleanDevName =
      customDeviceName.trim() ||
      (deviceRole === 'phone' ? `Celular de ${user.full_name.split(' ')[0]}` : 'PC · Control Central');
    const devId =
      deviceRole === 'phone'
        ? `android-phone-${user.username}`
        : `pc-${user.username}`;
    return {
      deviceId: devId,
      deviceName: cleanDevName,
      channel: (deviceRole === 'phone' ? 'bluetooth' : 'wifi') as 'bluetooth' | 'wifi',
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      if (mode === 'login') {
        if (!username.trim() || !password) {
          setErrorMsg('Ingresa tu usuario o correo y tu contraseña.');
          setIsLoading(false);
          return;
        }
        const data = await loginJwt(username.trim(), password);
        onAuthenticated(data.user, buildDevicePayload(data.user));
      } else if (mode === 'register') {
        if (password.length < 4) {
          setErrorMsg('La contraseña debe tener al menos 4 caracteres.');
          setIsLoading(false);
          return;
        }
        const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '');
        if (!cleanUser) {
          setErrorMsg('Ingresa un nombre de usuario válido.');
          setIsLoading(false);
          return;
        }
        const data = await registerJwt({
          username: cleanUser,
          password,
          full_name: fullName.trim() || cleanUser,
          email: email.trim() || `${cleanUser}@lumicontrol.iot`,
        });
        onAuthenticated(data.user, buildDevicePayload(data.user));
      } else {
        const deviceId = `android-usb-${Date.now().toString().slice(-4)}`;
        const data = await claimPairingSession({
          code: pairCode.trim(),
          deviceId,
          deviceName: customDeviceName.trim() || 'Mi Teléfono Android (USB)',
          channel: 'usb',
        });
        onAuthenticated(data.user, {
          deviceId: data.device.id,
          deviceName: data.device.name,
          channel: data.channel,
        });
      }
    } catch (err: any) {
      const detail =
        err.response?.data?.detail ||
        'No se pudo autenticar contra la API REST. Verifica tus datos.';
      setErrorMsg(`HTTP ${err.response?.status || 401}: ${detail}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080D1A] text-slate-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-[#0E1526] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-left">
        {/* Left column: Domain & Security Summary */}
        <div className="p-8 sm:p-10 bg-[#0B111E] border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between gap-8">
          <div className="space-y-4">
            <p className="text-xs font-mono text-amber-400 tracking-wide">
              LumiControl IoT · API REST, JWT &amp; ISO 27400
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
              Control IoT multi-dispositivo autenticado
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Crea tu cuenta o inicia sesión desde tu PC y desde tu celular para acceder a los datos de luminarias, sensores y ver tu teléfono sincronizado en tiempo real por Cable USB, Bluetooth o Wi-Fi.
            </p>
          </div>

          <div className="space-y-3 text-xs text-slate-300 border-t border-slate-800/80 pt-5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Credenciales cifradas con <strong className="text-white">scrypt + salt</strong> y endpoints protegidos con <code className="font-mono text-cyan-300">Authorization: Bearer</code> (ISO 27400).
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Cuentas demo listas: <code className="font-mono text-white">sofia / lumi2026</code> · <code className="font-mono text-white">admin / admin2026</code>
              </span>
            </div>
          </div>
        </div>

        {/* Right column: Auth Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="grid grid-cols-3 gap-1 mb-6 bg-[#080D1A] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setUsername('');
                setPassword('');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Crear cuenta
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('pair');
                setDeviceRole('phone');
                setCustomDeviceName('Mi Teléfono Android (USB)');
                setErrorMsg(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                mode === 'pair'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-cyan-300 hover:text-white'
              }`}
            >
              Código USB
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === 'login'
                  ? 'Acceso con Token JWT'
                  : mode === 'register'
                  ? 'Crear Cuenta de Usuario IoT'
                  : 'Sincronizar Teléfono con Código'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Endpoint:{' '}
                <span className="font-mono text-slate-300">
                  {mode === 'login'
                    ? 'POST /api/token/'
                    : mode === 'register'
                    ? 'POST /api/register/'
                    : 'POST /api/pair/claim/'}
                </span>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {mode === 'pair' ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="pair-code" className="block text-xs font-semibold text-slate-300">
                    Código de 6 dígitos (generado en tu PC &rarr; Cable USB)
                  </label>
                  <input
                    id="pair-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={pairCode}
                    onChange={(e) => setPairCode(e.target.value)}
                    placeholder="Ej. 482910"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D1A] border border-cyan-500/50 text-base font-mono tracking-widest text-amber-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="pair-phone-name" className="block text-xs font-semibold text-slate-300">
                    Nombre de este teléfono
                  </label>
                  <input
                    id="pair-phone-name"
                    type="text"
                    required
                    value={customDeviceName}
                    onChange={(e) => setCustomDeviceName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D1A] border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </>
            ) : (
              <>
                {mode === 'register' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="reg-fullname" className="block text-xs font-semibold text-slate-300">
                        Nombre completo
                      </label>
                      <input
                        id="reg-fullname"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ej. Matías Rojas"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D1A] border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-300">
                        Correo electrónico
                      </label>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="matias@correo.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D1A] border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="jwt-username" className="block text-xs font-semibold text-slate-300">
                    {mode === 'login' ? 'Usuario o correo electrónico' : 'Nombre de usuario'}
                  </label>
                  <input
                    id="jwt-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={mode === 'login' ? 'Tu usuario o correo electrónico' : 'ej. carlos'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D1A] border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="jwt-password" className="block text-xs font-semibold text-slate-300">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="jwt-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-[#080D1A] border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      aria-label="Mostrar u ocultar contraseña"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Device selector so phone appears clearly in synced devices list */}
                <div className="p-3 rounded-xl bg-[#080D1A] border border-slate-800 space-y-2">
                  <span className="block text-[11px] font-semibold text-slate-300">
                    ¿Desde qué equipo accedes? (aparecerá sincronizado en la app)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDeviceRole('phone');
                        setCustomDeviceName('Mi Teléfono Android');
                      }}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        deviceRole === 'phone'
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-[#0E1526] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Celular / Móvil</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeviceRole('pc');
                        setCustomDeviceName('PC · Control Central');
                      }}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                        deviceRole === 'pc'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-[#0E1526] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>Computador</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customDeviceName}
                    onChange={(e) => setCustomDeviceName(e.target.value)}
                    placeholder="Nombre visible (ej. Samsung A54 / Mi Celular)"
                    aria-label="Nombre del dispositivo"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0E1526] border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {mode === 'login' && (
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUsername('sofia');
                        setPassword('lumi2026');
                        setErrorMsg(null);
                      }}
                      className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                    >
                      Usar cuenta demo (sofia)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setUsername('');
                        setPassword('');
                        setErrorMsg(null);
                      }}
                      className="text-cyan-300 hover:text-cyan-200 font-semibold cursor-pointer"
                    >
                      ¿Sin cuenta? Regístrate aquí
                    </button>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer ${
                mode === 'pair'
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {mode === 'login' ? (
                <Lock className="w-4 h-4" />
              ) : mode === 'register' ? (
                <UserPlus className="w-4 h-4" />
              ) : (
                <Usb className="w-4 h-4" />
              )}
              <span>
                {isLoading
                  ? 'Procesando...'
                  : mode === 'login'
                  ? 'Iniciar Sesión y Entrar'
                  : mode === 'register'
                  ? 'Crear Cuenta y Entrar'
                  : 'Vincular Teléfono Ahora'}
              </span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

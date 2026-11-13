import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Usb,
  Smartphone,
  Cpu,
  Terminal,
  Copy,
  Check,
  Power,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Link2,
} from 'lucide-react';
import { usbCable, UsbConnectionState } from '../services/usbCableService';
import { createPairingSession } from '../services/apiClient';
import { playRelayClick } from '../services/soundEffects';

interface UsbSyncModalProps {
  onClose: () => void;
  onUsbConnected: (info: {
    deviceName: string;
    transport: string;
    usbDetails: string;
  }) => Promise<void> | void;
  onSendUsbCommand: (cmd: 'ENCENDER' | 'APAGAR') => Promise<void> | void;
  onUsbDisconnected: () => void;
}

export const UsbSyncModal: React.FC<UsbSyncModalProps> = ({
  onClose,
  onUsbConnected,
  onSendUsbCommand,
  onUsbDisconnected,
}) => {
  const [usbState, setUsbState] = useState<UsbConnectionState>(usbCable.state);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [copiedAdb, setCopiedAdb] = useState(false);
  const [copiedPairUrl, setCopiedPairUrl] = useState(false);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [isGeneratingPair, setIsGeneratingPair] = useState(false);
  const [usbLogs, setUsbLogs] = useState<string[]>([
    'Listo para sincronizar tu teléfono Android o placa ESP32 por cable USB.',
  ]);

  const inIframe = usbCable.isInsideIframe();
  const onUsbConnectedRef = useRef(onUsbConnected);
  useEffect(() => {
    onUsbConnectedRef.current = onUsbConnected;
  }, [onUsbConnected]);

  useEffect(() => {
    const unsubMsg = usbCable.subscribeMessages((msg) => {
      setUsbLogs((prev) => [`[USB] ${msg}`, ...prev].slice(0, 20));
    });
    const unsubState = usbCable.subscribeState((next) => {
      setUsbState(next);
    });

    // Auto-detectar si el teléfono ya fue autorizado previamente por WebUSB
    usbCable.checkAuthorizedDevices().then((res) => {
      if (res.found && res.deviceName) {
        onUsbConnectedRef.current({
          deviceName: res.deviceName,
          transport: 'WebUSB Auto',
          usbDetails: 'Cable USB reconocido automáticamente',
        });
      }
    });

    return () => {
      unsubMsg();
      unsubState();
    };
  }, []);

  const handleGeneratePairCode = async () => {
    setIsGeneratingPair(true);
    try {
      const res = await createPairingSession('usb');
      setPairCode(res.code);
      setUsbLogs((prev) => [
        `Código de sincronización USB generado: ${res.code} (válido 10 min)`,
        ...prev,
      ]);
    } catch {
      setStatusError('No se pudo generar el código de sincronización. Verifica tu sesión JWT.');
    } finally {
      setIsGeneratingPair(false);
    }
  };

  const pairUrl =
    pairCode && typeof window !== 'undefined'
      ? `${window.location.origin}/?pair=${pairCode}&ch=usb`
      : null;

  const adbPairUrl = pairCode ? `http://localhost:3000/?pair=${pairCode}&ch=usb` : null;

  const handleConnectPhoneWebUsb = async () => {
    setStatusError(null);
    setIsConnecting(true);
    const res = await usbCable.connectPhoneViaWebUsb();
    setIsConnecting(false);

    if (res.ok) {
      playRelayClick(true);
      const details = [
        usbCable.state.manufacturer,
        usbCable.state.vendorId && usbCable.state.productId
          ? `${usbCable.state.vendorId}:${usbCable.state.productId}`
          : null,
        usbCable.state.serialNumber ? `SN:${usbCable.state.serialNumber}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      await onUsbConnected({
        deviceName: usbCable.state.deviceName || 'Teléfono Android USB',
        transport: 'WebUSB',
        usbDetails: details || 'Cable USB Directo',
      });
    } else if (res.reason) {
      setStatusError(res.reason);
      setUsbLogs((prev) => [`Aviso WebUSB: ${res.reason}`, ...prev]);
    }
  };

  const handleConnectEsp32Serial = async () => {
    setStatusError(null);
    setIsConnecting(true);
    const res = await usbCable.connectViaWebSerial();
    setIsConnecting(false);

    if (res.ok) {
      playRelayClick(true);
      await onUsbConnected({
        deviceName: usbCable.state.deviceName || 'ESP32 Cable USB Serial',
        transport: 'WebSerial 115200',
        usbDetails: `${usbCable.state.vendorId || 'COM'}:${usbCable.state.productId || 'UART'}`,
      });
    } else if (res.reason) {
      setStatusError(res.reason);
    }
  };

  const handleActivateAdbTether = async () => {
    setStatusError(null);
    playRelayClick(true);
    usbCable.connectUsbTetherMode('Teléfono Android (Cable USB / ADB)');
    await onUsbConnected({
      deviceName: 'Teléfono Android (Cable USB / ADB)',
      transport: 'ADB / USB Tethering',
      usbDetails: 'Túnel USB TCP:3000 sincronizado',
    });
    if (!pairCode) {
      await handleGeneratePairCode();
    }
  };

  const handleDisconnect = async () => {
    await usbCable.disconnect();
    onUsbDisconnected();
    setUsbLogs((prev) => ['Cable USB desconectado.', ...prev]);
  };

  const handleCopyAdb = () => {
    navigator.clipboard.writeText('adb reverse tcp:3000 tcp:3000');
    setCopiedAdb(true);
    setTimeout(() => setCopiedAdb(false), 1800);
  };

  const handleCopyPairUrl = (urlToCopy: string) => {
    navigator.clipboard.writeText(urlToCopy);
    setCopiedPairUrl(true);
    setTimeout(() => setCopiedPairUrl(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md text-left">
      <div className="w-full max-w-lg bg-[#0E1526] border border-slate-800 rounded-3xl p-6 text-white max-h-[92vh] overflow-y-auto shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Usb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Sincronización por Cable USB
              </h2>
              <p className="text-xs text-slate-400">
                Enlace directo con teléfono Android (WebUSB / ADB) o placa ESP32
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Iframe notice */}
        {inIframe && (
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2">
            <div className="flex items-start gap-2 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                En vista embebida Chrome restringe WebUSB/WebSerial. Puedes usar el <strong>Código de Sincronización Directa</strong> aquí mismo o abrir en pestaña nueva para puertos USB físicos:
              </span>
            </div>
            <a
              href={typeof window !== 'undefined' ? window.location.href : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en Pestaña Directa (Habilita WebUSB / Serial)</span>
            </a>
          </div>
        )}

        {/* Connected status card */}
        <div
          className={`p-4 rounded-2xl border space-y-2 ${
            usbState.isConnected
              ? 'bg-emerald-950/30 border-emerald-500/40'
              : 'bg-[#101728] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">
              {usbState.isConnected ? 'Cable USB Sincronizado' : 'Esperando conexión por cable'}
            </span>
            <span
              className={`text-[11px] font-mono font-bold ${
                usbState.isConnected ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {usbState.isConnected ? usbState.transport?.toUpperCase() : 'DESCONECTADO'}
            </span>
          </div>

          {usbState.isConnected ? (
            <div className="text-xs text-slate-300 space-y-1">
              <div>
                Dispositivo: <strong className="text-white">{usbState.deviceName}</strong>
              </div>
              <div className="font-mono text-[11px] text-cyan-300">
                {usbState.manufacturer}
                {usbState.vendorId ? ` · VID ${usbState.vendorId}` : ''}
                {usbState.productId ? ` · PID ${usbState.productId}` : ''}
                {usbState.serialNumber ? ` · SN ${usbState.serialNumber}` : ''}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              Conecta el cable USB entre el teléfono y el computador, luego elige cómo deseas sincronizarlo.
            </p>
          )}
        </div>

        {statusError && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
            {statusError}
          </div>
        )}

        {/* Primary USB Actions */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={isConnecting}
            onClick={handleConnectPhoneWebUsb}
            className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Smartphone className="w-4 h-4" />
            <span>1. Detectar Teléfono por Cable USB (WebUSB)</span>
          </button>

          <button
            type="button"
            disabled={isConnecting}
            onClick={handleConnectEsp32Serial}
            className="w-full py-3 px-4 rounded-xl bg-[#141F36] hover:bg-[#1A2947] border border-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Cpu className="w-4 h-4 text-amber-400" />
            <span>2. Conectar ESP32 / Placa por Cable USB Serial</span>
          </button>

          <button
            type="button"
            onClick={handleActivateAdbTether}
            className="w-full py-3 px-4 rounded-xl bg-[#101728] hover:bg-[#162038] border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>3. Sincronizar Teléfono (Cable USB / ADB / Enlace Directo)</span>
          </button>
        </div>

        {/* 1-Step Phone Pairing Link & 6-Digit Code */}
        <div className="p-3.5 rounded-2xl bg-[#0B1222] border border-cyan-500/30 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Emparejar Teléfono al Instante (Sin contraseña)
            </span>
            <button
              type="button"
              disabled={isGeneratingPair}
              onClick={handleGeneratePairCode}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-[11px] font-bold cursor-pointer"
            >
              {isGeneratingPair ? 'Generando...' : pairCode ? 'Nuevo Código' : 'Generar Código'}
            </button>
          </div>

          {pairCode && pairUrl ? (
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-black/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Código para ingresar en el celular:</span>
                <span className="font-mono text-base font-extrabold tracking-widest text-amber-400">
                  {pairCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyPairUrl(pairUrl)}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedPairUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPairUrl ? 'Enlace copiado' : 'Copiar Enlace USB/Móvil'}</span>
                </button>
                {adbPairUrl && (
                  <button
                    type="button"
                    onClick={() => handleCopyPairUrl(adbPairUrl)}
                    className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold cursor-pointer"
                  >
                    Copiar URL ADB
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Genera un código de 6 dígitos o enlace directo para abrir la app en tu teléfono conectado por cable USB/Anclaje y vincularlo en tiempo real con un toque.
            </p>
          )}
        </div>

        {/* ADB reverse helper */}
        <div className="p-3.5 rounded-xl bg-[#090D18] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Túnel directo PC ↔ Celular por Cable USB (ADB)
            </span>
            <button
              type="button"
              onClick={handleCopyAdb}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
            >
              {copiedAdb ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedAdb ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
          <code className="block p-2 rounded-lg bg-black/70 text-[11px] font-mono text-amber-300">
            adb reverse tcp:3000 tcp:3000
          </code>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Con <strong>Depuración USB</strong> activa, ejecuta este comando y abre <code className="text-slate-200">http://localhost:3000</code> en el celular (o pega el código generado arriba).
          </p>
        </div>

        {/* Test USB Commands */}
        {usbState.isConnected && (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                playRelayClick(true);
                onSendUsbCommand('ENCENDER');
                setUsbLogs((prev) => ['[USB TX] "ENCENDER" enviado por cable', ...prev]);
              }}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>ENCENDER</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playRelayClick(false);
                onSendUsbCommand('APAGAR');
                setUsbLogs((prev) => ['[USB TX] "APAGAR" enviado por cable', ...prev]);
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>APAGAR</span>
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="py-2.5 px-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 font-bold text-xs cursor-pointer"
            >
              Desconectar
            </button>
          </div>
        )}

        {/* Log */}
        <div className="p-3 rounded-xl bg-black/70 border border-slate-900 font-mono text-[11px] space-y-1 max-h-28 overflow-y-auto">
          {usbLogs.map((l, idx) => (
            <div key={idx} className="text-slate-300 break-all">
              <span className="text-cyan-400">&gt;</span> {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

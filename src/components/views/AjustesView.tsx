import React, { useState } from 'react';
import {
  ShieldCheck,
  Server,
  Wifi,
  Cpu,
  DownloadCloud,
  Clock,
  Bell,
  Watch,
  Terminal,
  Download,
  Trash2,
  Users,
  Key,
  ChevronRight,
  Send,
  RefreshCw,
  Check,
  Sliders,
  Code2,
} from 'lucide-react';

interface AjustesViewProps {
  onOpenMeshTopology: () => void;
  onOpenKotlinViewer?: () => void;
}

export const AjustesView: React.FC<AjustesViewProps> = ({ onOpenMeshTopology, onOpenKotlinViewer }) => {
  const [pirSensitivityMin, setPirSensitivityMin] = useState<number>(30);
  const [headsUpAlerts, setHeadsUpAlerts] = useState<boolean>(true);
  const [wearOsSync, setWearOsSync] = useState<boolean>(true);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [tokenMsg, setTokenMsg] = useState<string | null>(null);

  const [mqttLogs, setMqttLogs] = useState([
    {
      time: '18:42:01.320',
      type: 'PUB',
      msg: 'home/sala/esp32/luz_1 -> {"lux":85,"state":"ON"}',
    },
    {
      time: '18:42:02.104',
      type: 'SUB',
      msg: 'home/mesh/telemetry -> {"rssi":-45,"heap":219433}',
    },
    {
      time: '18:42:03.018',
      type: 'QoS1',
      msg: 'PUBACK PacketID #1042 recibido',
    },
  ]);

  const handleTestPing = () => {
    setPingStatus('Calculando RTT a broker.emqx.io:8883...');
    setTimeout(() => {
      setPingStatus('✓ TLS Handshake exitoso (18 ms RTT)');
      setTimeout(() => setPingStatus(null), 3000);
    }, 600);
  };

  const handleReconnect = () => {
    setIsReconnecting(true);
    setTimeout(() => {
      setIsReconnecting(false);
      setPingStatus('✓ Reconectado al Broker con mTLS y Clean Session: 0');
      setTimeout(() => setPingStatus(null), 3500);
    }, 1000);
  };

  const handleRegenerateToken = () => {
    setTokenMsg('Generando nuevo par de claves RSA-2048 y token JWT...');
    setTimeout(() => {
      setTokenMsg('✓ Llaves simétricas propagadas a los 5 nodos ESP32 con éxito');
      setTimeout(() => setTokenMsg(null), 4000);
    }, 1200);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(mqttLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mqtt_telemetry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-5 pb-24 animate-fade-in text-left">
      {/* Estado del Sistema */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Estado del Sistema</h2>
              <p className="text-[11px] text-slate-400">
                Topología de Red & Broker Activo
              </p>
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
            ● Sincronizado
          </span>
        </div>

        {/* Broker Card */}
        <div className="p-3.5 rounded-xl bg-[#0B111E] border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">Broker MQTT Primario</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
              🔒 TLS v1.3
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-[10px] font-sans text-slate-400 block">Endpoint</span>
              <span className="text-slate-200 truncate block">broker.emqx.io:8883</span>
            </div>
            <div>
              <span className="text-[10px] font-sans text-slate-400 block">Latencia / Ping</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                18 ms
              </span>
            </div>
          </div>

          {/* Ping / Reconectar buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestPing}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test Ping</span>
            </button>

            <button
              type="button"
              disabled={isReconnecting}
              onClick={handleReconnect}
              className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Conectando...' : 'Reconectar'}</span>
            </button>
          </div>

          {pingStatus && (
            <div className="text-[11px] font-mono text-cyan-300 p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30">
              {pingStatus}
            </div>
          )}
        </div>

        {/* Mesh link row */}
        <button
          type="button"
          onClick={onOpenMeshTopology}
          className="w-full p-3 rounded-xl bg-[#0B111E] border border-slate-800/80 flex items-center justify-between text-left hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-white">LumiMesh_5G</div>
              <div className="text-[11px] text-slate-400">
                5 Nodos activos conectados
              </div>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-emerald-400">
            -45 dBm &gt;
          </span>
        </button>
      </div>

      {/* Hardware & Firmware */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Hardware & Firmware</h2>
          </div>

          <button
            type="button"
            onClick={onOpenMeshTopology}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-semibold hover:bg-cyan-900/40"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Buscar OTA</span>
          </button>
        </div>

        {/* Node 1 */}
        <div className="p-3 rounded-xl bg-[#0B111E] border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-cyan-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">ESP32-S3 Sala Central</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                  v2.4.12
                </span>
                <span className="text-emerald-400 text-[10px] font-bold">● Activo</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                WROOM-N16R8 • IP 192.168.1.104
              </span>
            </div>
          </div>
        </div>

        {/* Node 2 */}
        <div className="p-3 rounded-xl bg-[#0B111E] border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">ESP32-C3 Pasillo Este</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                  v2.4.12
                </span>
                <span className="text-emerald-400 text-[10px] font-bold">● Activo</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                MINI-1 • IP 192.168.1.112
              </span>
            </div>
          </div>
        </div>

        {/* 3 Metric counters */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-left font-mono">
          <div className="p-2.5 rounded-xl bg-[#0B111E] border border-slate-800">
            <span className="text-[10px] font-sans text-slate-400 block">Heap Libre</span>
            <div className="text-base font-extrabold text-white mt-0.5">214 <span className="text-xs text-slate-400 font-normal">KB</span></div>
            <div className="w-full h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: '67%' }} />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0B111E] border border-slate-800">
            <span className="text-[10px] font-sans text-slate-400 block">Tasa MQTT</span>
            <div className="text-base font-extrabold text-amber-400 mt-0.5">28 <span className="text-xs text-slate-400 font-normal">m/s</span></div>
            <span className="text-[10px] font-sans text-emerald-400 block mt-1">📈 Estable</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0B111E] border border-slate-800">
            <span className="text-[10px] font-sans text-slate-400 block">Uptime</span>
            <div className="text-base font-extrabold text-white mt-0.5">14 <span className="text-xs text-slate-400 font-normal">días</span></div>
            <span className="text-[10px] font-sans text-slate-400 block mt-1">0 Reboots</span>
          </div>
        </div>
      </div>

      {/* Automatización Anti-Olvido Settings */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <div>
            <h2 className="text-sm font-bold text-white">
              Automatización Anti-Olvido
            </h2>
            <p className="text-[11px] text-slate-400">
              Temporizadores de presencia & Disparo de alertas
            </p>
          </div>
        </div>

        {/* Sensibilidad y Apagado PIR Slider */}
        <div className="p-3.5 rounded-xl bg-[#0B111E] border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-white block">
                Sensibilidad y Apagado PIR
              </span>
              <span className="text-[11px] text-slate-400">
                Retardo antes de corte tras ausencia
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-bold font-mono text-xs">
              {pirSensitivityMin} min
            </span>
          </div>

          <input
            type="range"
            min="15"
            max="60"
            step="15"
            value={pirSensitivityMin}
            onChange={(e) => setPirSensitivityMin(Number(e.target.value))}
            className="w-full h-2 rounded-lg bg-slate-800 accent-amber-500"
          />

          <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium">
            <span>15m (Rápido)</span>
            <span>30m (Recomendado)</span>
            <span>60m (Máx)</span>
          </div>
        </div>

        {/* Alertas Heads-Up Críticas */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-xs font-bold text-white">
                Alertas Heads-Up Críticas
              </div>
              <div className="text-[11px] text-slate-400">
                Notificaciones prioritarias en Android
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setHeadsUpAlerts(!headsUpAlerts)}
            className={`w-12 h-6 rounded-full transition-colors flex items-center p-0.5 ${
              headsUpAlerts ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 flex items-center justify-center text-amber-400 transition-transform ${
                headsUpAlerts ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {headsUpAlerts && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </button>
        </div>

        {/* Wear OS & Widgets Glance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Watch className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-xs font-bold text-white">
                Wear OS & Widgets Glance
              </div>
              <div className="text-[11px] text-slate-400">
                Sincronizar accesos directos al launcher
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setWearOsSync(!wearOsSync)}
            className={`w-12 h-6 rounded-full transition-colors flex items-center p-0.5 ${
              wearOsSync ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 flex items-center justify-center text-cyan-400 transition-transform ${
                wearOsSync ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {wearOsSync && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </button>
        </div>
      </div>

      {/* Log MQTT en Vivo */}
      <div className="p-4 rounded-2xl bg-[#090D18] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Log MQTT en Vivo
            </h2>
          </div>

          <button
            type="button"
            onClick={onOpenKotlinViewer}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold transition-colors"
            title="Ver código fuente de Coroutines Flow en Kotlin"
          >
            <Code2 className="w-3 h-3 text-purple-400" />
            <span>Kotlin Coroutine Flow</span>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-black/60 border border-slate-900 font-mono text-[11px] space-y-2">
          {mqttLogs.map((log, i) => (
            <div key={i} className="leading-snug">
              <span className="text-slate-500">{log.time} </span>
              <span
                className={`font-bold ${
                  log.type === 'PUB'
                    ? 'text-emerald-400'
                    : log.type === 'SUB'
                    ? 'text-cyan-400'
                    : 'text-amber-400'
                }`}
              >
                [{log.type}]{' '}
              </span>
              <span className="text-slate-300 break-all">{log.msg}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setMqttLogs([])}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar Log</span>
          </button>
        </div>
      </div>

      {/* Permisos del Hogar */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <div>
            <h2 className="text-sm font-bold text-white">Permisos del Hogar</h2>
            <p className="text-[11px] text-slate-400">
              Control de acceso y roles de usuario
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0B111E] border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Carlos Mendoza</span>
                <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                  Admin
                </span>
              </div>
              <span className="text-[11px] text-slate-400">carlos.m@lumicontrol.iot</span>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-400">3 Miembros familiares invitados</span>
          <button className="text-amber-400 font-bold hover:text-amber-300">
            Gestionar &gt;
          </button>
        </div>
      </div>

      {/* Credenciales & Token JWT */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-3">
        <div className="flex items-start gap-2.5">
          <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-white">
              Credenciales & Token JWT
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Tu token expira en 18 días. Puedes regenerar las llaves simétricas para todos los microcontroladores suscritos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRegenerateToken}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-98"
        >
          <Key className="w-3.5 h-3.5" />
          <span>Regenerar Tokens</span>
        </button>

        {tokenMsg && (
          <div className="text-xs font-mono text-emerald-400 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
            {tokenMsg}
          </div>
        )}
      </div>
    </div>
  );
};

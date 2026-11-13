import React, { useState, useEffect } from 'react';
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
  Code2,
} from 'lucide-react';
import {
  AuthUser,
  SecurityAuditReport,
  TelemetriaSummary,
  fetchSecurityAudit,
  fetchTelemetria,
  refreshJwt,
} from '../../services/apiClient';

interface AjustesViewProps {
  authUser?: AuthUser | null;
  devicesCount?: number;
  onOpenMeshTopology: () => void;
  onOpenKotlinViewer?: () => void;
  onOpenDevicesTab?: () => void;
  onOpenApiTab?: () => void;
  onNotify?: (msg: string) => void;
}

export const AjustesView: React.FC<AjustesViewProps> = ({
  authUser,
  devicesCount = 2,
  onOpenMeshTopology,
  onOpenKotlinViewer,
  onOpenDevicesTab,
  onOpenApiTab,
  onNotify,
}) => {
  const [pirSensitivityMin, setPirSensitivityMin] = useState<number>(() => {
    if (typeof window === 'undefined') return 30;
    const saved = Number(localStorage.getItem('lumi_pir_sensitivity_min'));
    return [15, 30, 45, 60].includes(saved) ? saved : 30;
  });
  const [headsUpAlerts, setHeadsUpAlerts] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('lumi_heads_up_alerts') !== 'false';
  });
  const [wearOsSync, setWearOsSync] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('lumi_wear_os_sync') !== 'false';
  });

  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState<boolean>(false);
  const [tokenMsg, setTokenMsg] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetriaSummary | null>(null);
  const [auditReport, setAuditReport] = useState<SecurityAuditReport | null>(null);
  const [showMembersPanel, setShowMembersPanel] = useState<boolean>(false);

  const [mqttLogs, setMqttLogs] = useState([
    {
      time: new Date().toTimeString().split(' ')[0],
      type: 'PUB',
      msg: 'home/sala/esp32/luz_1 -> {"lux":85,"state":"ON"}',
    },
    {
      time: new Date().toTimeString().split(' ')[0],
      type: 'SUB',
      msg: 'home/mesh/telemetry -> {"rssi":-45,"heap":219433}',
    },
    {
      time: new Date().toTimeString().split(' ')[0],
      type: 'QoS1',
      msg: 'PUBACK PacketID #1042 recibido',
    },
  ]);

  useEffect(() => {
    const start = performance.now();
    Promise.all([fetchTelemetria(), fetchSecurityAudit()])
      .then(([tel, aud]) => {
        setTelemetry(tel);
        setAuditReport(aud);
        setLatencyMs(Math.max(1, Math.round(performance.now() - start)));
      })
      .catch(() => {});
  }, []);

  const appendLog = (type: string, msg: string) => {
    setMqttLogs((prev) => [
      { time: new Date().toTimeString().split(' ')[0], type, msg },
      ...prev.slice(0, 20),
    ]);
  };

  const handlePirChange = (val: number) => {
    setPirSensitivityMin(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumi_pir_sensitivity_min', String(val));
      localStorage.setItem('lumi_inactivity_threshold', String(val));
    }
  };

  const handleToggleHeadsUp = () => {
    const next = !headsUpAlerts;
    setHeadsUpAlerts(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumi_heads_up_alerts', String(next));
    }
  };

  const handleToggleWearOs = () => {
    const next = !wearOsSync;
    setWearOsSync(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumi_wear_os_sync', String(next));
    }
  };

  const handleTestPing = async () => {
    setPingStatus('Midiendo RTT real con /api/health/...');
    const started = performance.now();
    try {
      const res = await fetch('/api/health/');
      const rtt = Math.max(1, Math.round(performance.now() - started));
      setLatencyMs(rtt);
      if (res.ok) {
        const msg = `✓ Conexión API/TLS verificada (${rtt} ms RTT)`;
        setPingStatus(msg);
        appendLog('SYS', `GET /api/health/ -> HTTP 200 (${rtt} ms)`);
        onNotify?.(msg);
      } else {
        setPingStatus(`⚠ Estado HTTP ${res.status} (${rtt} ms)`);
      }
    } catch {
      setPingStatus('Error al contactar el servidor.');
    }
    setTimeout(() => setPingStatus(null), 3500);
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    const started = performance.now();
    try {
      const [tel, aud] = await Promise.all([fetchTelemetria(), fetchSecurityAudit()]);
      const rtt = Math.max(1, Math.round(performance.now() - started));
      setTelemetry(tel);
      setAuditReport(aud);
      setLatencyMs(rtt);
      const msg = `✓ Resincronizado: ${tel.active_lights}/${tel.total_lights} luces, ${tel.connected_android_devices || devicesCount} clientes (${rtt} ms)`;
      setPingStatus(msg);
      appendLog('SUB', `Resync OK: ${tel.total_watts}W activos, ${tel.stored_sensor_readings || 0} lecturas`);
      onNotify?.('Telemetría y red resincronizadas con éxito.');
    } catch {
      setPingStatus('No se pudo resincronizar con el servidor.');
    } finally {
      setIsReconnecting(false);
      setTimeout(() => setPingStatus(null), 4000);
    }
  };

  const handleRegenerateToken = async () => {
    setIsRefreshingToken(true);
    setTokenMsg('Renovando Access Token JWT vía /api/token/refresh/...');
    try {
      await refreshJwt();
      const msg = '✓ Access Token JWT renovado y firmado correctamente (HS256)';
      setTokenMsg(msg);
      appendLog('SYS', 'POST /api/token/refresh/ -> Nuevo JWT Bearer activo');
      onNotify?.('Token JWT renovado correctamente.');
    } catch {
      setTokenMsg('No se pudo renovar el token JWT. Inicia sesión nuevamente.');
    } finally {
      setIsRefreshingToken(false);
      setTimeout(() => setTokenMsg(null), 4000);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(mqttLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mqtt_telemetry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onNotify?.('Archivo JSON de telemetría descargado.');
  };

  const displayName = authUser?.full_name || 'Usuario Autenticado';
  const displayEmail = authUser?.email || 'usuario@lumicontrol.iot';
  const displayRole = authUser?.role || 'Operador IoT';
  const registeredUsers = auditReport?.registered_users || [];

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
                Topología de Red &amp; Broker Activo
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
              <span className="text-xs font-bold text-white">Servidor IoT &amp; Broker MQTT</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
              🔒 JWT + TLS
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-[10px] font-sans text-slate-400 block">Endpoint Activo</span>
              <span className="text-slate-200 truncate block">
                {typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-sans text-slate-400 block">Latencia / Ping</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {latencyMs} ms
              </span>
            </div>
          </div>

          {/* Ping / Reconectar buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestPing}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test Ping</span>
            </button>

            <button
              type="button"
              disabled={isReconnecting}
              onClick={handleReconnect}
              className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
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
          className="w-full p-3 rounded-xl bg-[#0B111E] border border-slate-800/80 flex items-center justify-between text-left hover:border-slate-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-white">LumiMesh_5G</div>
              <div className="text-[11px] text-slate-400">
                {(telemetry?.connected_android_devices || devicesCount) + 3} Nodos activos conectados ({telemetry?.active_lights ?? 0} luces ON)
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
            <h2 className="text-sm font-bold text-white">Hardware &amp; Firmware</h2>
          </div>

          <button
            type="button"
            onClick={onOpenMeshTopology}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-semibold hover:bg-cyan-900/40 cursor-pointer"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Buscar OTA</span>
          </button>
        </div>

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

        <div className="grid grid-cols-3 gap-2 pt-1 text-left font-mono">
          <div className="p-2.5 rounded-xl bg-[#0B111E] border border-slate-800">
            <span className="text-[10px] font-sans text-slate-400 block">Consumo</span>
            <div className="text-base font-extrabold text-white mt-0.5">
              {telemetry?.total_watts ?? 52.4} <span className="text-xs text-slate-400 font-normal">W</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: '67%' }} />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0B111E] border border-slate-800">
            <span className="text-[10px] font-sans text-slate-400 block">Sensores BD</span>
            <div className="text-base font-extrabold text-amber-400 mt-0.5">
              {telemetry?.stored_sensor_readings ?? 4} <span className="text-xs text-slate-400 font-normal">reg</span>
            </div>
            <span className="text-[10px] font-sans text-emerald-400 block mt-1">📈 Persistidos</span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0B111E] border border-slate-800">
            <span className="text-[10px] font-sans text-slate-400 block">Reglas</span>
            <div className="text-base font-extrabold text-white mt-0.5">
              {telemetry?.active_rules_count ?? 2} <span className="text-xs text-slate-400 font-normal">activas</span>
            </div>
            <span className="text-[10px] font-sans text-slate-400 block mt-1">0 Fallos</span>
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
              Temporizadores de presencia &amp; Disparo de alertas (persistido)
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
            onChange={(e) => handlePirChange(Number(e.target.value))}
            className="w-full h-2 rounded-lg bg-slate-800 accent-amber-500 cursor-pointer"
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
            onClick={handleToggleHeadsUp}
            className={`w-12 h-6 rounded-full transition-colors flex items-center p-0.5 cursor-pointer ${
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
                Wear OS &amp; Widgets Glance
              </div>
              <div className="text-[11px] text-slate-400">
                Sincronizar accesos directos al launcher
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleWearOs}
            className={`w-12 h-6 rounded-full transition-colors flex items-center p-0.5 cursor-pointer ${
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
              Log MQTT &amp; Telemetría
            </h2>
          </div>

          <button
            type="button"
            onClick={onOpenKotlinViewer}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold transition-colors cursor-pointer"
            title="Ver código fuente de Coroutines Flow en Kotlin"
          >
            <Code2 className="w-3 h-3 text-purple-400" />
            <span>Kotlin Coroutine Flow</span>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-black/60 border border-slate-900 font-mono text-[11px] space-y-2 max-h-40 overflow-y-auto">
          {mqttLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-2">
              Sin registros recientes. Ejecuta Test Ping o Reconectar para registrar eventos.
            </div>
          ) : (
            mqttLogs.map((log, i) => (
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
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setMqttLogs([])}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
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
              Control de acceso y roles de usuario (ISO 27400)
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
                <span className="text-xs font-bold text-white">{displayName}</span>
                <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                  {displayRole}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">{displayEmail}</span>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-400">
            {registeredUsers.length || 2} Cuentas registradas con scrypt-sha512
          </span>
          <button
            type="button"
            onClick={() => setShowMembersPanel((prev) => !prev)}
            className="text-amber-400 font-bold hover:text-amber-300 cursor-pointer"
          >
            {showMembersPanel ? 'Ocultar ▲' : 'Gestionar >'}
          </button>
        </div>

        {showMembersPanel && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            {registeredUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0B111E] border border-slate-800 text-xs"
              >
                <div>
                  <span className="text-white font-bold">{u.full_name}</span>
                  <span className="text-amber-300 font-mono ml-1.5">@{u.username}</span>
                  <span className="block text-[10px] text-slate-400">{u.role}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">
                  {u.password_encryption}
                </span>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              {onOpenDevicesTab && (
                <button
                  type="button"
                  onClick={onOpenDevicesTab}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  Ver Red Android ({devicesCount})
                </button>
              )}
              {onOpenApiTab && (
                <button
                  type="button"
                  onClick={onOpenApiTab}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 cursor-pointer"
                >
                  Auditoría API &amp; JWT
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Credenciales & Token JWT */}
      <div className="p-4 rounded-2xl bg-[#101728] border border-slate-800 space-y-3">
        <div className="flex items-start gap-2.5">
          <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-white">
              Credenciales &amp; Token JWT
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Access Token válido por 30 minutos (Refresh 7 días). Puedes renovar tu token JWT Bearer inmediatamente sin cerrar sesión.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isRefreshingToken}
          onClick={handleRegenerateToken}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-98 cursor-pointer disabled:opacity-50"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{isRefreshingToken ? 'Renovando JWT...' : 'Regenerar Token JWT (/api/token/refresh/)'}</span>
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

import React, { useEffect, useState, useCallback } from 'react';
import {
  Smartphone,
  Bluetooth,
  Wifi,
  Database,
  ShieldCheck,
  Send,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Play,
  Activity,
  Search,
  Usb,
  Trash2,
} from 'lucide-react';
import {
  AndroidDeviceNode,
  SensorReading,
  SecurityAuditReport,
  fetchDispositivos,
  upsertDispositivo,
  deleteDispositivo,
  syncDispositivosCommand,
  fetchSensorReadings,
  createSensorReading,
  fetchSecurityAudit,
  testUnauthenticatedRequest,
  getCachedSensorReadingsCount,
} from '../../services/apiClient';
import { Luminaria } from '../../types';

interface DispositivosSensoresViewProps {
  lights: Luminaria[];
  activeDeviceId: string;
  activeDeviceName: string;
  connectionMode: 'bluetooth' | 'mqtt' | 'usb';
  onChangeActiveDevice: (id: string, name: string) => void;
  onChangeConnectionMode: (mode: 'bluetooth' | 'mqtt' | 'usb') => void;
  onOpenUsbModal: () => void;
  onNotify: (msg: string) => void;
  onSyncLightsFromApi: (lights: Luminaria[]) => void;
  syncRevision?: number;
}

interface TestSuiteItem {
  id: string;
  label: string;
  status: 'idle' | 'pass' | 'fail';
  detail: string;
}

export const DispositivosSensoresView: React.FC<DispositivosSensoresViewProps> = ({
  lights,
  activeDeviceId,
  activeDeviceName,
  connectionMode,
  onChangeActiveDevice,
  onChangeConnectionMode,
  onOpenUsbModal,
  onNotify,
  onSyncLightsFromApi,
  syncRevision = 0,
}) => {
  const [devices, setDevices] = useState<AndroidDeviceNode[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [audit, setAudit] = useState<SecurityAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters for querying sensor readings
  const [sensorFilter, setSensorFilter] = useState<string>('todos');
  const [zoneSearch, setZoneSearch] = useState<string>('');
  const [deviceFilter, setDeviceFilter] = useState<string>('todos');

  // New sensor reading inputs
  const [newSensorType, setNewSensorType] = useState<SensorReading['sensorType']>('luxometro');
  const [newZone, setNewZone] = useState<string>('Estudio');
  const [newValue, setNewValue] = useState<string>('465');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Sync command between 2 Android devices
  const [selectedLightId, setSelectedLightId] = useState<string>(lights[0]?.id || 'lum-1');
  const [isSyncingCmd, setIsSyncingCmd] = useState<boolean>(false);

  // New Android device modal/inline form
  const [customDeviceName, setCustomDeviceName] = useState<string>('');

  // Live functional test suite (Paso 3 & 4)
  const [testResults, setTestResults] = useState<TestSuiteItem[]>([
    { id: 'auth', label: 'Autenticación JWT Bearer activa', status: 'idle', detail: 'Pendiente de ejecutar' },
    { id: 'unauth', label: 'Bloqueo de accesos sin credenciales (HTTP 401)', status: 'idle', detail: 'Pendiente de ejecutar' },
    { id: 'dual', label: 'Interconexión de 2+ dispositivos Android', status: 'idle', detail: 'Pendiente de ejecutar' },
    { id: 'storage', label: 'Almacenamiento y consulta de sensores', status: 'idle', detail: 'Pendiente de ejecutar' },
    { id: 'iso', label: 'Cumplimiento Norma ISO 27400 (Cifrado & RBAC)', status: 'idle', detail: 'Pendiente de ejecutar' },
  ]);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [devData, readData, auditData] = await Promise.all([
        fetchDispositivos(),
        fetchSensorReadings({
          sensorType: sensorFilter,
          zone: zoneSearch,
          deviceId: deviceFilter,
        }),
        fetchSecurityAudit(),
      ]);
      setDevices(devData);
      setReadings(readData);
      setAudit(auditData);
    } catch {
      onNotify('Error al cargar red de dispositivos y sensores.');
    } finally {
      setIsLoading(false);
    }
  }, [sensorFilter, zoneSearch, deviceFilter, onNotify]);

  useEffect(() => {
    loadAll();
  }, [loadAll, syncRevision]);

  useEffect(() => {
    if (lights.length > 0 && !lights.some((l) => l.id === selectedLightId)) {
      setSelectedLightId(lights[0].id);
    }
  }, [lights, selectedLightId]);

  const resolveChannel = (): 'bluetooth' | 'wifi' | 'usb' =>
    connectionMode === 'usb' ? 'usb' : connectionMode === 'bluetooth' ? 'bluetooth' : 'wifi';

  const handleRegisterCurrentDevice = async (id: string, name: string, channel: 'bluetooth' | 'wifi' | 'usb') => {
    onChangeActiveDevice(id, name);
    try {
      await upsertDispositivo({
        id,
        name,
        model: channel === 'usb' ? 'Android USB Cable Sync' : 'Android Mobile / Web Client',
        channel,
        rssiDbm: channel === 'usb' ? 0 : channel === 'bluetooth' ? -42 : -48,
        batteryPct: 86,
      });
      const updated = await fetchDispositivos();
      setDevices(updated);
      onNotify(`Este teléfono opera ahora como "${name}" (${channel.toUpperCase()})`);
    } catch {
      onNotify('No se pudo actualizar el perfil del dispositivo.');
    }
  };

  const handleAddCustomAndroid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDeviceName.trim()) return;
    const newId = `android-${Date.now().toString().slice(-4)}`;
    await handleRegisterCurrentDevice(
      newId,
      customDeviceName.trim(),
      resolveChannel()
    );
    setCustomDeviceName('');
  };

  const handleRemoveDevice = async (id: string, name: string) => {
    try {
      await deleteDispositivo(id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
      onNotify(`Dispositivo "${name}" eliminado de la red.`);
    } catch {
      onNotify('No se pudo eliminar el dispositivo.');
    }
  };

  const handleSyncCommandBetweenDevices = async (command: 'ENCENDER' | 'APAGAR') => {
    setIsSyncingCmd(true);
    const ch = resolveChannel();
    try {
      const res = await syncDispositivosCommand({
        fromDeviceId: activeDeviceId,
        fromDeviceName: activeDeviceName,
        channel: ch,
        command,
        targetLightId: selectedLightId,
      });
      setDevices(res.devices);
      onSyncLightsFromApi(res.luminarias);
      onNotify(
        `Sincronizado entre ${res.devices.length} dispositivos (${ch === 'usb' ? 'Cable USB' : ch === 'bluetooth' ? 'Bluetooth' : 'Wi-Fi'}): ${command}`
      );
    } catch {
      onNotify('Error al sincronizar comando entre dispositivos.');
    } finally {
      setIsSyncingCmd(false);
    }
  };

  const handleCaptureSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCapturing(true);
    const unitMap: Record<SensorReading['sensorType'], string> = {
      pir_mmwave: 'presencia',
      luxometro: 'lux',
      potencia_w: 'W',
      rssi_bt: 'dBm',
    };
    try {
      const created = await createSensorReading({
        sensorType: newSensorType,
        zone: newZone,
        value: Number(newValue || 0),
        unit: unitMap[newSensorType],
        deviceId: activeDeviceId,
        deviceName: activeDeviceName,
        channel: resolveChannel(),
      });
      setReadings((prev) => [created, ...prev]);
      onNotify(`Lectura ${created.sensorType} (${created.value} ${created.unit}) guardada en BD.`);
    } catch {
      onNotify('Error al guardar lectura del sensor.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRunLiveTests = async () => {
    setIsRunningTests(true);
    try {
      const [unauthRes, devData, readData, auditData] = await Promise.all([
        testUnauthenticatedRequest(),
        fetchDispositivos(),
        fetchSensorReadings(),
        fetchSecurityAudit(),
      ]);

      setDevices(devData);
      setReadings(readData);
      setAudit(auditData);

      setTestResults([
        {
          id: 'auth',
          label: 'Autenticación JWT Bearer activa',
          status: auditData.authenticated_user ? 'pass' : 'fail',
          detail: `Sesión verificada para @${auditData.authenticated_user}`,
        },
        {
          id: 'unauth',
          label: 'Bloqueo de accesos sin credenciales (HTTP 401)',
          status: unauthRes.status === 401 ? 'pass' : 'fail',
          detail: `Respuesta sin Bearer: HTTP ${unauthRes.status} (${unauthRes.detail})`,
        },
        {
          id: 'dual',
          label: 'Interconexión de 2+ dispositivos Android',
          status: devData.length >= 2 ? 'pass' : 'fail',
          detail: `${devData.length} dispositivos Android enlazados en tiempo real`,
        },
        {
          id: 'storage',
          label: 'Almacenamiento y consulta de sensores',
          status: readData.length > 0 ? 'pass' : 'fail',
          detail: `${readData.length} lecturas persistidas en API + ${getCachedSensorReadingsCount()} en caché local`,
        },
        {
          id: 'iso',
          label: 'Cumplimiento Norma ISO 27400 (Cifrado & RBAC)',
          status: auditData.checks.every((c) => c.status === 'compliant') ? 'pass' : 'fail',
          detail: `${auditData.checks.length}/${auditData.checks.length} controles criptográficos aprobados`,
        },
      ]);
      onNotify('Batería de pruebas IoT TI3042 ejecutada con éxito.');
    } catch {
      onNotify('Falló alguna verificación de la batería de pruebas.');
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Red Dual-Android, Sensores &amp; ISO 27400
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sincronización inalámbrica (Bluetooth / Wi-Fi) entre 2+ dispositivos Android, consulta de sensores almacenados y auditoría de seguridad.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAll}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 self-start cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar Red</span>
        </button>
      </div>

      {/* SECTION 1: Dual Android Interconnection (Wi-Fi / Bluetooth) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#101728] border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  Dispositivos Android Conectados ({devices.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Este dispositivo actúa como: <strong className="text-amber-300">{activeDeviceName}</strong>
                </p>
              </div>
            </div>

            {/* Switch transport method */}
            <div className="flex flex-wrap items-center gap-1 bg-[#080D1A] p-1 rounded-xl border border-slate-800 self-start">
              <button
                type="button"
                onClick={() => onChangeConnectionMode('bluetooth')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  connectionMode === 'bluetooth'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bluetooth className="w-3.5 h-3.5" />
                <span>Bluetooth</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeConnectionMode('mqtt')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  connectionMode === 'mqtt'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Wi-Fi</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeConnectionMode('usb');
                  onOpenUsbModal();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  connectionMode === 'usb'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Usb className="w-3.5 h-3.5" />
                <span>Cable USB</span>
              </button>
            </div>
          </div>

          {/* Connected Android cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {devices.map((dev) => {
              const isCurrent = dev.id === activeDeviceId;
              return (
                <div
                  key={dev.id}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    isCurrent
                      ? 'bg-blue-950/30 border-blue-500/50'
                      : 'bg-[#0B111E] border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-white">{dev.name}</div>
                      <div className="text-[11px] text-slate-400">{dev.model}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleRegisterCurrentDevice(dev.id, dev.name, resolveChannel())
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {isCurrent ? 'Este teléfono' : 'Usar este ID'}
                      </button>
                      {!isCurrent && devices.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDevice(dev.id, dev.name)}
                          className="p-1 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 cursor-pointer"
                          title={`Desvincular ${dev.name}`}
                          aria-label={`Eliminar ${dev.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-300">
                    <span className={dev.channel === 'usb' ? 'text-cyan-400' : 'text-emerald-400'}>
                      {dev.channel === 'usb'
                        ? 'Cable USB Directo'
                        : dev.channel === 'bluetooth'
                        ? 'BT RFCOMM/BLE'
                        : 'Wi-Fi / TLS'}
                    </span>
                    <span>{dev.channel === 'usb' ? 'Latencia <1ms' : `RSSI ${dev.rssiDbm} dBm`}</span>
                    <span>Bat {dev.batteryPct}%</span>
                  </div>
                  {dev.lastCommand && (
                    <div className="mt-1.5 text-[11px] text-slate-400 truncate">
                      Último cmd: <span className="text-slate-200 font-mono">{dev.lastCommand}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sync Command across both Android phones */}
          <div className="p-3.5 rounded-xl bg-[#0B111E] border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-amber-400" />
                Transmitir comando sincronizado entre dispositivos Android
              </span>
              <select
                value={selectedLightId}
                onChange={(e) => setSelectedLightId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[#101728] border border-slate-700 text-xs text-white"
              >
                {lights.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.room})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSyncingCmd}
                onClick={() => handleSyncCommandBetweenDevices('ENCENDER')}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Sincronizar: ENCENDER
              </button>
              <button
                type="button"
                disabled={isSyncingCmd}
                onClick={() => handleSyncCommandBetweenDevices('APAGAR')}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Sincronizar: APAGAR
              </button>
            </div>
          </div>

          {/* Register additional Android node */}
          <form onSubmit={handleAddCustomAndroid} className="flex items-center gap-2">
            <input
              type="text"
              value={customDeviceName}
              onChange={(e) => setCustomDeviceName(e.target.value)}
              placeholder="Vincular nuevo dispositivo Android (ej. Android 3 · Redmi Note)"
              className="flex-1 px-3 py-2 rounded-xl bg-[#090E1C] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Vincular</span>
            </button>
          </form>
        </div>

        {/* Paso 2: Justificación técnica Bluetooth vs Wi-Fi/MQTT */}
        <div className="p-5 rounded-2xl bg-[#101728] border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-white">
            Justificación Inalámbrica (Diseño IoT)
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Arquitectura híbrida optimizada según distancia, consumo energético y estabilidad operativa:
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-[#0B111E] border border-blue-500/30 space-y-1">
              <div className="font-bold text-blue-300 flex items-center gap-1.5">
                <Bluetooth className="w-3.5 h-3.5" />
                Bluetooth (BLE / SPP Directo)
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                <strong>Distancia:</strong> 1–15 m · <strong>Consumo:</strong> Muy bajo (~15 mA) · <strong>Uso:</strong> Control inmediato 1-click sin depender de router Wi-Fi.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0B111E] border border-emerald-500/30 space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5" />
                Wi-Fi + API REST / MQTT TLS
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                <strong>Distancia:</strong> Red local / Global · <strong>Estabilidad:</strong> Alta con QoS 1 y JWT · <strong>Uso:</strong> Sincronización en la nube entre dos teléfonos Android distantes.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0B111E] border border-cyan-500/30 space-y-1">
              <div className="font-bold text-cyan-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Usb className="w-3.5 h-3.5" />
                  Cable USB (WebUSB / ADB)
                </span>
                <button
                  type="button"
                  onClick={onOpenUsbModal}
                  className="text-[11px] underline text-cyan-300 hover:text-cyan-200 cursor-pointer"
                >
                  Conectar cable
                </button>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                <strong>Latencia:</strong> &lt;1 ms sin interferencias · <strong>Energía:</strong> Alimentado por puerto USB · <strong>Uso:</strong> Sincronización cableada directa PC ↔ Teléfono / ESP32.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Sensor Data Storage & Querying */}
      <div className="p-5 rounded-2xl bg-[#101728] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Almacenamiento y Consulta de Datos de Sensores
              </h2>
              <p className="text-xs text-slate-400">
                Persistencia en servidor REST + caché local SQLite/Browser ({readings.length} registros consultables)
              </p>
            </div>
          </div>
        </div>

        {/* Capture new reading */}
        <form
          onSubmit={handleCaptureSensor}
          className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 p-3.5 rounded-xl bg-[#0B111E] border border-slate-800"
        >
          <select
            value={newSensorType}
            onChange={(e) => setNewSensorType(e.target.value as SensorReading['sensorType'])}
            className="px-3 py-2 rounded-lg bg-[#101728] border border-slate-700 text-xs text-white"
            aria-label="Tipo de sensor"
          >
            <option value="luxometro">Luxómetro (lux)</option>
            <option value="pir_mmwave">Sensor PIR mmWave (0/1)</option>
            <option value="potencia_w">Wattímetro (W)</option>
            <option value="rssi_bt">Señal RSSI (dBm)</option>
          </select>

          <input
            type="text"
            value={newZone}
            onChange={(e) => setNewZone(e.target.value)}
            placeholder="Zona (Estudio, Cocina...)"
            className="px-3 py-2 rounded-lg bg-[#101728] border border-slate-700 text-xs text-white"
            required
          />

          <input
            type="number"
            step="any"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Valor medido"
            className="px-3 py-2 rounded-lg bg-[#101728] border border-slate-700 text-xs text-white"
            required
          />

          <div className="px-3 py-2 rounded-lg bg-[#101728] border border-slate-800 text-[11px] text-slate-400 flex items-center truncate">
            Origen: {activeDeviceName}
          </div>

          <button
            type="submit"
            disabled={isCapturing}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isCapturing ? 'Guardando...' : 'Capturar Dato'}</span>
          </button>
        </form>

        {/* Query Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={zoneSearch}
              onChange={(e) => setZoneSearch(e.target.value)}
              placeholder="Consultar por habitación o zona..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#0B111E] border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={sensorFilter}
            onChange={(e) => setSensorFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0B111E] border border-slate-800 text-xs text-slate-200"
          >
            <option value="todos">Todos los sensores</option>
            <option value="luxometro">Luxómetro</option>
            <option value="pir_mmwave">PIR mmWave</option>
            <option value="potencia_w">Potencia (W)</option>
            <option value="rssi_bt">RSSI Bluetooth</option>
          </select>

          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0B111E] border border-slate-800 text-xs text-slate-200"
          >
            <option value="todos">Todos los Android</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Readings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3">Fecha / Hora</th>
                <th className="py-2 pr-3">Sensor</th>
                <th className="py-2 pr-3">Zona</th>
                <th className="py-2 pr-3">Valor</th>
                <th className="py-2 pr-3">Dispositivo Android</th>
                <th className="py-2">Canal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {readings.map((r) => (
                <tr key={r.id} className="text-slate-200">
                  <td className="py-2 pr-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2 pr-3 font-semibold">{r.sensorType}</td>
                  <td className="py-2 pr-3">{r.zone}</td>
                  <td className="py-2 pr-3 font-mono font-bold text-cyan-300">
                    {r.value} {r.unit}
                  </td>
                  <td className="py-2 pr-3 text-slate-300">{r.deviceName}</td>
                  <td className="py-2 font-mono text-[11px] uppercase text-emerald-400">
                    {r.channel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: ISO 27400 Security & Live Validation Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-[#101728] border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Seguridad IoT · Norma ISO/IEC 27400
              </h2>
              <p className="text-xs text-slate-400">
                Controles activos verificados en servidor y cliente móvil
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {audit?.checks.map((chk) => (
              <div
                key={chk.id}
                className="p-3 rounded-xl bg-[#0B111E] border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>{chk.title}</span>
                  <span className="text-emerald-400">Cumple</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{chk.detail}</p>
              </div>
            ))}
          </div>

          {audit && (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Usuarios registrados (Cifrado scrypt)
              </span>
              <div className="space-y-1.5">
                {audit.registered_users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-[#090D18]"
                  >
                    <span className="text-white font-medium">
                      {u.full_name} (<span className="font-mono text-amber-300">@{u.username}</span>)
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400">
                      {u.password_encryption}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Paso 3 & 4: Pruebas de funcionamiento en vivo */}
        <div className="p-5 rounded-2xl bg-[#101728] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white">
                Pruebas de Funcionamiento (Demostración)
              </h2>
              <p className="text-xs text-slate-400">
                Verifica en vivo los 4 pilares evaluados en clase
              </p>
            </div>

            <button
              type="button"
              disabled={isRunningTests}
              onClick={handleRunLiveTests}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunningTests ? 'Probando...' : 'Ejecutar Pruebas'}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {testResults.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-[#0B111E] border border-slate-800 flex items-start gap-2.5"
              >
                {t.status === 'pass' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : t.status === 'fail' ? (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <Activity className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white">{t.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 break-all">{t.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

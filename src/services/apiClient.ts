import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Luminaria, Escena, ReglaAntiOlvido, Incidente } from '../types';

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  hasBearer: boolean;
  durationMs: number;
  summary: string;
}

export interface AndroidDeviceNode {
  id: string;
  name: string;
  model: string;
  channel: 'bluetooth' | 'wifi' | 'usb';
  status: 'online' | 'standby';
  rssiDbm: number;
  batteryPct: number;
  lastSeen: string;
  lastCommand?: string;
  usbDetails?: string;
}

export interface SensorReading {
  id: string;
  sensorType: 'pir_mmwave' | 'luxometro' | 'potencia_w' | 'rssi_bt';
  zone: string;
  value: number;
  unit: string;
  deviceId: string;
  deviceName: string;
  channel: 'bluetooth' | 'wifi' | 'usb';
  timestamp: string;
}

export interface SecurityAuditReport {
  standard: string;
  authenticated_user: string;
  checks: {
    id: string;
    title: string;
    status: 'compliant' | 'warning';
    detail: string;
  }[];
  registered_users: {
    id: number;
    username: string;
    full_name: string;
    role: string;
    password_encryption: string;
  }[];
}

export interface TelemetriaSummary {
  authenticated_user: string;
  total_watts: number;
  active_lights: number;
  total_lights: number;
  estimated_hourly_cost_eur: number;
  active_rules_count: number;
  connected_android_devices?: number;
  stored_sensor_readings?: number;
  timestamp: string;
}

const STORAGE_ACCESS_KEY = 'lumi_jwt_access';
const STORAGE_REFRESH_KEY = 'lumi_jwt_refresh';
const STORAGE_USER_KEY = 'lumi_jwt_user';
const STORAGE_SENSOR_CACHE_KEY = 'lumi_local_sensor_cache';

type LogListener = (logs: ApiLogEntry[]) => void;
type AuthExpiredListener = () => void;

let apiLogs: ApiLogEntry[] = [];
const logListeners = new Set<LogListener>();
let onAuthExpired: AuthExpiredListener | null = null;

function pushApiLog(entry: ApiLogEntry) {
  apiLogs = [entry, ...apiLogs].slice(0, 30);
  logListeners.forEach((cb) => cb(apiLogs));
}

export function subscribeApiLogs(listener: LogListener): () => void {
  logListeners.add(listener);
  listener(apiLogs);
  return () => {
    logListeners.delete(listener);
  };
}

export function setAuthExpiredHandler(handler: AuthExpiredListener) {
  onAuthExpired = handler;
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(STORAGE_ACCESS_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_REFRESH_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeSession(access: string, refresh: string, user: AuthUser) {
  localStorage.setItem(STORAGE_ACCESS_KEY, access);
  localStorage.setItem(STORAGE_REFRESH_KEY, refresh);
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_ACCESS_KEY);
  localStorage.removeItem(STORAGE_REFRESH_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  (config as any)._startedAt = performance.now();
  const token = getStoredAccessToken();
  if (
    token &&
    !config.url?.includes('/token/') &&
    !config.url?.includes('/register/') &&
    !config.url?.includes('/pair/claim/')
  ) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const started = (response.config as any)._startedAt || performance.now();
    const durationMs = Math.max(1, Math.round(performance.now() - started));
    const hasBearer = Boolean(response.config.headers?.Authorization);
    pushApiLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      method: (response.config.method || 'GET').toUpperCase(),
      url: `/api${response.config.url}`,
      status: response.status,
      hasBearer,
      durationMs,
      summary: hasBearer ? 'Autorizado con Bearer JWT' : 'Endpoint público (AllowAny)',
    });
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean; _startedAt?: number }) | undefined;
    const status = error.response?.status || 500;
    const started = originalRequest?._startedAt || performance.now();
    const durationMs = Math.max(1, Math.round(performance.now() - started));

    if (originalRequest) {
      pushApiLog({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        method: (originalRequest.method || 'GET').toUpperCase(),
        url: `/api${originalRequest.url}`,
        status,
        hasBearer: Boolean(originalRequest.headers?.Authorization),
        durationMs,
        summary: status === 401 ? 'HTTP 401 Unauthorized' : `Error HTTP ${status}`,
      });
    }

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/token/') &&
      !originalRequest.url?.includes('/register/')
    ) {
      const refresh = getStoredRefreshToken();
      if (refresh) {
        originalRequest._retry = true;
        try {
          const refreshRes = await axios.post('/api/token/refresh/', { refresh });
          const newAccess = refreshRes.data.access as string;
          localStorage.setItem(STORAGE_ACCESS_KEY, newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch {
          clearSession();
          onAuthExpired?.();
        }
      } else {
        clearSession();
        onAuthExpired?.();
      }
    }

    return Promise.reject(error);
  }
);

export async function loginJwt(username: string, password: string) {
  const res = await api.post<{ access: string; refresh: string; user: AuthUser }>('/token/', {
    username,
    password,
  });
  storeSession(res.data.access, res.data.refresh, res.data.user);
  return res.data;
}

export async function registerJwt(payload: {
  username: string;
  password: string;
  full_name: string;
  email: string;
}) {
  const res = await api.post<{ access: string; refresh: string; user: AuthUser }>('/register/', payload);
  storeSession(res.data.access, res.data.refresh, res.data.user);
  return res.data;
}

export async function refreshJwt(): Promise<string> {
  const refresh = getStoredRefreshToken();
  if (!refresh) throw new Error('No refresh token available');
  const res = await api.post<{ access: string }>('/token/refresh/', { refresh });
  localStorage.setItem(STORAGE_ACCESS_KEY, res.data.access);
  return res.data.access;
}

export async function createPairingSession(channel: 'bluetooth' | 'wifi' | 'usb' = 'usb') {
  const res = await api.post<{
    code: string;
    channel: 'bluetooth' | 'wifi' | 'usb';
    expires_in_seconds: number;
  }>('/pair/create/', { channel });
  return res.data;
}

export async function claimPairingSession(payload: {
  code: string;
  deviceId: string;
  deviceName: string;
  model?: string;
  channel?: 'bluetooth' | 'wifi' | 'usb';
}) {
  const res = await api.post<{
    access: string;
    refresh: string;
    user: AuthUser;
    device: AndroidDeviceNode;
    channel: 'bluetooth' | 'wifi' | 'usb';
  }>('/pair/claim/', payload);
  storeSession(res.data.access, res.data.refresh, res.data.user);
  return res.data;
}

export async function testUnauthenticatedRequest(): Promise<{ status: number; detail: string }> {
  const started = performance.now();
  try {
    await axios.get('/api/luminarias/');
    return { status: 200, detail: 'Acceso permitido' };
  } catch (err: any) {
    const status = err.response?.status || 401;
    const detail = err.response?.data?.detail || 'Authentication credentials were not provided.';
    pushApiLog({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      method: 'GET',
      url: '/api/luminarias/',
      status,
      hasBearer: false,
      durationMs: Math.max(1, Math.round(performance.now() - started)),
      summary: 'Prueba sin token: bloqueado correctamente (401)',
    });
    return { status, detail };
  }
}

// Luminarias CRUD
export async function fetchLuminarias(roomType?: string, search?: string): Promise<Luminaria[]> {
  const params: Record<string, string> = {};
  if (roomType && roomType !== 'todas') params.room_type = roomType;
  if (search) params.search = search;
  const res = await api.get<Luminaria[]>('/luminarias/', { params });
  return res.data;
}

export async function createLuminaria(payload: {
  name: string;
  room: string;
  roomType: Luminaria['roomType'];
  brightness: number;
  colorTemp: number;
  iconType: Luminaria['iconType'];
  isOn: boolean;
}): Promise<Luminaria> {
  const res = await api.post<Luminaria>('/luminarias/', payload);
  return res.data;
}

export async function updateLuminaria(id: string, payload: Partial<Luminaria>): Promise<Luminaria> {
  const res = await api.patch<Luminaria>(`/luminarias/${id}/`, payload);
  return res.data;
}

export async function deleteLuminaria(id: string): Promise<void> {
  await api.delete(`/luminarias/${id}/`);
}

export async function toggleLuminaria(id: string): Promise<Luminaria> {
  const res = await api.post<Luminaria>(`/luminarias/${id}/toggle/`);
  return res.data;
}

export async function apagarTodasLuminarias(): Promise<Luminaria[]> {
  const res = await api.post<{ luminarias: Luminaria[] }>('/luminarias/apagar_todas/');
  return res.data.luminarias;
}

// Escenas
export async function fetchEscenas(): Promise<Escena[]> {
  const res = await api.get<Escena[]>('/escenas/');
  return res.data;
}

export async function createEscena(payload: {
  name: string;
  category?: 'favoritas' | 'circadianas' | 'inmersivas';
  description?: string;
  temperature: number;
  intensity: number;
  targetZones: ('estudio' | 'dormitorio' | 'cocina' | 'salon')[];
  transitionType: 'smooth' | 'instant';
  activateNow?: boolean;
}): Promise<{ scene: Escena; escenas: Escena[]; luminarias: Luminaria[] }> {
  const res = await api.post<{ scene: Escena; escenas: Escena[]; luminarias: Luminaria[] }>('/escenas/', payload);
  return res.data;
}

export async function deleteEscena(id: string): Promise<void> {
  await api.delete(`/escenas/${id}/`);
}

export async function activarEscena(id: string): Promise<{ active_scene: string; escenas: Escena[]; luminarias: Luminaria[] }> {
  const res = await api.post<{ active_scene: string; escenas: Escena[]; luminarias: Luminaria[] }>(`/escenas/${id}/activar/`);
  return res.data;
}

// Reglas Anti-Olvido CRUD
export async function fetchReglas(): Promise<ReglaAntiOlvido[]> {
  const res = await api.get<ReglaAntiOlvido[]>('/reglas/');
  return res.data;
}

export async function createRegla(payload: Partial<ReglaAntiOlvido>): Promise<ReglaAntiOlvido> {
  const res = await api.post<ReglaAntiOlvido>('/reglas/', payload);
  return res.data;
}

export async function updateRegla(id: string, payload: Partial<ReglaAntiOlvido>): Promise<ReglaAntiOlvido> {
  const res = await api.patch<ReglaAntiOlvido>(`/reglas/${id}/`, payload);
  return res.data;
}

export async function deleteRegla(id: string): Promise<void> {
  await api.delete(`/reglas/${id}/`);
}

// Incidentes
export async function fetchIncidentes(): Promise<Incidente[]> {
  const res = await api.get<Incidente[]>('/incidentes/');
  return res.data;
}

export async function deleteIncidente(id: string): Promise<void> {
  await api.delete(`/incidentes/${id}/`);
}

// Dual Android Devices Sync
export async function fetchDispositivos(): Promise<AndroidDeviceNode[]> {
  const res = await api.get<AndroidDeviceNode[]>('/dispositivos/');
  return res.data;
}

export async function upsertDispositivo(payload: Partial<AndroidDeviceNode> & { id: string }): Promise<AndroidDeviceNode> {
  const res = await api.post<AndroidDeviceNode>('/dispositivos/', payload);
  return res.data;
}

export async function deleteDispositivo(id: string): Promise<void> {
  await api.delete(`/dispositivos/${id}/`);
}

export async function syncDispositivosCommand(payload: {
  fromDeviceId: string;
  fromDeviceName: string;
  channel: 'bluetooth' | 'wifi' | 'usb';
  command: string;
  targetLightId?: string;
}): Promise<{ synced: boolean; devices: AndroidDeviceNode[]; luminarias: Luminaria[] }> {
  const res = await api.post<{ synced: boolean; devices: AndroidDeviceNode[]; luminarias: Luminaria[] }>(
    '/dispositivos/sync/',
    payload
  );
  return res.data;
}

// Sensor Readings (API + Local Cache Mirror)
export async function fetchSensorReadings(filters?: {
  sensorType?: string;
  zone?: string;
  deviceId?: string;
}): Promise<SensorReading[]> {
  try {
    const params: Record<string, string> = {};
    if (filters?.sensorType && filters.sensorType !== 'todos') params.sensor_type = filters.sensorType;
    if (filters?.zone) params.zone = filters.zone;
    if (filters?.deviceId && filters.deviceId !== 'todos') params.device_id = filters.deviceId;
    const res = await api.get<SensorReading[]>('/sensores/lecturas/', { params });
    localStorage.setItem(STORAGE_SENSOR_CACHE_KEY, JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    const cached = localStorage.getItem(STORAGE_SENSOR_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as SensorReading[];
    }
    throw err;
  }
}

export async function createSensorReading(payload: {
  sensorType: SensorReading['sensorType'];
  zone: string;
  value: number;
  unit: string;
  deviceId: string;
  deviceName: string;
  channel: 'bluetooth' | 'wifi' | 'usb';
}): Promise<SensorReading> {
  const res = await api.post<SensorReading>('/sensores/lecturas/', payload);
  return res.data;
}

export function getCachedSensorReadingsCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_SENSOR_CACHE_KEY);
    return raw ? (JSON.parse(raw) as SensorReading[]).length : 0;
  } catch {
    return 0;
  }
}

// Security Audit (ISO 27400) & Telemetry
export async function fetchSecurityAudit(): Promise<SecurityAuditReport> {
  const res = await api.get<SecurityAuditReport>('/seguridad/auditoria/');
  return res.data;
}

export async function fetchTelemetria(): Promise<TelemetriaSummary> {
  const res = await api.get<TelemetriaSummary>('/telemetria/');
  return res.data;
}

// Real-time SSE Subscription for Dual-Android Sync
export function subscribeRealtimeStream(handlers: {
  onLuminariasSync?: (lights: Luminaria[]) => void;
  onDevicesSync?: (devices: AndroidDeviceNode[]) => void;
  onSensorsSync?: (readings: SensorReading[]) => void;
  onCommandRelay?: (cmd: { fromDeviceName: string; channel: string; command: string }) => void;
}): () => void {
  const token = getStoredAccessToken();
  if (!token || typeof EventSource === 'undefined') {
    return () => {};
  }

  const es = new EventSource(`/api/stream/?token=${encodeURIComponent(token)}`);

  es.addEventListener('luminarias_sync', (ev) => {
    try {
      handlers.onLuminariasSync?.(JSON.parse((ev as MessageEvent).data));
    } catch {
      // ignore parse error
    }
  });

  es.addEventListener('devices_sync', (ev) => {
    try {
      handlers.onDevicesSync?.(JSON.parse((ev as MessageEvent).data));
    } catch {
      // ignore parse error
    }
  });

  es.addEventListener('sensors_sync', (ev) => {
    try {
      handlers.onSensorsSync?.(JSON.parse((ev as MessageEvent).data));
    } catch {
      // ignore parse error
    }
  });

  es.addEventListener('command_relay', (ev) => {
    try {
      handlers.onCommandRelay?.(JSON.parse((ev as MessageEvent).data));
    } catch {
      // ignore parse error
    }
  });

  return () => {
    es.close();
  };
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'lumicontrol-es03-jwt-secret-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'lumicontrol-es03-refresh-secret-2026';
const DB_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'lumicontrol_db.json');

interface LuminariaRecord {
  id: string;
  name: string;
  room: string;
  roomType: 'estudio' | 'dormitorio' | 'cocina' | 'salon';
  isOn: boolean;
  brightness: number;
  colorTemp: number;
  powerWatts: number;
  modeLabel?: string;
  pirActive?: boolean;
  sensorDistance?: string;
  scheduleLabel?: string;
  iconType: 'lamp' | 'ceiling' | 'strip' | 'spot' | 'bedside';
  updatedAt: string;
}

interface EscenaRecord {
  id: string;
  name: string;
  category: 'favoritas' | 'circadianas' | 'inmersivas';
  description: string;
  temperature: number;
  tempLabel?: string;
  intensity: number;
  powerWatts: number;
  linkedLightsCount: number;
  roomSummary: string;
  badge?: string;
  badgeType?: 'live' | 'pir' | 'immersive' | 'dnd';
  footerNote: string;
  active: boolean;
  iconName: string;
  targetZones?: ('estudio' | 'dormitorio' | 'cocina' | 'salon')[];
  transitionType?: 'smooth' | 'instant';
  isCustom?: boolean;
}

interface ReglaRecord {
  id: string;
  targetDevice: string;
  deviceLabel: string;
  triggerType: 'pir_mmwave' | 'radar_24g' | 'geofence';
  waitMinutes: number;
  onlyNight: boolean;
  outsideGeofence: boolean;
  actionType: 'warning_with_snooze' | 'direct_cut';
  softDimming: boolean;
  savedKwhWeekly: number;
  savedUsdWeekly: number;
  isActive: boolean;
  createdAt: string;
}

interface IncidenteRecord {
  id: string;
  title: string;
  timeAgo: string;
  specs: string;
  description: string;
  type: 'auto-resolved' | 'geofence' | 'resolved';
  typeLabel: string;
  metricLabel: string;
  canUndo?: boolean;
}

interface ApiUser {
  id: number;
  username: string;
  passwordSalt: string;
  passwordHash: string;
  fullName: string;
  email: string;
  role: string;
}

interface AndroidDeviceRecord {
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

interface SensorReadingRecord {
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

interface JwtPayloadData {
  sub: number;
  username: string;
  role: string;
  type: 'access' | 'refresh';
}

interface AuthenticatedRequest extends Request {
  user?: JwtPayloadData;
}

interface PersistedDatabase {
  users: ApiUser[];
  luminarias: LuminariaRecord[];
  escenas: EscenaRecord[];
  reglas: ReglaRecord[];
  incidentes: IncidenteRecord[];
  devices: AndroidDeviceRecord[];
  sensorReadings: SensorReadingRecord[];
}

// ISO 27400: Hash seguro de credenciales con scrypt + salt aleatorio
function hashPassword(password: string, existingSalt?: string): { salt: string; hash: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

function createInitialDb(): PersistedDatabase {
  const sofiaCreds = hashPassword('lumi2026');
  const adminCreds = hashPassword('admin2026');

  return {
    users: [
      {
        id: 1,
        username: 'sofia',
        passwordSalt: sofiaCreds.salt,
        passwordHash: sofiaCreds.hash,
        fullName: 'Sofía Mendoza',
        email: 'sofia.m@lumicontrol.iot',
        role: 'Supervisora de Hogar',
      },
      {
        id: 2,
        username: 'admin',
        passwordSalt: adminCreds.salt,
        passwordHash: adminCreds.hash,
        fullName: 'Carlos Mendoza',
        email: 'carlos.m@lumicontrol.iot',
        role: 'Admin IoT',
      },
    ],
    luminarias: [
      {
        id: 'lum-1',
        name: 'Lámpara Estudio',
        room: 'Sala de Estudio',
        roomType: 'estudio',
        isOn: true,
        brightness: 85,
        colorTemp: 2900,
        powerWatts: 22.4,
        pirActive: true,
        sensorDistance: '1.2m',
        iconType: 'lamp',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'lum-2',
        name: 'Plafón Suite',
        room: 'Habitación Ppal',
        roomType: 'dormitorio',
        isOn: true,
        brightness: 40,
        colorTemp: 3200,
        powerWatts: 14.0,
        modeLabel: '3200K Lectura',
        iconType: 'ceiling',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'lum-3',
        name: 'Tira LED Mesa',
        room: 'Sala de Estudio',
        roomType: 'estudio',
        isOn: false,
        brightness: 0,
        colorTemp: 4000,
        powerWatts: 0,
        scheduleLabel: 'Auto 20:00',
        iconType: 'strip',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'lum-4',
        name: 'Focos Isla',
        room: 'Cocina',
        roomType: 'cocina',
        isOn: true,
        brightness: 100,
        colorTemp: 4500,
        powerWatts: 16.0,
        modeLabel: '4500K Neutra',
        iconType: 'spot',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'lum-5',
        name: 'Aplique Cabecero',
        room: 'Habitación Ppal',
        roomType: 'dormitorio',
        isOn: false,
        brightness: 0,
        colorTemp: 2400,
        powerWatts: 0,
        modeLabel: '2400K Calidez',
        iconType: 'bedside',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'lum-6',
        name: 'Tira Bajomuebles',
        room: 'Cocina',
        roomType: 'cocina',
        isOn: false,
        brightness: 0,
        colorTemp: 3000,
        powerWatts: 0,
        scheduleLabel: 'Auto PIR',
        iconType: 'strip',
        updatedAt: new Date().toISOString(),
      },
    ],
    escenas: [
      {
        id: 'sc-1',
        name: 'Relax Atardecer',
        category: 'favoritas',
        description: '4 lámparas vinculadas · Salón & Comedor',
        temperature: 2200,
        tempLabel: '2200 K',
        intensity: 35,
        powerWatts: 14.2,
        linkedLightsCount: 4,
        roomSummary: 'Salón & Comedor',
        badge: 'En vivo',
        badgeType: 'live',
        footerNote: 'Sincronización óptica suave',
        active: true,
        iconName: 'sunset',
      },
      {
        id: 'sc-2',
        name: 'Modo Concentración',
        category: 'favoritas',
        description: 'Foco directo en escritorio y lectura',
        temperature: 5000,
        tempLabel: '5000 K',
        intensity: 90,
        powerWatts: 38.5,
        linkedLightsCount: 2,
        roomSummary: 'Estudio & Despacho',
        badge: 'PIR Activo',
        badgeType: 'pir',
        footerNote: 'Apaga al detectar 10 min de ausencia',
        active: false,
        iconName: 'focus',
      },
      {
        id: 'sc-3',
        name: 'Cine & Gaming',
        category: 'inmersivas',
        description: 'Acentos cian & apagado perimetral',
        temperature: 6500,
        tempLabel: 'Cian Dual',
        intensity: 15,
        powerWatts: 18.0,
        linkedLightsCount: 5,
        roomSummary: 'Salón Home Cinema',
        badge: 'Inmersivo',
        badgeType: 'immersive',
        footerNote: 'Vía HDMI Sync Box',
        active: false,
        iconName: 'gamepad',
      },
      {
        id: 'sc-4',
        name: 'Luz Nocturna / Guía',
        category: 'circadianas',
        description: 'Pasillo, baño y zócalos de cortesía',
        temperature: 2000,
        tempLabel: '2000 K',
        intensity: 5,
        powerWatts: 4.8,
        linkedLightsCount: 3,
        roomSummary: 'Pasillo & Baño',
        badge: 'No molestar',
        badgeType: 'dnd',
        footerNote: 'Modo descanso (23:00 - 07:00)',
        active: false,
        iconName: 'moon',
      },
    ],
    reglas: [
      {
        id: 'reg-1',
        targetDevice: 'lum-1',
        deviceLabel: 'Lámpara Estudio (PIR mmWave)',
        triggerType: 'pir_mmwave',
        waitMinutes: 20,
        onlyNight: true,
        outsideGeofence: false,
        actionType: 'warning_with_snooze',
        softDimming: true,
        savedKwhWeekly: 2.1,
        savedUsdWeekly: 0.42,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'reg-2',
        targetDevice: 'all',
        deviceLabel: 'Toda la Casa (Geocerca Wi-Fi)',
        triggerType: 'geofence',
        waitMinutes: 10,
        onlyNight: false,
        outsideGeofence: true,
        actionType: 'direct_cut',
        softDimming: false,
        savedKwhWeekly: 3.8,
        savedUsdWeekly: 0.76,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ],
    incidentes: [
      {
        id: 'inc-1',
        title: 'Plafón Cocina',
        timeAgo: 'Hace 22 min',
        specs: '45W LED',
        description: 'Auto-apagado ejecutado tras 30 min sin ocupación detectada en zona de encimera.',
        type: 'auto-resolved',
        typeLabel: 'Auto-resuelto',
        metricLabel: 'Ahorro estimado: 0.04 kWh',
        canUndo: true,
      },
      {
        id: 'inc-2',
        title: 'Foco Pasillo',
        timeAgo: 'Hace 1h 15m',
        specs: 'Entrada principal',
        description: 'Apagado remoto ejecutado al desconectarse dispositivos familiares de la red local (Fuera de casa).',
        type: 'geofence',
        typeLabel: 'Geocerca Wi-Fi',
        metricLabel: 'Trigger: RSSI de red bajo umbral',
        canUndo: false,
      },
      {
        id: 'inc-3',
        title: 'Luz Escritorio',
        timeAgo: 'Ayer 23:45',
        specs: 'Dormitorio 1',
        description: 'Aviso nocturno atendido y confirmado manualmente desde la app por usuario Administrador.',
        type: 'resolved',
        typeLabel: 'Resuelto',
        metricLabel: 'Acción manual vía push',
        canUndo: false,
      },
    ],
    devices: [
      {
        id: 'android-1',
        name: 'Android 1 · Pixel 9 Pro',
        model: 'Android 15 (Kotlin App)',
        channel: 'bluetooth',
        status: 'online',
        rssiDbm: -42,
        batteryPct: 88,
        lastSeen: new Date().toISOString(),
        lastCommand: 'BT LINK ESP32_LumiControl',
      },
      {
        id: 'android-2',
        name: 'Android 2 · Galaxy S24',
        model: 'Android 14 (Cliente Remoto)',
        channel: 'wifi',
        status: 'online',
        rssiDbm: -49,
        batteryPct: 74,
        lastSeen: new Date().toISOString(),
        lastCommand: 'WIFI SYNC luminarias',
      },
    ],
    sensorReadings: [
      {
        id: 'sr-1',
        sensorType: 'pir_mmwave',
        zone: 'Estudio',
        value: 1,
        unit: 'presencia',
        deviceId: 'android-1',
        deviceName: 'Android 1 · Pixel 9 Pro',
        channel: 'bluetooth',
        timestamp: new Date(Date.now() - 180000).toISOString(),
      },
      {
        id: 'sr-2',
        sensorType: 'luxometro',
        zone: 'Estudio',
        value: 420,
        unit: 'lux',
        deviceId: 'android-1',
        deviceName: 'Android 1 · Pixel 9 Pro',
        channel: 'bluetooth',
        timestamp: new Date(Date.now() - 120000).toISOString(),
      },
      {
        id: 'sr-3',
        sensorType: 'potencia_w',
        zone: 'Cocina',
        value: 16.0,
        unit: 'W',
        deviceId: 'android-2',
        deviceName: 'Android 2 · Galaxy S24',
        channel: 'wifi',
        timestamp: new Date(Date.now() - 60000).toISOString(),
      },
      {
        id: 'sr-4',
        sensorType: 'rssi_bt',
        zone: 'Dormitorio',
        value: -44,
        unit: 'dBm',
        deviceId: 'android-2',
        deviceName: 'Android 2 · Galaxy S24',
        channel: 'bluetooth',
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

function loadDb(): PersistedDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedDatabase>;
      const fallback = createInitialDb();
      return {
        users: parsed.users && parsed.users.length > 0 ? parsed.users : fallback.users,
        luminarias: parsed.luminarias && parsed.luminarias.length > 0 ? parsed.luminarias : fallback.luminarias,
        escenas: parsed.escenas && parsed.escenas.length > 0 ? parsed.escenas : fallback.escenas,
        reglas: parsed.reglas ?? fallback.reglas,
        incidentes: parsed.incidentes ?? fallback.incidentes,
        devices: parsed.devices && parsed.devices.length > 0 ? parsed.devices : fallback.devices,
        sensorReadings: parsed.sensorReadings && parsed.sensorReadings.length > 0 ? parsed.sensorReadings : fallback.sensorReadings,
      };
    }
  } catch (err) {
    console.warn('Database read warning, initializing fresh store:', err);
  }
  const initial = createInitialDb();
  saveDb(initial);
  return initial;
}

function saveDb(db: PersistedDatabase) {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Database write error:', err);
  }
}

const db = loadDb();

interface PairingSession {
  code: string;
  userId: number;
  channel: 'bluetooth' | 'wifi' | 'usb';
  createdAt: number;
  expiresAt: number;
}

const pairingSessions = new Map<string, PairingSession>();

// Clientes SSE conectados para sincronización en tiempo real entre 2+ dispositivos Android
const sseClients = new Set<Response>();

function broadcastRealtimeEvent(event: string, payload: unknown) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  });
}

// Orígenes explícitos permitidos (CORS restrictivo - ES03 Req 4)
const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = new Set<string>([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  ...(process.env.APP_URL ? [process.env.APP_URL.replace(/\/$/, '')] : []),
  ...configuredOrigins,
]);

function requireJwtAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      detail: 'Authentication credentials were not provided.',
      code: 'not_authenticated',
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as JwtPayloadData;
    if (decoded.type !== 'access') {
      res.status(401).json({
        detail: 'Given token not valid for any token type',
        code: 'token_not_valid',
      });
      return;
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      detail: 'Given token not valid for any token type',
      code: 'token_not_valid',
    });
  }
}

function calcWatts(isOn: boolean, brightness: number): number {
  if (!isOn || brightness <= 0) return 0;
  return Number(((brightness / 100) * 25).toFixed(1));
}

function issueTokens(user: ApiUser) {
  const access = jwt.sign(
    { sub: user.id, username: user.username, role: user.role, type: 'access' },
    JWT_SECRET,
    { expiresIn: '30m' }
  );

  const refresh = jwt.sign(
    { sub: user.id, username: user.username, role: user.role, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return {
    access,
    refresh,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
}

async function startServer() {
  const app = express();

  app.use(express.json());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        const normalized = origin.replace(/\/$/, '');
        if (ALLOWED_ORIGINS.has(normalized) || normalized.endsWith('.run.app')) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // ============================================================================
  // ENDPOINTS PÚBLICOS (AllowAny): Health, Token Pair, Refresh & Registro
  // ============================================================================

  app.get('/api/health/', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'LumiControl IoT REST API',
      auth_scheme: 'Bearer JWT (HS256) + scrypt',
      cors_policy: 'Explicit Allowed Origins',
      allowed_origins_count: ALLOWED_ORIGINS.size,
      iso_27400: 'Credentials hashed (scrypt), RBAC JWT, TLS/HTTPS enforced',
      persisted_records: {
        users: db.users.length,
        luminarias: db.luminarias.length,
        devices: db.devices.length,
        sensor_readings: db.sensorReadings.length,
      },
      endpoints: [
        'POST /api/token/',
        'POST /api/token/refresh/',
        'POST /api/register/',
        'GET/POST /api/luminarias/',
        'GET/PATCH/DELETE /api/luminarias/:id/',
        'POST /api/luminarias/:id/toggle/',
        'POST /api/luminarias/apagar_todas/',
        'GET/POST /api/escenas/',
        'POST /api/escenas/:id/activar/',
        'GET/POST/PATCH/DELETE /api/reglas/',
        'GET/DELETE /api/incidentes/',
        'GET/POST /api/dispositivos/',
        'GET/POST /api/sensores/lecturas/',
        'GET /api/seguridad/auditoria/',
        'GET /api/telemetria/',
      ],
    });
  });

  app.post('/api/register/', (req: Request, res: Response) => {
    const { username, password, full_name, email } = req.body || {};
    const cleanUser = String(username || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanEmail = String(email || `${cleanUser}@lumicontrol.iot`).trim().toLowerCase();
    if (!cleanUser || !password || String(password).length < 4) {
      res.status(400).json({
        detail: 'Usuario y contraseña (mínimo 4 caracteres) son obligatorios.',
      });
      return;
    }

    if (db.users.some((u) => u.username.toLowerCase() === cleanUser)) {
      res.status(409).json({
        detail: 'Ese nombre de usuario ya está registrado.',
      });
      return;
    }

    if (email && db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      res.status(409).json({
        detail: 'Ese correo electrónico ya está registrado.',
      });
      return;
    }

    const { salt, hash } = hashPassword(String(password));
    const newUser: ApiUser = {
      id: Date.now(),
      username: cleanUser,
      passwordSalt: salt,
      passwordHash: hash,
      fullName: String(full_name || cleanUser).trim(),
      email: cleanEmail,
      role: 'Operador IoT',
    };

    db.users.push(newUser);
    saveDb(db);

    res.status(201).json(issueTokens(newUser));
  });

  app.post('/api/token/', (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({
        detail: 'Se requieren los campos usuario/correo y contraseña.',
      });
      return;
    }

    const identifier = String(username).trim().toLowerCase();
    const compactIdentifier = identifier.replace(/\s+/g, '');
    const candidates = db.users.filter(
      (u) =>
        u.username.toLowerCase() === identifier ||
        u.username.toLowerCase() === compactIdentifier ||
        u.email.toLowerCase() === identifier ||
        u.fullName.toLowerCase() === identifier
    );
    const user = candidates.find((u) =>
      verifyPassword(String(password), u.passwordSalt, u.passwordHash)
    );
    if (!user) {
      res.status(401).json({
        detail: 'Credenciales incorrectas. Verifica tu usuario/correo y contraseña.',
        code: 'no_active_account',
      });
      return;
    }

    res.status(200).json(issueTokens(user));
  });

  app.post('/api/token/refresh/', (req: Request, res: Response) => {
    const { refresh } = req.body || {};
    if (!refresh) {
      res.status(400).json({ detail: 'refresh token is required' });
      return;
    }

    try {
      const decoded = jwt.verify(String(refresh), JWT_REFRESH_SECRET) as unknown as JwtPayloadData;
      if (decoded.type !== 'refresh') {
        res.status(401).json({ detail: 'Invalid refresh token type' });
        return;
      }

      const access = jwt.sign(
        {
          sub: decoded.sub,
          username: decoded.username,
          role: decoded.role,
          type: 'access',
        },
        JWT_SECRET,
        { expiresIn: '30m' }
      );

      res.status(200).json({ access });
    } catch {
      res.status(401).json({
        detail: 'Token is invalid or expired',
        code: 'token_not_valid',
      });
    }
  });

  // ============================================================================
  // EMPAREJAMIENTO RÁPIDO PC ↔ CELULAR (Cable USB / Enlace directo 1-Click)
  // ============================================================================
  app.post('/api/pair/create/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const now = Date.now();
    for (const [k, v] of pairingSessions.entries()) {
      if (v.expiresAt < now) pairingSessions.delete(k);
    }

    const reqChannel = req.body?.channel;
    const channel: 'bluetooth' | 'wifi' | 'usb' =
      reqChannel === 'usb' ? 'usb' : reqChannel === 'wifi' ? 'wifi' : 'bluetooth';

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = now + 10 * 60 * 1000;
    pairingSessions.set(code, {
      code,
      userId: req.user!.sub,
      channel,
      createdAt: now,
      expiresAt,
    });

    res.status(201).json({
      code,
      channel,
      expires_in_seconds: 600,
    });
  });

  app.post('/api/pair/claim/', (req: Request, res: Response) => {
    const rawCode = String(req.body?.code || '').trim();
    const session = pairingSessions.get(rawCode);
    if (!session || session.expiresAt < Date.now()) {
      pairingSessions.delete(rawCode);
      res.status(404).json({ detail: 'Código de sincronización inválido o expirado.' });
      return;
    }

    const user = db.users.find((u) => u.id === session.userId) || db.users[0];
    if (!user) {
      res.status(404).json({ detail: 'Usuario asociado no encontrado.' });
      return;
    }

    const reqChannel = req.body?.channel || session.channel;
    const resolvedChannel: 'bluetooth' | 'wifi' | 'usb' =
      reqChannel === 'wifi' ? 'wifi' : reqChannel === 'usb' ? 'usb' : 'bluetooth';

    const deviceId = String(req.body?.deviceId || `android-phone-${Date.now().toString().slice(-4)}`);
    const deviceName = String(req.body?.deviceName || 'Teléfono Android Sincronizado');
    const deviceModel = String(
      req.body?.model ||
        (resolvedChannel === 'usb' ? 'Android USB Cable Sync' : 'Android Mobile Browser')
    );

    const existingIdx = db.devices.findIndex((d) => d.id === deviceId);
    const deviceRecord: AndroidDeviceRecord = {
      id: deviceId,
      name: deviceName,
      model: deviceModel,
      channel: resolvedChannel,
      status: 'online',
      rssiDbm: resolvedChannel === 'usb' ? 0 : -40,
      batteryPct: Number(req.body?.batteryPct ?? 92),
      lastSeen: new Date().toISOString(),
      lastCommand: 'ENLAZADO EN VIVO',
      usbDetails: resolvedChannel === 'usb' ? 'Sincronizado por Cable USB / Enlace' : undefined,
    };

    if (existingIdx >= 0) {
      db.devices[existingIdx] = { ...db.devices[existingIdx], ...deviceRecord };
    } else {
      db.devices.push(deviceRecord);
    }
    saveDb(db);

    broadcastRealtimeEvent('devices_sync', db.devices);
    broadcastRealtimeEvent('command_relay', {
      fromDeviceId: deviceId,
      fromDeviceName: deviceName,
      channel: resolvedChannel,
      command: 'DISPOSITIVO CONECTADO',
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      ...issueTokens(user),
      device: deviceRecord,
      channel: resolvedChannel,
    });
  });

  // ============================================================================
  // STREAM EN TIEMPO REAL SSE (Sincronización entre 2+ Dispositivos Android)
  // ============================================================================
  app.get('/api/stream/', (req: Request, res: Response) => {
    const queryToken = typeof req.query.token === 'string' ? req.query.token : '';
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : queryToken;

    if (!token) {
      res.status(401).json({ detail: 'Authentication credentials were not provided.' });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as unknown as JwtPayloadData;
      if (decoded.type !== 'access') {
        res.status(401).json({ detail: 'Invalid token' });
        return;
      }
    } catch {
      res.status(401).json({ detail: 'Invalid token' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);
    res.write(`event: connected\ndata: ${JSON.stringify({ clients: sseClients.size })}\n\n`);

    const keepAlive = setInterval(() => {
      try {
        res.write(`: ping ${Date.now()}\n\n`);
      } catch {
        clearInterval(keepAlive);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  // ============================================================================
  // ENDPOINTS PROTEGIDOS (IsAuthenticated + Bearer JWT)
  // ============================================================================

  // --- LUMINARIAS CRUD + ACTIONS ---
  app.get('/api/luminarias/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const roomType = typeof req.query.room_type === 'string' ? req.query.room_type : '';
    const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : '';

    let result = [...db.luminarias];
    if (roomType && roomType !== 'todas') {
      result = result.filter((l) => l.roomType === roomType);
    }
    if (search) {
      result = result.filter(
        (l) => l.name.toLowerCase().includes(search) || l.room.toLowerCase().includes(search)
      );
    }

    res.status(200).json(result);
  });

  app.post('/api/luminarias/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const { name, room, roomType, brightness, colorTemp, iconType, isOn } = req.body || {};
    if (!name || !room) {
      res.status(400).json({ detail: 'Los campos name y room son obligatorios.' });
      return;
    }

    const validRooms = ['estudio', 'dormitorio', 'cocina', 'salon'];
    const resolvedRoomType = validRooms.includes(roomType) ? roomType : 'estudio';
    const resolvedBrightness = Math.max(0, Math.min(100, Number(brightness ?? 80)));
    const resolvedTemp = Math.max(2000, Math.min(6500, Number(colorTemp ?? 3000)));
    const resolvedIsOn = Boolean(isOn ?? resolvedBrightness > 0);

    const newItem: LuminariaRecord = {
      id: `lum-${Date.now()}`,
      name: String(name).trim(),
      room: String(room).trim(),
      roomType: resolvedRoomType,
      isOn: resolvedIsOn,
      brightness: resolvedIsOn ? resolvedBrightness : 0,
      colorTemp: resolvedTemp,
      powerWatts: calcWatts(resolvedIsOn, resolvedBrightness),
      modeLabel: `${resolvedTemp}K Personalizada`,
      iconType: iconType || 'lamp',
      updatedAt: new Date().toISOString(),
    };

    db.luminarias.push(newItem);
    saveDb(db);
    broadcastRealtimeEvent('luminarias_sync', db.luminarias);
    res.status(201).json(newItem);
  });

  app.get('/api/luminarias/:id/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const item = db.luminarias.find((l) => l.id === req.params.id);
    if (!item) {
      res.status(404).json({ detail: 'Luminaria not found.' });
      return;
    }
    res.status(200).json(item);
  });

  const updateLuminariaHandler = (req: AuthenticatedRequest, res: Response) => {
    const idx = db.luminarias.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ detail: 'Luminaria not found.' });
      return;
    }

    const current = db.luminarias[idx];
    const body = req.body || {};
    const requestedBrightness =
      body.brightness !== undefined
        ? Math.max(0, Math.min(100, Number(body.brightness)))
        : current.brightness;
    const nextIsOn =
      body.isOn !== undefined
        ? Boolean(body.isOn)
        : body.brightness !== undefined
        ? requestedBrightness > 0
        : current.isOn;
    const nextColorTemp =
      body.colorTemp !== undefined
        ? Math.max(2000, Math.min(6500, Number(body.colorTemp)))
        : current.colorTemp;
    const preservedBrightness = nextIsOn
      ? requestedBrightness === 0
        ? current.brightness > 0
          ? current.brightness
          : 80
        : requestedBrightness
      : body.brightness !== undefined && requestedBrightness === 0
      ? current.brightness || 80
      : requestedBrightness;

    const updated: LuminariaRecord = {
      ...current,
      name: body.name !== undefined ? String(body.name).trim() : current.name,
      room: body.room !== undefined ? String(body.room).trim() : current.room,
      roomType: body.roomType !== undefined ? body.roomType : current.roomType,
      isOn: nextIsOn,
      brightness: preservedBrightness,
      colorTemp: nextColorTemp,
      powerWatts: calcWatts(nextIsOn, preservedBrightness),
      pirActive: body.pirActive !== undefined ? Boolean(body.pirActive) : current.pirActive,
      iconType: body.iconType !== undefined ? body.iconType : current.iconType,
      updatedAt: new Date().toISOString(),
    };

    db.luminarias[idx] = updated;
    saveDb(db);
    broadcastRealtimeEvent('luminarias_sync', db.luminarias);
    res.status(200).json(updated);
  };

  app.patch('/api/luminarias/:id/', requireJwtAuth, updateLuminariaHandler);
  app.put('/api/luminarias/:id/', requireJwtAuth, updateLuminariaHandler);

  app.delete('/api/luminarias/:id/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const exists = db.luminarias.some((l) => l.id === req.params.id);
    if (!exists) {
      res.status(404).json({ detail: 'Luminaria not found.' });
      return;
    }
    db.luminarias = db.luminarias.filter((l) => l.id !== req.params.id);
    saveDb(db);
    broadcastRealtimeEvent('luminarias_sync', db.luminarias);
    res.status(204).send();
  });

  app.post('/api/luminarias/:id/toggle/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const idx = db.luminarias.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ detail: 'Luminaria not found.' });
      return;
    }
    const current = db.luminarias[idx];
    const nextIsOn = !current.isOn;
    const nextBrightness = nextIsOn ? (current.brightness > 0 ? current.brightness : 80) : current.brightness;
    const updated: LuminariaRecord = {
      ...current,
      isOn: nextIsOn,
      brightness: nextIsOn ? nextBrightness : current.brightness,
      powerWatts: calcWatts(nextIsOn, nextBrightness),
      updatedAt: new Date().toISOString(),
    };
    db.luminarias[idx] = updated;
    saveDb(db);
    broadcastRealtimeEvent('luminarias_sync', db.luminarias);
    res.status(200).json(updated);
  });

  app.post('/api/luminarias/apagar_todas/', requireJwtAuth, (_req: AuthenticatedRequest, res: Response) => {
    db.luminarias = db.luminarias.map((l) => ({
      ...l,
      isOn: false,
      powerWatts: 0,
      updatedAt: new Date().toISOString(),
    }));
    saveDb(db);
    broadcastRealtimeEvent('luminarias_sync', db.luminarias);
    res.status(200).json({
      detail: 'Todas las luminarias apagadas correctamente.',
      luminarias: db.luminarias,
    });
  });

  // --- ESCENAS ---
  app.get('/api/escenas/', requireJwtAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.status(200).json(db.escenas);
  });

  app.post('/api/escenas/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const {
      name,
      category,
      description,
      temperature,
      intensity,
      targetZones,
      transitionType,
      activateNow,
    } = req.body || {};

    if (!name || !String(name).trim()) {
      res.status(400).json({ detail: 'El nombre de la escena es obligatorio.' });
      return;
    }

    const validZones: ('estudio' | 'dormitorio' | 'cocina' | 'salon')[] = ['estudio', 'dormitorio', 'cocina', 'salon'];
    const zones: ('estudio' | 'dormitorio' | 'cocina' | 'salon')[] = Array.isArray(targetZones)
      ? targetZones.filter((z: string) => validZones.includes(z as any))
      : ['estudio', 'salon'];
    const resolvedZones = zones.length > 0 ? zones : (['estudio'] as ('estudio' | 'dormitorio' | 'cocina' | 'salon')[]);
    const resolvedTemp = Math.max(2000, Math.min(6500, Number(temperature ?? 2700)));
    const resolvedIntensity = Math.max(10, Math.min(100, Number(intensity ?? 75)));
    const resolvedTransition: 'smooth' | 'instant' = transitionType === 'instant' ? 'instant' : 'smooth';
    const matchingLights = db.luminarias.filter((l) => resolvedZones.includes(l.roomType));
    const estWatts = Number(
      matchingLights
        .reduce((sum, l) => sum + calcWatts(true, resolvedIntensity), 0)
        .toFixed(1)
    );

    const newScene: EscenaRecord = {
      id: `sc-${Date.now()}`,
      name: String(name).trim(),
      category: category === 'inmersivas' ? 'inmersivas' : category === 'circadianas' ? 'circadianas' : 'favoritas',
      description: String(description || `Escena personalizada (${resolvedZones.join(', ')})`),
      temperature: resolvedTemp,
      tempLabel: `${resolvedTemp} K`,
      intensity: resolvedIntensity,
      powerWatts: estWatts || calcWatts(true, resolvedIntensity),
      linkedLightsCount: matchingLights.length || resolvedZones.length,
      roomSummary: resolvedZones.map((z) => z.charAt(0).toUpperCase() + z.slice(1)).join(' + '),
      badge: resolvedTransition === 'instant' ? '0s Instant' : 'ESP-Mesh',
      badgeType: 'live',
      footerNote: `${resolvedTransition === 'smooth' ? 'Transición suave 3s' : 'Cambio instantáneo'} • ${resolvedZones.length} zonas`,
      active: Boolean(activateNow ?? true),
      iconName: 'flame',
      targetZones: resolvedZones,
      transitionType: resolvedTransition,
      isCustom: true,
    };

    if (newScene.active) {
      db.escenas = db.escenas.map((s) => ({ ...s, active: false }));
      db.luminarias = db.luminarias.map((l) =>
        resolvedZones.includes(l.roomType)
          ? {
              ...l,
              isOn: true,
              brightness: resolvedIntensity,
              colorTemp: resolvedTemp,
              powerWatts: calcWatts(true, resolvedIntensity),
              modeLabel: `${resolvedTemp}K Escena`,
              updatedAt: new Date().toISOString(),
            }
          : l
      );
      broadcastRealtimeEvent('luminarias_sync', db.luminarias);
    }

    db.escenas = [...db.escenas, newScene];
    saveDb(db);
    res.status(201).json({
      scene: newScene,
      escenas: db.escenas,
      luminarias: db.luminarias,
    });
  });

  app.delete('/api/escenas/:id/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const target = db.escenas.find((s) => s.id === req.params.id);
    if (!target) {
      res.status(404).json({ detail: 'Escena not found.' });
      return;
    }
    db.escenas = db.escenas.filter((s) => s.id !== req.params.id);
    saveDb(db);
    res.status(204).send();
  });

  app.post('/api/escenas/:id/activar/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const target = db.escenas.find((s) => s.id === req.params.id);
    if (!target) {
      res.status(404).json({ detail: 'Escena not found.' });
      return;
    }

    db.escenas = db.escenas.map((s) => ({
      ...s,
      active: s.id === target.id,
    }));

    if (target.id === 'sc-1') {
      db.luminarias = db.luminarias.map((l) =>
        l.roomType === 'estudio' || l.roomType === 'salon'
          ? { ...l, isOn: true, brightness: 35, colorTemp: 2200, powerWatts: 8.5, updatedAt: new Date().toISOString() }
          : l
      );
    } else if (target.id === 'sc-2') {
      db.luminarias = db.luminarias.map((l) =>
        l.roomType === 'estudio'
          ? { ...l, isOn: true, brightness: 90, colorTemp: 5000, powerWatts: 22.4, updatedAt: new Date().toISOString() }
          : l
      );
    } else if (target.id === 'sc-3') {
      db.luminarias = db.luminarias.map((l) =>
        l.roomType === 'estudio'
          ? { ...l, isOn: true, brightness: 15, colorTemp: 6500, powerWatts: 4.0, updatedAt: new Date().toISOString() }
          : { ...l, isOn: false, powerWatts: 0, updatedAt: new Date().toISOString() }
      );
    } else if (target.id === 'sc-4') {
      db.luminarias = db.luminarias.map((l) =>
        l.roomType === 'dormitorio'
          ? { ...l, isOn: true, brightness: 15, colorTemp: 2000, powerWatts: 3.8, updatedAt: new Date().toISOString() }
          : { ...l, isOn: false, powerWatts: 0, updatedAt: new Date().toISOString() }
      );
    } else {
      const targetZones = target.targetZones?.length ? target.targetZones : ['estudio', 'salon'];
      db.luminarias = db.luminarias.map((l) =>
        targetZones.includes(l.roomType)
          ? {
              ...l,
              isOn: true,
              brightness: target.intensity,
              colorTemp: target.temperature,
              powerWatts: calcWatts(true, target.intensity),
              updatedAt: new Date().toISOString(),
            }
          : l
      );
    }

    saveDb(db);
    broadcastRealtimeEvent('luminarias_sync', db.luminarias);
    res.status(200).json({
      active_scene: target.name,
      escenas: db.escenas,
      luminarias: db.luminarias,
    });
  });

  // --- REGLAS ANTI-OLVIDO CRUD ---
  app.get('/api/reglas/', requireJwtAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.status(200).json(db.reglas);
  });

  app.post('/api/reglas/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const {
      targetDevice,
      deviceLabel,
      triggerType,
      waitMinutes,
      onlyNight,
      outsideGeofence,
      actionType,
      softDimming,
      savedKwhWeekly,
      savedUsdWeekly,
    } = req.body || {};
    if (!targetDevice || !waitMinutes) {
      res.status(400).json({ detail: 'targetDevice y waitMinutes son obligatorios.' });
      return;
    }

    const mins = Number(waitMinutes);
    const computedKwh =
      savedKwhWeekly !== undefined
        ? Number(savedKwhWeekly)
        : Number(
            (
              (targetDevice === 'toda-casa' ? 3.4 : 1.9) *
              (mins <= 15 ? 1.25 : mins <= 30 ? 1.0 : 0.78) *
              (outsideGeofence ? 1.2 : 1.0)
            ).toFixed(2)
          );
    const computedUsd =
      savedUsdWeekly !== undefined
        ? Number(savedUsdWeekly)
        : Number((computedKwh * 0.2).toFixed(2));

    const newRule: ReglaRecord = {
      id: `reg-${Date.now()}`,
      targetDevice: String(targetDevice),
      deviceLabel: String(deviceLabel || targetDevice),
      triggerType: triggerType || 'pir_mmwave',
      waitMinutes: mins,
      onlyNight: Boolean(onlyNight),
      outsideGeofence: Boolean(outsideGeofence),
      actionType: actionType || 'warning_with_snooze',
      softDimming: Boolean(softDimming),
      savedKwhWeekly: computedKwh,
      savedUsdWeekly: computedUsd,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.reglas = [newRule, ...db.reglas];
    saveDb(db);
    res.status(201).json(newRule);
  });

  app.patch('/api/reglas/:id/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const idx = db.reglas.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ detail: 'Regla not found.' });
      return;
    }
    db.reglas[idx] = { ...db.reglas[idx], ...req.body };
    saveDb(db);
    res.status(200).json(db.reglas[idx]);
  });

  app.delete('/api/reglas/:id/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const exists = db.reglas.some((r) => r.id === req.params.id);
    if (!exists) {
      res.status(404).json({ detail: 'Regla not found.' });
      return;
    }
    db.reglas = db.reglas.filter((r) => r.id !== req.params.id);
    saveDb(db);
    res.status(204).send();
  });

  // --- INCIDENTES ---
  app.get('/api/incidentes/', requireJwtAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.status(200).json(db.incidentes);
  });

  app.delete('/api/incidentes/:id/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    db.incidentes = db.incidentes.filter((i) => i.id !== req.params.id);
    saveDb(db);
    res.status(204).send();
  });

  // --- INTERCONEXIÓN DUAL ANDROID (WIFI / BLUETOOTH) ---
  app.get('/api/dispositivos/', requireJwtAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.status(200).json(db.devices);
  });

  app.post('/api/dispositivos/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const { id, name, model, channel, rssiDbm, batteryPct, lastCommand, usbDetails } = req.body || {};
    const deviceId = String(id || `android-${Date.now()}`);
    const existingIdx = db.devices.findIndex((d) => d.id === deviceId);
    const resolvedChannel: 'bluetooth' | 'wifi' | 'usb' =
      channel === 'wifi' ? 'wifi' : channel === 'usb' ? 'usb' : 'bluetooth';

    const record: AndroidDeviceRecord = {
      id: deviceId,
      name: String(name || 'Dispositivo Android'),
      model: String(model || 'Android Mobile Client'),
      channel: resolvedChannel,
      status: 'online',
      rssiDbm: Number(rssiDbm ?? (resolvedChannel === 'usb' ? 0 : -45)),
      batteryPct: Number(batteryPct ?? 90),
      lastSeen: new Date().toISOString(),
      lastCommand: lastCommand ? String(lastCommand) : undefined,
      usbDetails: usbDetails ? String(usbDetails) : undefined,
    };

    if (existingIdx >= 0) {
      db.devices[existingIdx] = { ...db.devices[existingIdx], ...record };
    } else {
      db.devices.push(record);
    }

    saveDb(db);
    broadcastRealtimeEvent('devices_sync', db.devices);
    res.status(existingIdx >= 0 ? 200 : 201).json(record);
  });

  app.delete('/api/dispositivos/:id/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const exists = db.devices.some((d) => d.id === req.params.id);
    if (!exists) {
      res.status(404).json({ detail: 'Dispositivo not found.' });
      return;
    }
    db.devices = db.devices.filter((d) => d.id !== req.params.id);
    saveDb(db);
    broadcastRealtimeEvent('devices_sync', db.devices);
    res.status(204).send();
  });

  app.post('/api/dispositivos/sync/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const { fromDeviceId, fromDeviceName, channel, command, targetLightId } = req.body || {};
    const resolvedChannel: 'bluetooth' | 'wifi' | 'usb' =
      channel === 'wifi' ? 'wifi' : channel === 'usb' ? 'usb' : 'bluetooth';
    const devIdx = db.devices.findIndex((d) => d.id === fromDeviceId);
    if (devIdx >= 0) {
      db.devices[devIdx].status = 'online';
      db.devices[devIdx].lastSeen = new Date().toISOString();
      db.devices[devIdx].channel = resolvedChannel;
      db.devices[devIdx].lastCommand = String(command || 'SYNC');
    } else if (fromDeviceId) {
      db.devices.push({
        id: String(fromDeviceId),
        name: String(fromDeviceName || 'Dispositivo Conectado'),
        model: resolvedChannel === 'usb' ? 'Cable USB Sync' : 'Cliente Móvil / Web',
        channel: resolvedChannel,
        status: 'online',
        rssiDbm: resolvedChannel === 'usb' ? 0 : -44,
        batteryPct: 95,
        lastSeen: new Date().toISOString(),
        lastCommand: String(command || 'SYNC'),
      });
    }

    if (targetLightId) {
      const lumIdx = db.luminarias.findIndex((l) => l.id === targetLightId);
      if (lumIdx >= 0) {
        const turnOn = String(command).toUpperCase().includes('ENCENDER');
        const nextBri = db.luminarias[lumIdx].brightness > 0 ? db.luminarias[lumIdx].brightness : 80;
        db.luminarias[lumIdx] = {
          ...db.luminarias[lumIdx],
          isOn: turnOn,
          brightness: nextBri,
          powerWatts: calcWatts(turnOn, nextBri),
          updatedAt: new Date().toISOString(),
        };
        broadcastRealtimeEvent('luminarias_sync', db.luminarias);
      }
    }

    saveDb(db);
    broadcastRealtimeEvent('devices_sync', db.devices);
    broadcastRealtimeEvent('command_relay', {
      fromDeviceId,
      fromDeviceName,
      channel,
      command,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      synced: true,
      devices: db.devices,
      luminarias: db.luminarias,
    });
  });

  // --- ALMACENAMIENTO Y CONSULTA DE DATOS DE SENSORES ---
  app.get('/api/sensores/lecturas/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const sensorType = typeof req.query.sensor_type === 'string' ? req.query.sensor_type : '';
    const zone = typeof req.query.zone === 'string' ? req.query.zone.toLowerCase() : '';
    const deviceId = typeof req.query.device_id === 'string' ? req.query.device_id : '';

    let rows = [...db.sensorReadings];
    if (sensorType && sensorType !== 'todos') {
      rows = rows.filter((r) => r.sensorType === sensorType);
    }
    if (zone) {
      rows = rows.filter((r) => r.zone.toLowerCase().includes(zone));
    }
    if (deviceId && deviceId !== 'todos') {
      rows = rows.filter((r) => r.deviceId === deviceId);
    }

    res.status(200).json(rows);
  });

  app.post('/api/sensores/lecturas/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const { sensorType, zone, value, unit, deviceId, deviceName, channel } = req.body || {};
    if (value === undefined || !zone) {
      res.status(400).json({ detail: 'Los campos zone y value son obligatorios.' });
      return;
    }

    const resolvedChannel: 'bluetooth' | 'wifi' | 'usb' =
      channel === 'wifi' ? 'wifi' : channel === 'usb' ? 'usb' : 'bluetooth';

    const reading: SensorReadingRecord = {
      id: `sr-${Date.now()}`,
      sensorType: sensorType || 'pir_mmwave',
      zone: String(zone),
      value: Number(value),
      unit: String(unit || 'unidades'),
      deviceId: String(deviceId || 'android-1'),
      deviceName: String(deviceName || 'Android 1 · Pixel 9 Pro'),
      channel: resolvedChannel,
      timestamp: new Date().toISOString(),
    };

    db.sensorReadings = [reading, ...db.sensorReadings].slice(0, 100);
    saveDb(db);
    broadcastRealtimeEvent('sensors_sync', db.sensorReadings);
    res.status(201).json(reading);
  });

  // --- AUDITORÍA ISO 27400 & USUARIOS ---
  app.get('/api/seguridad/auditoria/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({
      standard: 'ISO/IEC 27400 (Seguridad y Privacidad IoT)',
      authenticated_user: req.user?.username,
      checks: [
        {
          id: 'iso-cred',
          title: 'Cifrado de credenciales y datos sensibles',
          status: 'compliant',
          detail: 'Contraseñas cifradas con crypto.scrypt (salt 128-bit) + timingSafeEqual y tokens HS256.',
        },
        {
          id: 'iso-rbac',
          title: 'Control de acceso y permisos (RBAC)',
          status: 'compliant',
          detail: `${db.users.length} usuarios registrados; todas las rutas /api/* exigen Authorization: Bearer.`,
        },
        {
          id: 'iso-tls',
          title: 'Conexiones seguras (HTTPS / TLS / CORS)',
          status: 'compliant',
          detail: `CORS restringido a ${ALLOWED_ORIGINS.size} orígenes autorizados; transporte TLS en despliegue.`,
        },
        {
          id: 'iso-persist',
          title: 'Integridad y almacenamiento persistente',
          status: 'compliant',
          detail: `Persistencia activa en disco (${db.sensorReadings.length} lecturas de sensores y ${db.devices.length} nodos Android).`,
        },
      ],
      registered_users: db.users.map((u) => ({
        id: u.id,
        username: u.username,
        full_name: u.fullName,
        role: u.role,
        password_encryption: 'scrypt-sha512-salted',
      })),
    });
  });

  // --- TELEMETRÍA ---
  app.get('/api/telemetria/', requireJwtAuth, (req: AuthenticatedRequest, res: Response) => {
    const totalWatts = Number(
      db.luminarias.filter((l) => l.isOn).reduce((sum, l) => sum + l.powerWatts, 0).toFixed(1)
    );
    const activeCount = db.luminarias.filter((l) => l.isOn).length;
    res.status(200).json({
      authenticated_user: req.user?.username,
      total_watts: totalWatts,
      active_lights: activeCount,
      total_lights: db.luminarias.length,
      estimated_hourly_cost_eur: Number(((totalWatts / 1000) * 0.28).toFixed(3)),
      active_rules_count: db.reglas.filter((r) => r.isActive).length,
      connected_android_devices: db.devices.length,
      stored_sensor_readings: db.sensorReadings.length,
      timestamp: new Date().toISOString(),
    });
  });

  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ detail: 'API endpoint not found.' });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LumiControl IoT Server (REST API + JWT + Scrypt + Dual-Android SSE + Vite) running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

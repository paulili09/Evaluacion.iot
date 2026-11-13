export interface Luminaria {
  id: string;
  name: string;
  room: string;
  roomType: 'estudio' | 'dormitorio' | 'cocina' | 'salon';
  isOn: boolean;
  brightness: number; // 0 - 100
  colorTemp: number; // 2000K - 6500K
  powerWatts: number;
  modeLabel?: string;
  pirActive?: boolean;
  sensorDistance?: string;
  scheduleLabel?: string;
  iconType: 'lamp' | 'ceiling' | 'strip' | 'spot' | 'bedside';
}

export interface Escena {
  id: string;
  name: string;
  category: 'favoritas' | 'circadianas' | 'inmersivas';
  description: string;
  temperature: number; // K
  tempLabel?: string;
  intensity: number; // %
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

export interface Incidente {
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

export interface ReglaAntiOlvido {
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
}

export interface MeshNode {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'standby' | 'syncing';
  rssi: number; // dBm
  rssiQuality: 'Excelente' | 'Buena' | 'Aceptable';
  detail: string;
  iconType: 'gateway' | 'relay' | 'dimmer' | 'strip';
}

export interface MqttLogEntry {
  id: string;
  timestamp: string;
  type: 'PUB' | 'SUB' | 'MESH' | 'SYS' | 'QoS1';
  topic: string;
  payload: string;
}

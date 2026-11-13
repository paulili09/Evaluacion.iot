/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { LucesView } from './components/views/LucesView';
import { AutomatizacionView } from './components/views/AutomatizacionView';
import { EscenasView } from './components/views/EscenasView';
import { NuevaReglaModal } from './components/views/NuevaReglaModal';
import { ConsumoView } from './components/views/ConsumoView';
import { AjustesView } from './components/views/AjustesView';
import { MeshTopologyModal } from './components/views/MeshTopologyModal';
import { MqttSandboxModal } from './components/views/MqttSandboxModal';
import { LightDetailModal } from './components/LightDetailModal';
import { CreateLuminariaModal } from './components/CreateLuminariaModal';
import { KotlinCodeViewerModal } from './components/KotlinCodeViewerModal';
import { BluetoothConnectModal } from './components/BluetoothConnectModal';
import { UsbSyncModal } from './components/UsbSyncModal';
import { JwtAuthScreen } from './components/JwtAuthScreen';
import { SmartHome3DView } from './components/SmartHome3DView';
import { ApiBackendExplorerView } from './components/views/ApiBackendExplorerView';
import { DispositivosSensoresView } from './components/views/DispositivosSensoresView';
import { webBluetooth } from './services/webBluetoothService';
import { usbCable } from './services/usbCableService';
import { playRelayClick } from './services/soundEffects';
import {
  AuthUser,
  AndroidDeviceNode,
  getStoredAccessToken,
  getStoredUser,
  clearSession,
  setAuthExpiredHandler,
  fetchLuminarias,
  createLuminaria,
  updateLuminaria,
  deleteLuminaria,
  toggleLuminaria,
  apagarTodasLuminarias,
  fetchEscenas,
  createEscena,
  deleteEscena,
  activarEscena,
  fetchReglas,
  createRegla,
  updateRegla,
  deleteRegla,
  fetchIncidentes,
  deleteIncidente,
  fetchDispositivos,
  subscribeRealtimeStream,
  upsertDispositivo,
  syncDispositivosCommand,
  claimPairingSession,
} from './services/apiClient';
import { Luminaria, Escena, Incidente, ReglaAntiOlvido } from './types';
import {
  Lightbulb,
  Box,
  Smartphone,
  Clock,
  Zap,
  Server,
  Settings,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const token = getStoredAccessToken();
    return token ? getStoredUser() : null;
  });

  const [activeTab, setActiveTab] = useState<TabType>('luces');
  const [subView, setSubView] = useState<null | 'nueva-regla' | 'escenas' | 'mesh-topology'>(null);

  const [lights, setLights] = useState<Luminaria[]>([]);
  const [devices, setDevices] = useState<AndroidDeviceNode[]>([]);
  const [escenas, setEscenas] = useState<Escena[]>([]);
  const [rules, setRules] = useState<ReglaAntiOlvido[]>([]);
  const [incidents, setIncidents] = useState<Incidente[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  const isMobileUa =
    typeof navigator !== 'undefined' && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

  const [activeDeviceId, setActiveDeviceId] = useState<string>(() => {
    const saved = localStorage.getItem('lumi_active_device_id');
    if (saved) return saved;
    return isMobileUa ? 'android-2' : 'pc-central';
  });
  const [activeDeviceName, setActiveDeviceName] = useState<string>(() => {
    const saved = localStorage.getItem('lumi_active_device_name');
    if (saved) return saved;
    return isMobileUa ? 'Android Móvil · Mi Celular' : 'PC · Control Central';
  });

  const [activeSceneName, setActiveSceneName] = useState<string>('Relax Atardecer');
  const [hasActiveAlert, setHasActiveAlert] = useState<boolean>(true);
  const [alertsCleared, setAlertsCleared] = useState<boolean>(false);
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);
  const [showCreateLight, setShowCreateLight] = useState<boolean>(false);
  const [isCreatingLight, setIsCreatingLight] = useState<boolean>(false);
  const [showSandbox, setShowSandbox] = useState<boolean>(false);
  const [showKotlinViewer, setShowKotlinViewer] = useState<boolean>(false);
  const [showBluetoothModal, setShowBluetoothModal] = useState<boolean>(false);
  const [showUsbModal, setShowUsbModal] = useState<boolean>(false);
  const [connectionMode, setConnectionMode] = useState<'bluetooth' | 'mqtt' | 'usb'>('bluetooth');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncRevision, setSyncRevision] = useState<number>(0);

  const [isBluetoothConnected, setIsBluetoothConnected] = useState<boolean>(webBluetooth.state.isConnected);
  const [isBluetoothAvailable, setIsBluetoothAvailable] = useState<boolean>(webBluetooth.state.isBluetoothAvailable);
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState<string | null>(webBluetooth.state.deviceName);
  const [bluetoothStatusMessage, setBluetoothStatusMessage] = useState<string>(webBluetooth.state.statusMessage);
  const [isUsbConnected, setIsUsbConnected] = useState<boolean>(usbCable.state.isConnected);
  const [usbDeviceName, setUsbDeviceName] = useState<string | null>(usbCable.state.deviceName);

  const brightnessTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastSyncedBtDeviceRef = useRef<string | null>(null);
  const selectedLight = lights.find((l) => l.id === selectedLightId) || null;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  const loadAllApiData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [lumData, escData, regData, incData, devData] = await Promise.all([
        fetchLuminarias(),
        fetchEscenas(),
        fetchReglas(),
        fetchIncidentes(),
        fetchDispositivos(),
      ]);
      setLights(lumData);
      setEscenas(escData);
      setRules(regData);
      setIncidents(incData);
      setDevices(devData);
      const activeSc = escData.find((s) => s.active);
      if (activeSc) setActiveSceneName(activeSc.name);
    } catch {
      showToast('No se pudieron cargar los datos de la API REST.');
    } finally {
      setIsLoadingData(false);
    }
  }, [showToast]);

  useEffect(() => {
    setAuthExpiredHandler(() => {
      setAuthUser(null);
      showToast('Tu sesión JWT expiró. Inicia sesión nuevamente.');
    });
  }, [showToast]);

  // Auto-sincronización si el teléfono abre un enlace con ?pair=CODIGO
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pairCode = params.get('pair');
    const channelParam = params.get('ch');
    if (!pairCode) return;

    const targetChannel: 'bluetooth' | 'wifi' | 'usb' =
      channelParam === 'usb' ? 'usb' : channelParam === 'wifi' ? 'wifi' : 'bluetooth';

    const deviceId = isMobileUa ? 'android-usb-phone' : `android-link-${Date.now().toString().slice(-4)}`;
    const deviceName = isMobileUa ? 'Mi Teléfono Android (USB)' : 'Dispositivo Enlazado';

    claimPairingSession({
      code: pairCode,
      deviceId,
      deviceName,
      channel: targetChannel,
    })
      .then((res) => {
        setAuthUser(res.user);
        setActiveDeviceId(res.device.id);
        setActiveDeviceName(res.device.name);
        localStorage.setItem('lumi_active_device_id', res.device.id);
        localStorage.setItem('lumi_active_device_name', res.device.name);
        setConnectionMode(res.channel === 'wifi' ? 'mqtt' : res.channel);
        if (res.channel === 'usb') {
          usbCable.connectUsbTetherMode(res.device.name);
          setIsUsbConnected(true);
          setUsbDeviceName(res.device.name);
        }
        window.history.replaceState({}, '', window.location.pathname);
        showToast(`¡Sincronizado en tiempo real como ${res.device.name}!`);
      })
      .catch(() => {
        showToast('El enlace/código de sincronización expiró. Genera uno nuevo en Cable USB.');
      });
  }, [isMobileUa, showToast]);

  useEffect(() => {
    if (!authUser) return;
    loadAllApiData();

    // Suscripción en tiempo real SSE para sincronizar múltiples teléfonos Android conectados
    const unsubscribe = subscribeRealtimeStream({
      onLuminariasSync: (syncedLights) => {
        setLights(syncedLights);
      },
      onDevicesSync: (syncedDevices) => {
        setDevices(syncedDevices);
        setSyncRevision((n) => n + 1);
      },
      onSensorsSync: () => {
        setSyncRevision((n) => n + 1);
      },
      onCommandRelay: (cmd) => {
        if (cmd.fromDeviceName && cmd.fromDeviceName !== activeDeviceName) {
          showToast(`Sync desde ${cmd.fromDeviceName} (${cmd.channel.toUpperCase()}): ${cmd.command}`);
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [authUser, loadAllApiData, activeDeviceName, showToast]);

  useEffect(() => {
    if (!authUser) return;
    upsertDispositivo({
      id: activeDeviceId,
      name: activeDeviceName,
      model: isMobileUa ? 'Android Mobile Browser' : 'Control Central Web',
      channel: connectionMode === 'mqtt' ? 'wifi' : connectionMode,
      rssiDbm: connectionMode === 'usb' ? 0 : -40,
      batteryPct: isMobileUa ? 90 : 100,
    })
      .then(() => fetchDispositivos().then(setDevices))
      .catch(() => {});
  }, [authUser, activeDeviceId, activeDeviceName, isMobileUa, connectionMode]);

  useEffect(() => {
    const unsubBtMsg = webBluetooth.subscribeMessages((msg) => {
      showToast(`ESP32 -> Celular por Bluetooth: "${msg}"`);
      if (msg.includes('ENCENDIDO')) {
        setLights((prev) =>
          prev.map((l) =>
            l.name === 'Lámpara Estudio'
              ? { ...l, isOn: true, powerWatts: 22.4, brightness: l.brightness || 85 }
              : l
          )
        );
      } else if (msg.includes('APAGADO')) {
        setLights((prev) =>
          prev.map((l) =>
            l.name === 'Lámpara Estudio' ? { ...l, isOn: false, powerWatts: 0 } : l
          )
        );
      }
    });

    const unsubBtState = webBluetooth.subscribeStatus((state) => {
      setIsBluetoothConnected(state.isConnected);
      setIsBluetoothAvailable(state.isBluetoothAvailable);
      setBluetoothDeviceName(state.deviceName);
      setBluetoothStatusMessage(state.statusMessage);
    });

    const unsubUsbMsg = usbCable.subscribeMessages((msg) => {
      if (msg.includes('ENCENDIDO') || msg.includes('APAGADO')) {
        showToast(`Cable USB RX: "${msg}"`);
      }
      if (msg.includes('ENCENDIDO')) {
        setLights((prev) =>
          prev.map((l) =>
            l.name === 'Lámpara Estudio'
              ? { ...l, isOn: true, powerWatts: 22.4, brightness: l.brightness || 85 }
              : l
          )
        );
      } else if (msg.includes('APAGADO')) {
        setLights((prev) =>
          prev.map((l) =>
            l.name === 'Lámpara Estudio' ? { ...l, isOn: false, powerWatts: 0 } : l
          )
        );
      }
    });

    const unsubUsbState = usbCable.subscribeState((state) => {
      setIsUsbConnected(state.isConnected);
      setUsbDeviceName(state.deviceName);
    });

    return () => {
      unsubBtMsg();
      unsubBtState();
      unsubUsbMsg();
      unsubUsbState();
    };
  }, [showToast]);

  const handleLogout = () => {
    clearSession();
    setAuthUser(null);
    setLights([]);
    setRules([]);
    setShowProfileModal(false);
  };

  const handleChangeActiveDevice = (id: string, name: string) => {
    setActiveDeviceId(id);
    setActiveDeviceName(name);
    localStorage.setItem('lumi_active_device_id', id);
    localStorage.setItem('lumi_active_device_name', name);
  };

  useEffect(() => {
    if (!authUser || !isBluetoothConnected || !bluetoothDeviceName) {
      if (!isBluetoothConnected) {
        lastSyncedBtDeviceRef.current = null;
      }
      return;
    }
    const btKey = `${authUser.username}:${bluetoothDeviceName}`;
    if (lastSyncedBtDeviceRef.current === btKey) return;
    lastSyncedBtDeviceRef.current = btKey;

    const cleanSlug =
      bluetoothDeviceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 24) || 'equipo';

    upsertDispositivo({
      id: `bt-${cleanSlug}`,
      name: bluetoothDeviceName,
      model: webBluetooth.state.isRealHardware ? 'Bluetooth BLE GATT' : 'Celular / Equipo Bluetooth',
      channel: 'bluetooth',
      rssiDbm: -42,
      batteryPct: 95,
      usbDetails: 'Enlace Bluetooth activo',
    })
      .then(() => fetchDispositivos().then(setDevices))
      .catch(() => {});
  }, [authUser, isBluetoothConnected, bluetoothDeviceName]);

  const handleConnectBluetoothDirect = async () => {
    const res = await webBluetooth.requestAndConnect(false);
    if (res.ok) {
      playRelayClick(true);
      setConnectionMode('bluetooth');
      showToast(`Bluetooth conectado con ${webBluetooth.state.deviceName || 'Dispositivo cercano'}`);
    } else {
      setShowBluetoothModal(true);
      if (res.reason) {
        showToast(res.reason);
      }
    }
  };

  const handleDisconnectBluetooth = () => {
    webBluetooth.disconnect();
    showToast('Bluetooth desconectado');
  };

  const handleSendDirectBtCommand = async (cmd: 'ENCENDER' | 'APAGAR') => {
    const isTurnOn = cmd === 'ENCENDER';
    const studyLight = lights.find((l) => l.name.includes('Estudio'));
    playRelayClick(isTurnOn);

    if (studyLight) {
      try {
        const updated = await updateLuminaria(studyLight.id, {
          isOn: isTurnOn,
          brightness: isTurnOn ? studyLight.brightness || 85 : 0,
        });
        setLights((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } catch {
        showToast('Error al sincronizar estado con la API.');
      }
    }
    if (!isTurnOn) setHasActiveAlert(false);

    if (isBluetoothConnected) {
      await webBluetooth.sendCommand(cmd);
      showToast(`[BT TX] Celular -> ESP32: "${cmd}"`);
    } else {
      showToast(`Comando Bluetooth "${cmd}" enviado y persistido en API`);
    }
  };

  const handleUsbConnected = async (info: {
    deviceName: string;
    transport: string;
    usbDetails: string;
  }) => {
    playRelayClick(true);
    setIsUsbConnected(true);
    setUsbDeviceName(info.deviceName);
    setConnectionMode('usb');
    const usbTargetId = isMobileUa ? activeDeviceId : 'android-usb-phone';
    try {
      await upsertDispositivo({
        id: usbTargetId,
        name: info.deviceName,
        model: info.transport,
        channel: 'usb',
        rssiDbm: 0,
        batteryPct: 100,
        usbDetails: info.usbDetails,
      });
      const updatedDevices = await fetchDispositivos();
      setDevices(updatedDevices);
    } catch {
      // Keep local USB link active even if network sync retries later
    }
    showToast(`Teléfono sincronizado por cable USB: ${info.deviceName}`);
  };

  const handleSendUsbCommand = async (cmd: 'ENCENDER' | 'APAGAR') => {
    const isTurnOn = cmd === 'ENCENDER';
    const studyLight = lights.find((l) => l.name.includes('Estudio')) || lights[0];
    playRelayClick(isTurnOn);

    await usbCable.sendUsbCommand(cmd);

    try {
      const res = await syncDispositivosCommand({
        fromDeviceId: activeDeviceId,
        fromDeviceName: usbDeviceName || activeDeviceName,
        channel: 'usb',
        command: cmd,
        targetLightId: studyLight?.id,
      });
      if (res.luminarias?.length) {
        setLights(res.luminarias);
      }
    } catch {
      showToast('Comando enviado por USB (sin sincronización remota API).');
    }

    if (!isTurnOn) setHasActiveAlert(false);
    showToast(`[USB TX] Cable -> "${cmd}" sincronizado en tiempo real`);
  };

  const handleUsbDisconnected = () => {
    usbCable.disconnect();
    setIsUsbConnected(false);
    setUsbDeviceName(null);
    setConnectionMode('bluetooth');
    showToast('Cable USB desconectado');
  };

  const handleToggleLight = async (id: string) => {
    const targetLight = lights.find((l) => l.id === id);
    const nextState = !targetLight?.isOn;
    playRelayClick(nextState);

    if (connectionMode === 'bluetooth' && webBluetooth.state.isRealHardware) {
      webBluetooth.sendCommand(nextState ? 'ENCENDER' : 'APAGAR');
    } else if (connectionMode === 'usb' && isUsbConnected) {
      usbCable.sendUsbCommand(nextState ? 'ENCENDER' : 'APAGAR');
    }

    try {
      const updated = await toggleLuminaria(id);
      setLights((prev) => prev.map((l) => (l.id === id ? updated : l)));
      showToast(`${updated.name}: ${updated.isOn ? 'ENCENDIDA' : 'APAGADA'} (JWT API)`);
    } catch {
      showToast('Error al actualizar luminaria en la API');
    }
  };

  const handleBrightnessChange = (id: string, brightness: number) => {
    setLights((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              brightness,
              isOn: brightness > 0,
              powerWatts: brightness > 0 ? Number(((brightness / 100) * 25).toFixed(1)) : 0,
            }
          : l
      )
    );

    if (brightnessTimersRef.current[id]) {
      clearTimeout(brightnessTimersRef.current[id]);
    }
    brightnessTimersRef.current[id] = setTimeout(async () => {
      try {
        const updated = await updateLuminaria(id, { brightness, isOn: brightness > 0 });
        setLights((prev) => prev.map((l) => (l.id === id ? updated : l)));
      } catch {
        // ignore transient errors while dragging
      }
    }, 140);
  };

  const handleCreateLight = async (payload: {
    name: string;
    room: string;
    roomType: Luminaria['roomType'];
    brightness: number;
    colorTemp: number;
    iconType: Luminaria['iconType'];
    isOn: boolean;
  }) => {
    setIsCreatingLight(true);
    try {
      const created = await createLuminaria(payload);
      setLights((prev) => [...prev, created]);
      showToast(`Luminaria "${created.name}" creada (POST 201)`);
    } finally {
      setIsCreatingLight(false);
    }
  };

  const handleUpdateLight = async (updatedInput: Luminaria) => {
    try {
      const saved = await updateLuminaria(updatedInput.id, {
        name: updatedInput.name,
        room: updatedInput.room,
        isOn: updatedInput.isOn,
        brightness: updatedInput.brightness,
        colorTemp: updatedInput.colorTemp,
        pirActive: updatedInput.pirActive,
      });
      setLights((prev) => prev.map((l) => (l.id === saved.id ? saved : l)));
      showToast(`Luminaria "${saved.name}" actualizada (PATCH 200)`);
    } catch {
      showToast('Error al guardar cambios en la API');
    }
  };

  const handleDeleteLight = async (id: string) => {
    try {
      await deleteLuminaria(id);
      setLights((prev) => prev.filter((l) => l.id !== id));
      showToast('Luminaria eliminada correctamente (DELETE 204)');
    } catch {
      showToast('Error al eliminar la luminaria');
    }
  };

  const handleTurnOffAll = async () => {
    try {
      const updatedList = await apagarTodasLuminarias();
      setLights(updatedList);
      setHasActiveAlert(false);
      showToast('Todas las luminarias apagadas vía API + MQTT');
    } catch {
      showToast('Error al ejecutar apagado general');
    }
  };

  const handleTurnOffForgottenLight = async () => {
    const forgotten = lights.find((l) => l.name.includes('Estudio'));
    if (forgotten) {
      try {
        const updated = await updateLuminaria(forgotten.id, { isOn: false, brightness: 0 });
        setLights((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } catch {
        // ignore
      }
    }
    setHasActiveAlert(false);
    showToast('Lámpara de Estudio apagada. Consumo fantasma detenido.');
  };

  const handleActivateScene = async (sceneId: string) => {
    try {
      const res = await activarEscena(sceneId);
      setEscenas(res.escenas);
      setLights(res.luminarias);
      setActiveSceneName(res.active_scene);
      showToast(`Escena "${res.active_scene}" aplicada vía API`);
    } catch {
      showToast('Error al activar escena');
    }
  };

  const handleCreateScene = async (payload: {
    name: string;
    category?: 'favoritas' | 'circadianas' | 'inmersivas';
    temperature: number;
    intensity: number;
    targetZones: ('estudio' | 'dormitorio' | 'cocina' | 'salon')[];
    transitionType: 'smooth' | 'instant';
    activateNow?: boolean;
  }) => {
    try {
      const res = await createEscena(payload);
      setEscenas(res.escenas);
      setLights(res.luminarias);
      setActiveSceneName(res.scene.name);
      showToast(`Escena "${res.scene.name}" creada y aplicada (POST 201)`);
    } catch {
      showToast('Error al crear escena personalizada');
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    try {
      await deleteEscena(sceneId);
      setEscenas((prev) => prev.filter((s) => s.id !== sceneId));
      showToast('Escena personalizada eliminada (DELETE 204)');
    } catch {
      showToast('Error al eliminar la escena');
    }
  };

  const handleApplyQuickScene = (sceneName: string) => {
    const found = escenas.find((s) => s.name === sceneName);
    if (found) handleActivateScene(found.id);
  };

  const handleUndoIncident = async (incidentId: string) => {
    try {
      await deleteIncidente(incidentId);
      setIncidents((prev) => prev.filter((i) => i.id !== incidentId));
      showToast('Incidente deshecho y eliminado de registro.');
    } catch {
      showToast('No se pudo eliminar el incidente.');
    }
  };

  const handleSaveRule = async (rule: Partial<ReglaAntiOlvido>) => {
    try {
      const created = await createRegla(rule);
      setRules((prev) => [created, ...prev]);
      showToast('Regla Anti-Olvido creada en la API (POST 201)');
      setSubView(null);
      setActiveTab('automatizacion');
    } catch {
      showToast('Error al guardar la regla en la API');
    }
  };

  const handleToggleRule = async (rule: ReglaAntiOlvido) => {
    try {
      const updated = await updateRegla(rule.id, { isActive: !rule.isActive });
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast(`Regla "${updated.deviceLabel}" ${updated.isActive ? 'activada' : 'pausada'}`);
    } catch {
      showToast('Error al actualizar regla');
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteRegla(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      showToast('Regla eliminada (DELETE 204)');
    } catch {
      showToast('Error al eliminar regla');
    }
  };

  if (!authUser) {
    return (
      <JwtAuthScreen
        onAuthenticated={(user, pairedInfo) => {
          setAuthUser(user);
          if (pairedInfo) {
            handleChangeActiveDevice(pairedInfo.deviceId, pairedInfo.deviceName);
            setConnectionMode(pairedInfo.channel === 'wifi' ? 'mqtt' : pairedInfo.channel);
            if (pairedInfo.channel === 'usb') {
              usbCable.connectUsbTetherMode(pairedInfo.deviceName);
              setIsUsbConnected(true);
              setUsbDeviceName(pairedInfo.deviceName);
            }
            showToast(`¡Vinculado en vivo como ${pairedInfo.deviceName}!`);
          }
        }}
      />
    );
  }

  const sidebarItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'luces', label: 'Luminarias', icon: Lightbulb },
    { id: 'vista3d', label: 'Vista 3D Hogar', icon: Box },
    { id: 'dispositivos', label: 'Red Dual-Android & Sensores', icon: Smartphone },
    { id: 'automatizacion', label: 'Automatización', icon: Clock },
    { id: 'consumo', label: 'Consumo', icon: Zap },
    { id: 'api', label: 'API & Django', icon: Server },
    { id: 'ajustes', label: 'Ajustes', icon: Settings },
  ];

  const unreadCount = alertsCleared ? 0 : (hasActiveAlert ? 1 : 0) + incidents.length;

  const handleMarkAllRead = () => {
    setAlertsCleared(true);
    setHasActiveAlert(false);
    showToast('Todas las alertas marcadas como leídas.');
  };

  const renderContent = () => {
    if (subView === 'nueva-regla') {
      return (
        <NuevaReglaModal
          lights={lights}
          onClose={() => setSubView(null)}
          onSaveRule={handleSaveRule}
          onOpenSandbox={() => setShowSandbox(true)}
        />
      );
    }

    if (subView === 'escenas') {
      return (
        <EscenasView
          escenas={escenas}
          lights={lights}
          activeSceneId={escenas.find((s) => s.name === activeSceneName)?.id || 'sc-1'}
          onActivateScene={handleActivateScene}
          onCreateScene={handleCreateScene}
          onDeleteScene={handleDeleteScene}
          onBack={() => setSubView(null)}
        />
      );
    }

    if (subView === 'mesh-topology') {
      return <MeshTopologyModal onClose={() => setSubView(null)} devicesCount={devices.length} />;
    }

    switch (activeTab) {
      case 'luces':
        return (
          <LucesView
            lights={lights}
            isLoading={isLoadingData}
            onToggleLight={handleToggleLight}
            onBrightnessChange={handleBrightnessChange}
            onSelectLight={(light) => setSelectedLightId(light.id)}
            onOpenCreateLight={() => setShowCreateLight(true)}
            onTurnOffAll={handleTurnOffAll}
            onOpenScenes={() => setSubView('escenas')}
            onOpenMeshTopology={() => setSubView('mesh-topology')}
            onOpen3DView={() => setActiveTab('vista3d')}
            activeScene={activeSceneName}
            onApplyScene={handleApplyQuickScene}
            hasActiveAlert={hasActiveAlert}
            onDismissAlert={() => setHasActiveAlert(false)}
            onTurnOffForgottenLight={handleTurnOffForgottenLight}
            isBluetoothConnected={isBluetoothConnected}
            isBluetoothAvailable={isBluetoothAvailable}
            bluetoothDeviceName={bluetoothDeviceName}
            bluetoothStatusMessage={bluetoothStatusMessage}
            onConnectBluetooth={handleConnectBluetoothDirect}
            onDisconnectBluetooth={handleDisconnectBluetooth}
            onOpenBluetoothModal={() => setShowBluetoothModal(true)}
            onSendDirectBtCommand={handleSendDirectBtCommand}
            isUsbConnected={isUsbConnected}
            usbDeviceName={usbDeviceName}
            onOpenUsbModal={() => setShowUsbModal(true)}
            devices={devices}
            activeDeviceId={activeDeviceId}
            authUser={authUser}
            onSwitchAccount={handleLogout}
            onOpenDevicesTab={() => setActiveTab('dispositivos')}
          />
        );
      case 'vista3d':
        return (
          <div className="space-y-4 pb-20 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Gemelo Digital 3D (Three.js)
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Haz clic en cualquier luminaria 3D para conmutarla vía API JWT y reflejar su temperatura Kelvin en tiempo real.
                </p>
              </div>
            </div>
            <SmartHome3DView
              lights={lights}
              onToggleLight={handleToggleLight}
              onSelectLight={(light) => setSelectedLightId(light.id)}
            />
          </div>
        );
      case 'dispositivos':
        return (
          <DispositivosSensoresView
            lights={lights}
            activeDeviceId={activeDeviceId}
            activeDeviceName={activeDeviceName}
            connectionMode={connectionMode}
            onChangeActiveDevice={handleChangeActiveDevice}
            onChangeConnectionMode={(mode) => {
              setConnectionMode(mode);
              showToast(
                `Canal activo: ${
                  mode === 'bluetooth' ? 'Bluetooth' : mode === 'usb' ? 'Cable USB' : 'Wi-Fi / MQTT'
                }`
              );
            }}
            onOpenUsbModal={() => setShowUsbModal(true)}
            onNotify={showToast}
            onSyncLightsFromApi={(synced) => setLights(synced)}
            syncRevision={syncRevision}
          />
        );
      case 'automatizacion':
        return (
          <AutomatizacionView
            rules={rules}
            isLoading={isLoadingData}
            onToggleRule={handleToggleRule}
            onDeleteRule={handleDeleteRule}
            onOpenNewRule={() => setSubView('nueva-regla')}
            onOpenScenes={() => setSubView('escenas')}
            onTurnOffForgottenLight={handleTurnOffForgottenLight}
            hasActiveAlert={hasActiveAlert}
            onDismissAlert={() => setHasActiveAlert(false)}
            incidents={incidents}
            onUndoIncident={handleUndoIncident}
            unreadCount={unreadCount}
            onMarkAllRead={handleMarkAllRead}
          />
        );
      case 'consumo':
        return <ConsumoView lights={lights} rules={rules} />;
      case 'api':
        return (
          <ApiBackendExplorerView
            user={authUser}
            onLogout={handleLogout}
            onNotify={showToast}
          />
        );
      case 'ajustes':
        return (
          <AjustesView
            authUser={authUser}
            devicesCount={devices.length}
            onOpenMeshTopology={() => setSubView('mesh-topology')}
            onOpenKotlinViewer={() => setShowKotlinViewer(true)}
            onOpenDevicesTab={() => setActiveTab('dispositivos')}
            onOpenApiTab={() => setActiveTab('api')}
            onNotify={showToast}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#080D1A] text-slate-100 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      <Header
        title={
          subView === 'nueva-regla'
            ? 'Nueva Regla Anti-Olvido'
            : subView === 'escenas'
            ? 'Escenas Lumínicas'
            : subView === 'mesh-topology'
            ? 'Topología Mesh ESP32'
            : 'LumiControl IoT'
        }
        showBack={subView !== null}
        onBack={() => setSubView(null)}
        connectionMode={connectionMode}
        isBluetoothConnected={isBluetoothConnected}
        isUsbConnected={isUsbConnected}
        userFullName={authUser.full_name}
        userUsername={authUser.username}
        onOpenBluetooth={isBluetoothConnected ? () => setShowBluetoothModal(true) : handleConnectBluetoothDirect}
        onOpenUsb={() => setShowUsbModal(true)}
        onOpenKotlinViewer={() => setShowKotlinViewer(true)}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      <div className="flex-1 w-full max-w-[1440px] mx-auto flex">
        {!subView && (
          <aside className="hidden lg:flex w-64 shrink-0 flex-col justify-between border-r border-slate-800/80 p-4 bg-[#090F1E]">
            <nav className="space-y-1" aria-label="Navegación principal">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setSubView(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="px-3 py-2.5 rounded-xl bg-[#0D1528] border border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>JWT + ISO 27400</span>
                </div>
                <div className="text-slate-300 mt-1 truncate">{authUser.full_name}</div>
                <div className="text-slate-500 font-mono text-[11px] truncate">{activeDeviceName}</div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </aside>
        )}

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
          {renderContent()}
        </main>
      </div>

      {!subView && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSubView(null);
          }}
          unreadCount={unreadCount}
        />
      )}

      <CreateLuminariaModal
        isOpen={showCreateLight}
        isSubmitting={isCreatingLight}
        onClose={() => setShowCreateLight(false)}
        onCreate={handleCreateLight}
      />

      {selectedLight && (
        <LightDetailModal
          light={selectedLight}
          onClose={() => setSelectedLightId(null)}
          onUpdate={handleUpdateLight}
          onDelete={handleDeleteLight}
        />
      )}

      {showSandbox && (
        <MqttSandboxModal
          onClose={() => setShowSandbox(false)}
          onTriggerAbsenceAlert={() => {
            setHasActiveAlert(true);
            setAlertsCleared(false);
            showToast('Alerta de ausencia activada en Lámpara Estudio');
          }}
          onTurnOffAll={handleTurnOffAll}
          onToggleMainLight={(turnOn) => handleSendDirectBtCommand(turnOn ? 'ENCENDER' : 'APAGAR')}
          onResetMotionTimer={() => {
            setHasActiveAlert(false);
            showToast('Movimiento PIR detectado: temporizador de ausencia reiniciado.');
          }}
        />
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm text-left">
          <div className="w-full max-w-sm bg-[#0E1526] border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-amber-500 bg-gradient-to-br from-amber-600 to-indigo-800 flex items-center justify-center text-sm font-extrabold text-white shrink-0">
                  {authUser.username.toLowerCase() === 'sofia' ? (
                    <img
                      src="/src/assets/images/avatar_sofia_mendoza_1794437958356.jpg"
                      alt={authUser.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{authUser.full_name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{authUser.full_name}</h3>
                  <span className="text-xs text-amber-400 font-semibold">
                    @{authUser.username} · {authUser.role}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-[#121B30] border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Email</span>
                <span className="text-white font-mono">{authUser.email}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#121B30] border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block text-[10px]">Dispositivo Activo</span>
                  <span className="text-white font-semibold">{activeDeviceName}</span>
                </div>
                <span className="text-emerald-400 font-bold">Sincronizado</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(false);
                  setActiveTab('dispositivos');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
              >
                Red Android
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-bold cursor-pointer"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {showKotlinViewer && <KotlinCodeViewerModal onClose={() => setShowKotlinViewer(false)} />}

      {showBluetoothModal && (
        <BluetoothConnectModal
          onClose={() => setShowBluetoothModal(false)}
          connectionMode={connectionMode === 'mqtt' ? 'mqtt' : 'bluetooth'}
          onSetConnectionMode={(mode) => {
            setConnectionMode(mode);
            showToast(
              `Modo cambiado a: ${
                mode === 'bluetooth' ? 'Bluetooth Directo (ESP32)' : 'MQTT (Wi-Fi Broker)'
              }`
            );
          }}
          onSendBtCommand={(cmd) => {
            handleSendDirectBtCommand(cmd);
          }}
        />
      )}

      {showUsbModal && (
        <UsbSyncModal
          onClose={() => setShowUsbModal(false)}
          onUsbConnected={handleUsbConnected}
          onSendUsbCommand={handleSendUsbCommand}
          onUsbDisconnected={handleUsbDisconnected}
        />
      )}

      {toastMessage && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-amber-500/50 text-white text-xs font-semibold shadow-2xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

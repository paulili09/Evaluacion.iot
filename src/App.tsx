/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { KotlinCodeViewerModal } from './components/KotlinCodeViewerModal';
import { BluetoothConnectModal } from './components/BluetoothConnectModal';
import { webBluetooth } from './services/webBluetoothService';
import { playRelayClick } from './services/soundEffects';
import {
  INITIAL_LUMINARIAS,
  INITIAL_ESCENAS,
  INITIAL_INCIDENTES,
} from './data/mockData';
import { Luminaria, Escena, Incidente, ReglaAntiOlvido } from './types';
import { Smartphone, Monitor, Check, User, Shield, Info, X, Code2, Bluetooth, Wifi } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('luces');
  const [subView, setSubView] = useState<null | 'nueva-regla' | 'escenas' | 'mesh-topology'>(null);
  const [lights, setLights] = useState<Luminaria[]>(INITIAL_LUMINARIAS);
  const [escenas, setEscenas] = useState<Escena[]>(INITIAL_ESCENAS);
  const [incidents, setIncidents] = useState<Incidente[]>(INITIAL_INCIDENTES);
  const [activeSceneName, setActiveSceneName] = useState<string>('Relax Atardecer');
  const [hasActiveAlert, setHasActiveAlert] = useState<boolean>(true);
  const [selectedLight, setSelectedLight] = useState<Luminaria | null>(null);
  const [showSandbox, setShowSandbox] = useState<boolean>(false);
  const [showKotlinViewer, setShowKotlinViewer] = useState<boolean>(false);
  const [showBluetoothModal, setShowBluetoothModal] = useState<boolean>(false);
  const [connectionMode, setConnectionMode] = useState<'bluetooth' | 'mqtt'>('bluetooth');
  const [deviceFrameMode, setDeviceFrameMode] = useState<'mobile' | 'expanded'>('mobile');
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isBluetoothConnected, setIsBluetoothConnected] = useState<boolean>(webBluetooth.state.isConnected);
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState<string | null>(webBluetooth.state.deviceName);

  useEffect(() => {
    webBluetooth.setCallbacks(
      (msg) => {
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
              l.name === 'Lámpara Estudio'
                ? { ...l, isOn: false, powerWatts: 0 }
                : l
            )
          );
        }
      },
      (state) => {
        setIsBluetoothConnected(state.isConnected);
        setBluetoothDeviceName(state.deviceName);
      }
    );
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConnectBluetoothDirect = () => {
    // Conexión instantánea en 1 solo click
    playRelayClick(true);
    setIsBluetoothConnected(true);
    setBluetoothDeviceName('ESP32_LumiControl');
    setConnectionMode('bluetooth');
    webBluetooth.connectInstant();
    showToast('⚡ ¡Enlazado con tu ESP32 por Bluetooth en 1 solo click!');
  };

  const handleDisconnectBluetooth = () => {
    webBluetooth.disconnect();
    showToast('Bluetooth desconectado');
  };

  const handleSendDirectBtCommand = async (cmd: 'ENCENDER' | 'APAGAR') => {
    const isTurnOn = cmd === 'ENCENDER';
    setLights((prev) =>
      prev.map((l) =>
        l.name === 'Lámpara Estudio'
          ? {
              ...l,
              isOn: isTurnOn,
              powerWatts: isTurnOn ? 22.4 : 0,
              brightness: isTurnOn ? (l.brightness || 85) : 0,
            }
          : l
      )
    );
    if (!isTurnOn) setHasActiveAlert(false);

    playRelayClick(isTurnOn);

    if (isBluetoothConnected) {
      await webBluetooth.sendCommand(cmd);
      showToast(`[BT TX Real] Celular -> ESP32: "${cmd}"`);
    } else {
      showToast(`[BT TX] Celular -> ESP32: "${cmd}" | ESP32 RX: "${isTurnOn ? 'ENCENDIDO' : 'APAGADO'}"`);
    }
  };

  // Light handlers
  const handleToggleLight = (id: string) => {
    const targetLight = lights.find((l) => l.id === id);
    const nextState = !targetLight?.isOn;

    // Sonido háptico de click electromagnético de relé
    playRelayClick(nextState);

    // Si aún no está conectado por Bluetooth, un solo click en la luz inicia la conexión
    if (connectionMode === 'bluetooth' && !isBluetoothConnected && typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      showToast('1-Click: Abriendo Bluetooth para conectar con tu ESP32...');
      webBluetooth.requestAndConnect().then((ok) => {
        if (ok) {
          setIsBluetoothConnected(true);
          setBluetoothDeviceName(webBluetooth.state.deviceName);
          webBluetooth.sendCommand(nextState ? 'ENCENDER' : 'APAGAR');
        }
      });
    }

    setLights((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const cmd = nextState ? 'ENCENDER' : 'APAGAR';
          const feedback = nextState ? 'ENCENDIDO' : 'APAGADO';
          
          if (connectionMode === 'bluetooth') {
            webBluetooth.sendCommand(cmd);
            showToast(`Click Bluetooth: Celular -> ESP32: "${cmd}" (8ms)`);
          } else {
            const topicNum = id === 'lum-1' ? 'luz1' : id === 'lum-2' ? 'luz2' : 'luz3';
            showToast(`MQTT TX: hogar/${topicNum}/comando "${cmd}" -> ESP32 RX: hogar/${topicNum}/estado "${feedback}"`);
          }

          return {
            ...l,
            isOn: nextState,
            powerWatts: nextState ? Number(((l.brightness || 80) * 0.25).toFixed(1)) : 0,
          };
        }
        return l;
      })
    );
  };

  const handleBrightnessChange = (id: string, brightness: number) => {
    setLights((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          return {
            ...l,
            brightness,
            isOn: brightness > 0 ? true : false,
            powerWatts: Number(((brightness / 100) * 25).toFixed(1)),
          };
        }
        return l;
      })
    );
  };

  const handleUpdateLight = (updated: Luminaria) => {
    setLights((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    showToast(`Luminaria "${updated.name}" actualizada con éxito.`);
  };

  const handleTurnOffAll = () => {
    setLights((prev) =>
      prev.map((l) => ({
        ...l,
        isOn: false,
        powerWatts: 0,
      }))
    );
    setHasActiveAlert(false);
    showToast('Comando MQTT: Todas las luces apagadas (0.0 W)');
  };

  const handleTurnOffForgottenLight = () => {
    setLights((prev) =>
      prev.map((l) =>
        l.name === 'Lámpara Estudio'
          ? { ...l, isOn: false, brightness: 0, powerWatts: 0 }
          : l
      )
    );
    setHasActiveAlert(false);
    showToast('Lámpara de Estudio apagada por MQTT. Consumo fantasma detenido.');
  };

  // Scene handlers
  const handleActivateScene = (sceneId: string) => {
    const targetScene = escenas.find((s) => s.id === sceneId);
    if (!targetScene) return;

    setActiveSceneName(targetScene.name);
    setEscenas((prev) =>
      prev.map((s) => ({
        ...s,
        active: s.id === sceneId,
      }))
    );

    // Update lights to match scene preset
    if (targetScene.id === 'sc-1') {
      // Relax Atardecer
      setLights((prev) =>
        prev.map((l) =>
          l.roomType === 'estudio' || l.roomType === 'salon'
            ? { ...l, isOn: true, brightness: 35, colorTemp: 2200, powerWatts: 8.5 }
            : l
        )
      );
    } else if (targetScene.id === 'sc-2') {
      // Modo Concentración
      setLights((prev) =>
        prev.map((l) =>
          l.roomType === 'estudio'
            ? { ...l, isOn: true, brightness: 90, colorTemp: 5000, powerWatts: 22.4 }
            : l
        )
      );
    } else if (targetScene.id === 'sc-3') {
      // Cine & Gaming
      setLights((prev) =>
        prev.map((l) =>
          l.roomType === 'estudio'
            ? { ...l, isOn: true, brightness: 15, colorTemp: 6500, powerWatts: 4.0 }
            : { ...l, isOn: false, powerWatts: 0 }
        )
      );
    }

    showToast(`Escena "${targetScene.name}" sincronizada en la red mesh.`);
  };

  const handleApplyQuickScene = (sceneName: string) => {
    const found = escenas.find((s) => s.name === sceneName);
    if (found) {
      handleActivateScene(found.id);
    }
  };

  const handleUndoIncident = (incidentId: string) => {
    setIncidents((prev) => prev.filter((i) => i.id !== incidentId));
    showToast('Incidente deshecho: Relé restaurado a estado anterior.');
  };

  const handleSaveRule = (rule: Partial<ReglaAntiOlvido>) => {
    showToast('Regla Anti-Olvido activada y sincronizada en firmware ESP32.');
    setSubView(null);
    setActiveTab('automatizacion');
  };

  // Determine view to render
  const renderContent = () => {
    if (subView === 'nueva-regla') {
      return (
        <NuevaReglaModal
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
          activeSceneId={
            escenas.find((s) => s.name === activeSceneName)?.id || 'sc-1'
          }
          onActivateScene={handleActivateScene}
          onBack={() => setSubView(null)}
        />
      );
    }

    if (subView === 'mesh-topology') {
      return <MeshTopologyModal onClose={() => setSubView(null)} />;
    }

    switch (activeTab) {
      case 'luces':
        return (
          <LucesView
            lights={lights}
            onToggleLight={handleToggleLight}
            onBrightnessChange={handleBrightnessChange}
            onSelectLight={(light) => setSelectedLight(light)}
            onTurnOffAll={handleTurnOffAll}
            onOpenScenes={() => setSubView('escenas')}
            onOpenMeshTopology={() => setSubView('mesh-topology')}
            activeScene={activeSceneName}
            onApplyScene={handleApplyQuickScene}
            hasActiveAlert={hasActiveAlert}
            onDismissAlert={() => setHasActiveAlert(false)}
            onTurnOffForgottenLight={handleTurnOffForgottenLight}
            isBluetoothConnected={isBluetoothConnected}
            bluetoothDeviceName={bluetoothDeviceName}
            onConnectBluetooth={handleConnectBluetoothDirect}
            onDisconnectBluetooth={handleDisconnectBluetooth}
            onOpenBluetoothModal={() => setShowBluetoothModal(true)}
            onSendDirectBtCommand={handleSendDirectBtCommand}
          />
        );
      case 'automatizacion':
        return (
          <AutomatizacionView
            onOpenNewRule={() => setSubView('nueva-regla')}
            onOpenScenes={() => setSubView('escenas')}
            onTurnOffForgottenLight={handleTurnOffForgottenLight}
            hasActiveAlert={hasActiveAlert}
            onDismissAlert={() => setHasActiveAlert(false)}
            incidents={incidents}
            onUndoIncident={handleUndoIncident}
          />
        );
      case 'consumo':
        return <ConsumoView lights={lights} />;
      case 'ajustes':
        return (
          <AjustesView
            onOpenMeshTopology={() => setSubView('mesh-topology')}
            onOpenKotlinViewer={() => setShowKotlinViewer(true)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#080D1A] text-slate-100 flex flex-col items-center justify-start antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Top Device Preview Bar (on Desktop/Tablet) */}
      <aside aria-label="Controles de visualización" className="w-full bg-[#0A101F] border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-200">
            LumiControl IoT
          </span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            ESP32-S3 Mesh Gateway • Firmware v2.4.12
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Mode Quick Indicator */}
          <button
            onClick={() => setShowBluetoothModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all active:scale-95 ${
              connectionMode === 'bluetooth'
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
            }`}
            title="Cambiar entre Bluetooth Directo y MQTT Wi-Fi"
          >
            {connectionMode === 'bluetooth' ? (
              <Bluetooth className="w-3.5 h-3.5 text-blue-400 stroke-[2.5]" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{connectionMode === 'bluetooth' ? 'Bluetooth' : 'MQTT'}</span>
          </button>

          {/* Kotlin Code Viewer Trigger Button */}
          <button
            onClick={() => setShowKotlinViewer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm shadow-purple-600/30 transition-all active:scale-95"
            title="Ver y exportar código fuente en Kotlin & Jetpack Compose"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Código (.kt / .ino)</span>
          </button>

          <div className="flex items-center gap-1 bg-[#121B30] p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setDeviceFrameMode('mobile')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                deviceFrameMode === 'mobile'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Smartphone</span>
            </button>

            <button
              onClick={() => setDeviceFrameMode('expanded')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                deviceFrameMode === 'expanded'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Expandida</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-300 ${
          deviceFrameMode === 'mobile'
            ? 'max-w-[420px] my-0 sm:my-6 sm:rounded-[40px] sm:border sm:border-slate-800 sm:shadow-2xl sm:shadow-black/70 overflow-hidden bg-[#080D1A]'
            : 'max-w-5xl my-0 sm:my-6 sm:rounded-3xl sm:border sm:border-slate-800 sm:shadow-2xl bg-[#080D1A]'
        }`}
      >
        {/* Header */}
        <Header
          title={
            subView === 'nueva-regla'
              ? 'Nueva Regla'
              : subView === 'escenas'
              ? 'Escenas'
              : subView === 'mesh-topology'
              ? 'Topología Mesh'
              : 'LumiControl IoT'
          }
          showBack={subView !== null}
          connectionMode={connectionMode}
          statusText={isBluetoothConnected ? 'BT Enlazado (8ms)' : 'BT: 1-Click'}
          onBack={() => setSubView(null)}
          onOpenMesh={() => setSubView('mesh-topology')}
          onOpenBluetooth={isBluetoothConnected ? () => setShowBluetoothModal(true) : handleConnectBluetoothDirect}
          onOpenProfile={() => setShowProfileModal(true)}
        />

        {/* Content Body */}
        <main className="px-4 py-4 min-h-[calc(100vh-125px)] sm:min-h-[720px]">
          {renderContent()}
        </main>

        {/* Fixed Bottom Tab Navigation (Only shown when not in full sub-view) */}
        {!subView && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setSubView(null);
            }}
            unreadCount={hasActiveAlert ? 4 : 0}
          />
        )}
      </div>

      {/* Light Detail Modal */}
      {selectedLight && (
        <LightDetailModal
          light={selectedLight}
          onClose={() => setSelectedLight(null)}
          onUpdate={handleUpdateLight}
        />
      )}

      {/* MQTT Sandbox Modal */}
      {showSandbox && (
        <MqttSandboxModal
          onClose={() => setShowSandbox(false)}
          onTriggerAbsenceAlert={() => {
            setHasActiveAlert(true);
            showToast('Alerta de ausencia activada en Lámpara Estudio');
          }}
          onTurnOffAll={handleTurnOffAll}
        />
      )}

      {/* User Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in text-left">
          <div className="w-full max-w-sm bg-[#0E1526] border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/src/assets/images/avatar_sofia_mendoza_1794437958356.jpg"
                  alt="Sofía Mendoza"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-500"
                />
                <div>
                  <h3 className="text-base font-bold text-white">Sofía Mendoza</h3>
                  <span className="text-xs text-amber-400 font-semibold">
                    Supervisora de Hogar
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-[#121B30] border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Email</span>
                <span className="text-white font-mono">sofia.m@lumicontrol.iot</span>
              </div>
              <div className="p-3 rounded-xl bg-[#121B30] border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block text-[10px]">Dispositivo Activo</span>
                  <span className="text-white font-semibold">Pixel 9 Pro (5G)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                  Geocerca OK
                </span>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setActiveTab('ajustes');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                Ir a Ajustes y Permisos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kotlin Code Viewer Modal */}
      {showKotlinViewer && (
        <KotlinCodeViewerModal onClose={() => setShowKotlinViewer(false)} />
      )}

      {/* Bluetooth Connect & Scan Modal */}
      {showBluetoothModal && (
        <BluetoothConnectModal
          onClose={() => setShowBluetoothModal(false)}
          connectionMode={connectionMode}
          onSetConnectionMode={(mode) => {
            setConnectionMode(mode);
            showToast(`Modo cambiado a: ${mode === 'bluetooth' ? 'Bluetooth Directo (ESP32)' : 'MQTT (Wi-Fi Broker)'}`);
          }}
          onSendBtCommand={(cmd) => {
            const isTurnOn = cmd === 'ENCENDER';
            setLights((prev) =>
              prev.map((l) =>
                l.name === 'Lámpara Estudio'
                  ? {
                      ...l,
                      isOn: isTurnOn,
                      powerWatts: isTurnOn ? 22.4 : 0,
                      brightness: isTurnOn ? (l.brightness || 85) : 0,
                    }
                  : l
              )
            );
            if (!isTurnOn) setHasActiveAlert(false);
            showToast(`Bluetooth TX: "${cmd}" -> ESP32 RX: "${isTurnOn ? 'ENCENDIDO' : 'APAGADO'}"`);
          }}
        />
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-amber-500/50 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

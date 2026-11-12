package com.lumicontrol.iot.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lumicontrol.iot.data.MqttClientRepository
import com.lumicontrol.iot.model.Escena
import com.lumicontrol.iot.model.Incidente
import com.lumicontrol.iot.model.Luminaria
import com.lumicontrol.iot.model.MqttLogEntry
import com.lumicontrol.iot.model.ReglaAntiOlvido
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class LumiUiState(
    val lights: List<Luminaria> = emptyList(),
    val scenes: List<Escena> = emptyList(),
    val incidents: List<Incidente> = emptyList(),
    val activeSceneName: String = "Relax Atardecer",
    val hasActiveAlert: Boolean = true,
    val totalWatts: Double = 52.4,
    val weeklySavingsPercent: Int = 32,
    val estimatedHourlyCostEur: Double = 0.08,
    val mqttLogs: List<MqttLogEntry> = emptyList(),
    val isMqttConnected: Boolean = true,
    val isBluetoothConnected: Boolean = false,
    val bluetoothDeviceName: String = "ESP32_LumiControl",
    val latencyMs: Int = 18
)

class LumiControlViewModel(
    private val repository: MqttClientRepository = MqttClientRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        LumiUiState(
            lights = listOf(
                Luminaria(
                    id = "lum-1",
                    name = "Lámpara Estudio",
                    room = "Sala de Estudio",
                    roomType = "estudio",
                    isOn = true,
                    brightness = 85,
                    colorTemp = 2900,
                    powerWatts = 22.4,
                    pirActive = true,
                    sensorDistance = "1.2m",
                    iconType = "lamp"
                ),
                Luminaria(
                    id = "lum-2",
                    name = "Plafón Suite",
                    room = "Habitación Ppal",
                    roomType = "dormitorio",
                    isOn = true,
                    brightness = 40,
                    colorTemp = 3200,
                    powerWatts = 14.0,
                    modeLabel = "3200K Lectura",
                    iconType = "ceiling"
                ),
                Luminaria(
                    id = "lum-3",
                    name = "Tira LED Mesa",
                    room = "Sala de Estudio",
                    roomType = "estudio",
                    isOn = false,
                    brightness = 0,
                    colorTemp = 4000,
                    powerWatts = 0.0,
                    scheduleLabel = "Auto 20:00",
                    iconType = "strip"
                ),
                Luminaria(
                    id = "lum-4",
                    name = "Focos Isla",
                    room = "Cocina",
                    roomType = "cocina",
                    isOn = true,
                    brightness = 100,
                    colorTemp = 4500,
                    powerWatts = 16.0,
                    modeLabel = "4500K Neutra",
                    iconType = "spot"
                )
            ),
            scenes = listOf(
                Escena(
                    id = "sc-1",
                    name = "Relax Atardecer",
                    category = "favoritas",
                    description = "4 lámparas vinculadas • Salón & Comedor",
                    temperature = 2200,
                    tempLabel = "2200 K",
                    intensity = 35,
                    powerWatts = 14.2,
                    linkedLightsCount = 4,
                    roomSummary = "Salón & Comedor",
                    badge = "En vivo",
                    badgeType = "live",
                    footerNote = "Sincronización óptica suave",
                    active = true,
                    iconName = "sunset"
                ),
                Escena(
                    id = "sc-2",
                    name = "Modo Concentración",
                    category = "favoritas",
                    description = "Foco directo en escritorio y lectura",
                    temperature = 5000,
                    tempLabel = "5000 K",
                    intensity = 90,
                    powerWatts = 38.5,
                    linkedLightsCount = 2,
                    roomSummary = "Estudio & Despacho",
                    badge = "PIR Activo",
                    badgeType = "pir",
                    footerNote = "Apaga al detectar 10 min de ausencia",
                    active = false,
                    iconName = "focus"
                ),
                Escena(
                    id = "sc-3",
                    name = "Cine & Gaming",
                    category = "inmersivas",
                    description = "Acentos cian & apagado perimetral",
                    temperature = 6500,
                    tempLabel = "Cian Dual",
                    intensity = 15,
                    powerWatts = 18.0,
                    linkedLightsCount = 5,
                    roomSummary = "Salón Home Cinema",
                    badge = "Inmersivo",
                    badgeType = "immersive",
                    footerNote = "Vía HDMI Sync Box",
                    active = false,
                    iconName = "gamepad"
                ),
                Escena(
                    id = "sc-4",
                    name = "Luz Nocturna / Guía",
                    category = "circadianas",
                    description = "Pasillo, baño y zócalos de cortesía",
                    temperature = 2000,
                    tempLabel = "2000 K",
                    intensity = 5,
                    powerWatts = 4.8,
                    linkedLightsCount = 3,
                    roomSummary = "Pasillo & Baño",
                    badge = "No molestar",
                    badgeType = "dnd",
                    footerNote = "Modo descanso (23:00 - 07:00)",
                    active = false,
                    iconName = "moon"
                )
            ),
            incidents = listOf(
                Incidente(
                    id = "inc-1",
                    title = "Plafón Cocina",
                    timeAgo = "Hace 22 min",
                    specs = "45W LED",
                    description = "Auto-apagado ejecutado tras 30 min sin ocupación detectada en zona de encimera.",
                    type = "auto-resolved",
                    typeLabel = "Auto-resuelto",
                    metricLabel = "Ahorro estimado: 0.04 kWh",
                    canUndo = true
                ),
                Incidente(
                    id = "inc-2",
                    title = "Foco Pasillo",
                    timeAgo = "Hace 1h 15m",
                    specs = "Entrada principal",
                    description = "Apagado remoto ejecutado al desconectarse dispositivos familiares de la red local (Fuera de casa).",
                    type = "geofence",
                    typeLabel = "Geocerca Wi-Fi",
                    metricLabel = "Trigger: RSSI de red bajo umbral",
                    canUndo = false
                ),
                Incidente(
                    id = "inc-3",
                    title = "Luz Escritorio",
                    timeAgo = "Ayer 23:45",
                    specs = "Dormitorio 1",
                    description = "Aviso nocturno atendido y confirmado manualmente desde la app por usuario Administrador.",
                    type = "resolved",
                    typeLabel = "Resuelto",
                    metricLabel = "Acción manual vía push",
                    canUndo = false
                )
            ),
            mqttLogs = listOf(
                MqttLogEntry("1", "18:42:01.320", "PUB", "home/sala/esp32/luz_1", """{"lux":85,"state":"ON"}"""),
                MqttLogEntry("2", "18:42:02.104", "SUB", "home/mesh/telemetry", """{"rssi":-45,"heap":219433}"""),
                MqttLogEntry("3", "18:42:03.018", "QoS1", "PUBACK", "PUBACK PacketID #1042 recibido")
            )
        )
    )
    val uiState: StateFlow<LumiUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            repository.incomingMessages.collect { newEntry ->
                _uiState.value = _uiState.value.copy(
                    mqttLogs = listOf(newEntry) + _uiState.value.mqttLogs.take(30)
                )
            }
        }
    }

    fun toggleLight(id: String) {
        val currentList = _uiState.value.lights
        val updated = currentList.map { light ->
            if (light.id == id) {
                val nextState = !light.isOn
                val newWatts = if (nextState) (light.brightness * 0.25) else 0.0
                if (nextState) {
                    repository.turnOnLight(light.roomType, light.id, light.brightness, light.colorTemp)
                } else {
                    repository.turnOffLight(light.roomType, light.id)
                }
                light.copy(isOn = nextState, powerWatts = newWatts)
            } else light
        }
        recalculatePower(updated)
    }

    fun updateBrightness(id: String, brightness: Int) {
        val updated = _uiState.value.lights.map { light ->
            if (light.id == id) {
                val isOn = brightness > 0
                val watts = (brightness / 100.0) * 25.0
                repository.turnOnLight(light.roomType, light.id, brightness, light.colorTemp)
                light.copy(brightness = brightness, isOn = isOn, powerWatts = watts)
            } else light
        }
        recalculatePower(updated)
    }

    fun turnOffAllHome() {
        val updated = _uiState.value.lights.map { it.copy(isOn = false, powerWatts = 0.0) }
        repository.turnOffAllHome()
        _uiState.value = _uiState.value.copy(
            lights = updated,
            hasActiveAlert = false,
            totalWatts = 0.0,
            estimatedHourlyCostEur = 0.0
        )
    }

    fun turnOffForgottenLight() {
        val updated = _uiState.value.lights.map {
            if (it.name == "Lámpara Estudio") {
                repository.turnOffLight(it.roomType, it.id)
                it.copy(isOn = false, powerWatts = 0.0)
            } else it
        }
        _uiState.value = _uiState.value.copy(
            hasActiveAlert = false
        )
        recalculatePower(updated)
    }

    fun dismissAlert() {
        _uiState.value = _uiState.value.copy(hasActiveAlert = false)
    }

    fun activateScene(sceneId: String) {
        val target = _uiState.value.scenes.find { it.id == sceneId } ?: return
        repository.applyScene(target.name)
        val updatedScenes = _uiState.value.scenes.map { it.copy(active = it.id == sceneId) }
        _uiState.value = _uiState.value.copy(
            scenes = updatedScenes,
            activeSceneName = target.name
        )
    }

    private fun recalculatePower(lights: List<Luminaria>) {
        val sumWatts = lights.filter { it.isOn }.sumOf { it.powerWatts }
        val cost = (sumWatts / 1000.0) * 0.28
        _uiState.value = _uiState.value.copy(
            lights = lights,
            totalWatts = Math.round(sumWatts * 10.0) / 10.0,
            estimatedHourlyCostEur = Math.round(cost * 100.0) / 100.0
        )
    }

    fun connectBluetooth() {
        _uiState.value = _uiState.value.copy(isBluetoothConnected = true)
    }

    fun disconnectBluetooth() {
        _uiState.value = _uiState.value.copy(isBluetoothConnected = false)
    }

    fun sendBtCommand(cmd: String) {
        val isTurnOn = cmd == "ENCENDER"
        val updated = _uiState.value.lights.map {
            if (it.name == "Lámpara Estudio") {
                it.copy(isOn = isTurnOn, powerWatts = if (isTurnOn) 22.4 else 0.0)
            } else it
        }
        recalculatePower(updated)
    }
}

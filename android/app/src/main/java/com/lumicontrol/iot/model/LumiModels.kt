package com.lumicontrol.iot.model

import kotlinx.serialization.Serializable

@Serializable
data class Luminaria(
    val id: String,
    val name: String,
    val room: String,
    val roomType: String, // "estudio", "dormitorio", "cocina", "salon"
    val isOn: Boolean = false,
    val brightness: Int = 0, // 0 - 100
    val colorTemp: Int = 2700, // Kelvin 2000 - 6500
    val powerWatts: Double = 0.0,
    val pirActive: Boolean = false,
    val sensorDistance: String? = null,
    val modeLabel: String? = null,
    val scheduleLabel: String? = null,
    val iconType: String = "lamp"
)

@Serializable
data class Escena(
    val id: String,
    val name: String,
    val category: String, // "favoritas", "circadianas", "inmersivas"
    val description: String,
    val temperature: Int,
    val tempLabel: String? = null,
    val intensity: Int,
    val powerWatts: Double,
    val linkedLightsCount: Int,
    val roomSummary: String,
    val badge: String? = null,
    val badgeType: String? = null,
    val footerNote: String,
    val active: Boolean = false,
    val iconName: String = "sunset"
)

@Serializable
data class Incidente(
    val id: String,
    val title: String,
    val timeAgo: String,
    val specs: String,
    val description: String,
    val type: String, // "auto-resolved", "geofence", "resolved"
    val typeLabel: String,
    val metricLabel: String,
    val canUndo: Boolean = false
)

@Serializable
data class ReglaAntiOlvido(
    val id: String,
    val targetDevice: String,
    val deviceLabel: String,
    val triggerType: String = "pir_mmwave",
    val waitMinutes: Int = 20,
    val onlyNight: Boolean = true,
    val outsideGeofence: Boolean = false,
    val actionType: String = "warning_with_snooze",
    val softDimming: Boolean = true,
    val savedKwhWeekly: Double = 2.1,
    val savedUsdWeekly: Double = 0.42,
    val isActive: Boolean = true
)

@Serializable
data class MeshNode(
    val id: String,
    val name: String,
    val role: String,
    val status: String = "online",
    val rssi: Int = -50,
    val rssiQuality: String = "Excelente",
    val detail: String,
    val iconType: String = "relay"
)

@Serializable
data class MqttLogEntry(
    val id: String,
    val timestamp: String,
    val type: String, // PUB, SUB, MESH, SYS, QoS1
    val topic: String,
    val payload: String
)

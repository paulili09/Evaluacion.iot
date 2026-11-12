package com.lumicontrol.iot.data

import com.lumicontrol.iot.model.MqttLogEntry
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.eclipse.paho.client.mqttv3.*
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MqttClientRepository(
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO),
    private val serverUri: String = "ssl://broker.emqx.io:8883",
    private val clientId: String = "LumiAndroidApp_" + System.currentTimeMillis()
) {
    companion object {
        const val TOPIC_LUZ1_COMANDO = "hogar/luz1/comando"
        const val TOPIC_LUZ1_ESTADO = "hogar/luz1/estado"
        const val TOPIC_ALL_ESTADO = "hogar/+/estado"
    }

    private var mqttClient: MqttAsyncClient? = null

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    private val _latencyMs = MutableStateFlow(18)
    val latencyMs: StateFlow<Int> = _latencyMs.asStateFlow()

    // Estado reactivo de luz 1 recibido por "hogar/luz1/estado"
    private val _luz1State = MutableStateFlow(true)
    val luz1State: StateFlow<Boolean> = _luz1State.asStateFlow()

    // Flujo de logs de paquetes para la UI
    private val _incomingMessages = MutableSharedFlow<MqttLogEntry>(replay = 20)
    val incomingMessages: SharedFlow<MqttLogEntry> = _incomingMessages.asSharedFlow()

    private val timeFormat = SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault())

    init {
        connectToBroker()
    }

    fun connectToBroker() {
        scope.launch {
            try {
                mqttClient = MqttAsyncClient(serverUri, clientId, MemoryPersistence())
                val options = MqttConnectOptions().apply {
                    isCleanSession = true
                    connectionTimeout = 10
                    keepAliveInterval = 30
                    isAutomaticReconnect = true
                }

                mqttClient?.setCallback(object : MqttCallbackExtended {
                    override fun connectComplete(reconnect: Boolean, serverURI: String?) {
                        _isConnected.value = true
                        logMessage("SYS", "Conexión MQTT establecida con $serverURI", "broker/status")
                        subscribeToTopics()
                    }

                    override fun connectionLost(cause: Throwable?) {
                        _isConnected.value = false
                        logMessage("SYS", "Conexión perdida: ${cause?.localizedMessage}", "broker/status")
                    }

                    override fun messageArrived(topic: String?, message: MqttMessage?) {
                        val payloadStr = message?.toString() ?: ""
                        logMessage("SUB", payloadStr, topic ?: "")

                        // Procesar feedback del ESP32 en "hogar/luz1/estado"
                        if (topic == TOPIC_LUZ1_ESTADO) {
                            val isNowOn = payloadStr.equals("ENCENDIDO", ignoreCase = true) ||
                                          payloadStr.equals("ON", ignoreCase = true) ||
                                          payloadStr.contains("\"estado\":\"ENCENDIDO\"", ignoreCase = true)
                            _luz1State.value = isNowOn
                        }
                    }

                    override fun deliveryComplete(token: IMqttDeliveryToken?) {
                        // Confirmación QoS 1
                    }
                })

                mqttClient?.connect(options, null, object : IMqttActionListener {
                    override fun onSuccess(asyncActionToken: IMqttToken?) {
                        _isConnected.value = true
                    }

                    override fun onFailure(asyncActionToken: IMqttToken?, exception: Throwable?) {
                        _isConnected.value = false
                        logMessage("SYS", "Fallo al conectar broker: ${exception?.message}", "broker/error")
                    }
                })
            } catch (e: Exception) {
                _isConnected.value = false
                logMessage("SYS", "Error de inicialización: ${e.message}", "broker/error")
            }
        }
    }

    private fun subscribeToTopics() {
        try {
            mqttClient?.subscribe(TOPIC_LUZ1_ESTADO, 1)
            mqttClient?.subscribe(TOPIC_ALL_ESTADO, 1)
            logMessage("SYS", "Suscrito con éxito a $TOPIC_LUZ1_ESTADO y $TOPIC_ALL_ESTADO", "mqtt/sub")
        } catch (e: Exception) {
            logMessage("SYS", "Error al suscribirse: ${e.message}", "mqtt/sub/error")
        }
    }

    /**
     * Publica instrucción de control al ESP32 en "hogar/luz1/comando".
     * Valores enviados: "ENCENDER" o "APAGAR".
     */
    fun sendCommandLuz1(encender: Boolean) {
        val payload = if (encender) "ENCENDER" else "APAGAR"
        publish(TOPIC_LUZ1_COMANDO, payload)
    }

    fun publish(topic: String, payload: String, qos: Int = 1) {
        scope.launch {
            logMessage("PUB", payload, topic)
            try {
                if (mqttClient?.isConnected == true) {
                    val message = MqttMessage(payload.toByteArray()).apply {
                        this.qos = qos
                    }
                    mqttClient?.publish(topic, message)
                }
            } catch (e: Exception) {
                logMessage("SYS", "Error al publicar: ${e.message}", topic)
            }
        }
    }

    fun turnOffLight(roomType: String, lightId: String) {
        if (lightId == "lum-1") {
            sendCommandLuz1(false)
        } else {
            publish("hogar/$lightId/comando", "APAGAR")
        }
    }

    fun turnOnLight(roomType: String, lightId: String, brightness: Int = 100, cct: Int = 2700) {
        if (lightId == "lum-1") {
            sendCommandLuz1(true)
        } else {
            publish("hogar/$lightId/comando", "ENCENDER")
        }
    }

    fun turnOffAllHome() {
        sendCommandLuz1(false)
        publish("hogar/todas/comando", "APAGAR_TODO")
    }

    fun applyScene(sceneName: String) {
        publish("hogar/escena/comando", sceneName)
    }

    private fun logMessage(type: String, payload: String, topic: String) {
        scope.launch {
            val entry = MqttLogEntry(
                id = System.currentTimeMillis().toString(),
                timestamp = timeFormat.format(Date()),
                type = type,
                topic = topic,
                payload = payload
            )
            _incomingMessages.emit(entry)
        }
    }
}

package com.lumicontrol.iot.data

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID

enum class BtConnectionStatus {
    DISCONNECTED,
    SCANNING,
    CONNECTING,
    CONNECTED,
    ERROR
}

data class DiscoveredBtDevice(
    val name: String,
    val address: String,
    val rssi: Int = -55
)

/**
 * Gestor de comunicación Bluetooth (Classic SPP & BLE) para ESP32
 * Permite conectar el teléfono directamente al ESP32 sin necesidad de Wi-Fi ni Internet.
 */
class BluetoothManager(
    private val context: Context,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO)
) {
    companion object {
        // UUID estándar para perfil serie Bluetooth SPP (Serial Port Profile)
        val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        const val TARGET_ESP32_NAME = "ESP32_LumiControl"
    }

    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null
    private var inputStream: InputStream? = null

    private val _connectionStatus = MutableStateFlow(BtConnectionStatus.DISCONNECTED)
    val connectionStatus: StateFlow<BtConnectionStatus> = _connectionStatus.asStateFlow()

    private val _connectedDeviceName = MutableStateFlow<String?>("ESP32_LumiControl")
    val connectedDeviceName: StateFlow<String?> = _connectedDeviceName.asStateFlow()

    // Estado recibido de la luz vía Bluetooth ("ENCENDIDO" / "APAGADO")
    private val _lightState = MutableStateFlow(true)
    val lightState: StateFlow<Boolean> = _lightState.asStateFlow()

    // Logs de mensajes enviados y recibidos por Bluetooth
    private val _btLogs = MutableSharedFlow<String>(replay = 20)
    val btLogs: SharedFlow<String> = _btLogs.asSharedFlow()

    private val _discoveredDevices = MutableStateFlow<List<DiscoveredBtDevice>>(emptyList())
    val discoveredDevices: StateFlow<List<DiscoveredBtDevice>> = _discoveredDevices.asStateFlow()

    @SuppressLint("MissingPermission")
    fun scanDevices() {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            _connectionStatus.value = BtConnectionStatus.ERROR
            log("Bluetooth no disponible o desactivado en el teléfono")
            return
        }

        _connectionStatus.value = BtConnectionStatus.SCANNING
        log("Buscando dispositivos Bluetooth cercanos...")

        // Dispositivos vinculados previamente
        val paired = bluetoothAdapter.bondedDevices.map {
            DiscoveredBtDevice(it.name ?: "Desconocido", it.address, -48)
        }
        _discoveredDevices.value = paired
    }

    /**
     * Conecta directamente al dispositivo ESP32 mediante Bluetooth SPP
     */
    @SuppressLint("MissingPermission")
    fun connectToDevice(deviceAddress: String) {
        scope.launch {
            _connectionStatus.value = BtConnectionStatus.CONNECTING
            log("Conectando vía Bluetooth a $deviceAddress...")

            try {
                val device: BluetoothDevice = bluetoothAdapter?.getRemoteDevice(deviceAddress)
                    ?: throw Exception("Dispositivo no encontrado")

                socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
                bluetoothAdapter.cancelDiscovery()
                socket?.connect()

                outputStream = socket?.outputStream
                inputStream = socket?.inputStream

                _connectionStatus.value = BtConnectionStatus.CONNECTED
                _connectedDeviceName.value = device.name ?: TARGET_ESP32_NAME
                log("✓ Conexión Bluetooth establecida con ${device.name}!")

                startListeningIncomingData()
            } catch (e: Exception) {
                _connectionStatus.value = BtConnectionStatus.ERROR
                log("Fallo de conexión Bluetooth: ${e.message}")
                disconnect()
            }
        }
    }

    /**
     * Envía instrucción de encendido/apagado al ESP32 por Bluetooth
     */
    fun sendCommand(encender: Boolean) {
        val command = if (encender) "ENCENDER\n" else "APAGAR\n"
        scope.launch {
            try {
                outputStream?.write(command.toByteArray())
                outputStream?.flush()
                log("[BT TX] Enviado a ESP32: ${command.trim()}")
            } catch (e: Exception) {
                log("Error al transmitir por Bluetooth: ${e.message}")
            }
        }
    }

    /**
     * Bucle de escucha continua para leer respuestas del ESP32 por Bluetooth
     */
    private fun startListeningIncomingData() {
        scope.launch {
            val buffer = ByteArray(1024)
            while (_connectionStatus.value == BtConnectionStatus.CONNECTED) {
                try {
                    val bytesRead = inputStream?.read(buffer) ?: -1
                    if (bytesRead > 0) {
                        val message = String(buffer, 0, bytesRead).trim()
                        log("[BT RX] Recibido desde ESP32: $message")

                        withContext(Dispatchers.Main) {
                            if (message.contains("ENCENDIDO", ignoreCase = true) || message == "1") {
                                _lightState.value = true
                            } else if (message.contains("APAGADO", ignoreCase = true) || message == "0") {
                                _lightState.value = false
                            }
                        }
                    }
                } catch (e: Exception) {
                    log("Desconectado de Bluetooth")
                    break
                }
            }
            disconnect()
        }
    }

    fun disconnect() {
        try {
            inputStream?.close()
            outputStream?.close()
            socket?.close()
        } catch (_: Exception) {}
        _connectionStatus.value = BtConnectionStatus.DISCONNECTED
    }

    private fun log(message: String) {
        scope.launch {
            _btLogs.emit(message)
        }
    }
}

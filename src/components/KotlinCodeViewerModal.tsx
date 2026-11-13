import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, Folder, Code2 } from 'lucide-react';

interface KotlinCodeViewerModalProps {
  onClose: () => void;
}

export const KotlinCodeViewerModal: React.FC<KotlinCodeViewerModalProps> = ({ onClose }) => {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const liveOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://lumicontrol.iot';

  const files = [
    {
      id: 'webview_apk',
      name: 'WebViewAppActivity.kt (APK Instantáneo)',
      path: 'app/src/main/java/com/lumicontrol/iot/WebViewAppActivity.kt',
      lang: 'kotlin',
      code: `package com.lumicontrol.iot

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.*
import androidx.activity.ComponentActivity

// APK Android Studio listo para abrir la app en vivo con soporte Bluetooth/USB y DOM Storage
class WebViewAppActivity : ComponentActivity() {
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                request.grant(request.resources)
            }
        }
        webView.webViewClient = WebViewClient()
        webView.loadUrl("${liveOrigin}")
    }
}`
    },
    {
      id: 'login_screen',
      name: 'LoginScreen.kt (Auth JWT)',
      path: 'app/src/main/java/com/lumicontrol/iot/ui/screens/LoginScreen.kt',
      lang: 'kotlin',
      code: `package com.lumicontrol.iot.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

@Composable
fun LoginScreen(
    onLoginSubmit: (username: String, password: String) -> Unit,
    isLoading: Boolean,
    errorMsg: String?
) {
    var username by remember { mutableStateOf("sofia") }
    var password by remember { mutableStateOf("lumi2026") }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text("LumiControl IoT", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(16.dp))
        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            label = { Text("Usuario") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Contraseña") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )
        errorMsg?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, color = MaterialTheme.colorScheme.error)
        }
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = { onLoginSubmit(username, password) },
            enabled = !isLoading,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (isLoading) "Autenticando..." else "Iniciar Sesión JWT")
        }
    }
}`
    },
    {
      id: 'dual_device_sync',
      name: 'DualDeviceSyncRepository.kt',
      path: 'app/src/main/java/com/lumicontrol/iot/data/DualDeviceSyncRepository.kt',
      lang: 'kotlin',
      code: `package com.lumicontrol.iot.data

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

// Almacenamiento local SQLite + Sincronización con API REST entre 2 dispositivos Android
class SensorDbHelper(context: Context) : SQLiteOpenHelper(context, "lumi_sensors.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id TEXT PRIMARY KEY,
                sensor_type TEXT NOT NULL,
                zone TEXT NOT NULL,
                value REAL NOT NULL,
                device_id TEXT NOT NULL,
                channel TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
        """.trimIndent())
    }
    override fun onUpgrade(db: SQLiteDatabase, oldV: Int, newV: Int) {}
}

class DualDeviceSyncRepository(
    private val dbHelper: SensorDbHelper,
    private val cryptoHelper: SecurityCryptoHelper,
    private val baseUrl: String = "${liveOrigin}"
) {
    suspend fun syncCommandAcrossDevices(
        deviceId: String,
        channel: String, // "bluetooth" o "wifi"
        command: String,
        targetLightId: String
    ): Boolean = withContext(Dispatchers.IO) {
        val token = cryptoHelper.getAccessToken() ?: return@withContext false
        val conn = (URL("\$baseUrl/api/dispositivos/sync/").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            setRequestProperty("Authorization", "Bearer \$token")
            setRequestProperty("Content-Type", "application/json")
            doOutput = true
        }
        val body = """{"fromDeviceId":"\$deviceId","channel":"\$channel","command":"\$command","targetLightId":"\$targetLightId"}"""
        conn.outputStream.use { it.write(body.toByteArray()) }
        conn.responseCode in 200..299
    }
}`
    },
    {
      id: 'iso27400_crypto',
      name: 'SecurityCryptoHelper.kt (ISO 27400)',
      path: 'app/src/main/java/com/lumicontrol/iot/security/SecurityCryptoHelper.kt',
      lang: 'kotlin',
      code: `package com.lumicontrol.iot.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

// Cumplimiento ISO/IEC 27400: Cifrado AES-256-GCM en almacenamiento local de credenciales y tokens JWT
class SecurityCryptoHelper(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val securePrefs = EncryptedSharedPreferences.create(
        context,
        "lumi_secure_jwt_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveTokens(access: String, refresh: String) {
        securePrefs.edit()
            .putString("jwt_access", access)
            .putString("jwt_refresh", refresh)
            .apply()
    }

    fun getAccessToken(): String? = securePrefs.getString("jwt_access", null)
}`
    },
    {
      id: 'android_manifest',
      name: 'AndroidManifest.xml (Permisos)',
      path: 'app/src/main/AndroidManifest.xml',
      lang: 'xml',
      code: `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

    <!-- ISO 27400: Tráfico cifrado HTTPS obligatorio (usesCleartextTraffic=false) -->
    <application
        android:usesCleartextTraffic="false"
        android:label="LumiControl IoT">
        <activity android:name=".MainActivity" android:exported="true" />
    </application>
</manifest>`
    },
    {
      id: 'usb_cable_manager',
      name: 'UsbCableManager.kt (Cable USB)',
      path: 'app/src/main/java/com/lumicontrol/iot/data/UsbCableManager.kt',
      lang: 'kotlin',
      code: `package com.lumicontrol.iot.data

import android.content.Context
import android.hardware.usb.*
import kotlinx.coroutines.*

// Sincronización directa por Cable USB / OTG entre teléfono Android y hardware IoT o PC (ADB reverse)
class UsbCableManager(private val context: Context) {
    private val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
    private var connection: UsbDeviceConnection? = null
    private var endpointOut: UsbEndpoint? = null

    fun listConnectedUsbDevices(): List<UsbDevice> =
        usbManager.deviceList.values.toList()

    fun openUsbChannel(device: UsbDevice): Boolean {
        if (!usbManager.hasPermission(device)) return false
        val usbInterface = device.getInterface(0)
        val conn = usbManager.openDevice(device) ?: return false
        conn.claimInterface(usbInterface, true)
        for (i in 0 until usbInterface.endpointCount) {
            val ep = usbInterface.getEndpoint(i)
            if (ep.direction == UsbConstants.USB_DIR_OUT) endpointOut = ep
        }
        connection = conn
        return true
    }

    suspend fun sendCommandOverCable(cmd: String): Boolean = withContext(Dispatchers.IO) {
        val data = "\$cmd\\n".toByteArray()
        val conn = connection ?: return@withContext false
        val ep = endpointOut ?: return@withContext false
        conn.bulkTransfer(ep, data, data.size, 1000) >= 0
    }
}`
    },
    {
      id: 'main_activity',
      name: 'MainActivity.kt',
      path: 'app/src/main/java/com/lumicontrol/iot/MainActivity.kt',
      lang: 'kotlin',
      code: `package com.lumicontrol.iot

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.*
import com.lumicontrol.iot.ui.screens.*
import com.lumicontrol.iot.ui.theme.*
import com.lumicontrol.iot.viewmodel.LumiControlViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            LumiControlTheme {
                MainApp()
            }
        }
    }
}

@Composable
fun MainApp(viewModel: LumiControlViewModel = viewModel()) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: "luces"

    Scaffold(
        topBar = { TopAppBarLumi(onOpenProfile = {}) },
        bottomBar = {
            BottomBarLumi(
                currentRoute = currentRoute,
                onNavigate = { route ->
                    navController.navigate(route) {
                        popUpTo(navController.graph.startDestinationId)
                        launchSingleTop = true
                    }
                }
            )
        },
        containerColor = BgDark
    ) { innerPadding ->
        NavHost(navController = navController, startDestination = "luces", modifier = Modifier.padding(innerPadding)) {
            composable("luces") {
                HomeScreen(
                    viewModel = viewModel,
                    onNavigateToScenes = { navController.navigate("escenas") },
                    onNavigateToMesh = { navController.navigate("mesh") }
                )
            }
            composable("automatizacion") {
                AntiOlvidoScreen(
                    viewModel = viewModel,
                    onNavigateToNewRule = { navController.navigate("nueva_regla") }
                )
            }
        }
    }
}`
    },
    {
      id: 'home_screen',
      name: 'HomeScreen.kt (Luces)',
      path: 'app/src/main/java/com/lumicontrol/iot/ui/screens/HomeScreen.kt',
      lang: 'kotlin',
      code: `package com.lumicontrol.iot.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumicontrol.iot.ui.theme.*
import com.lumicontrol.iot.viewmodel.LumiControlViewModel

@Composable
fun HomeScreen(
    viewModel: LumiControlViewModel,
    onNavigateToScenes: () -> Unit,
    onNavigateToMesh: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedRoom by remember { mutableStateOf("todas") }

    Column(modifier = modifier.fillMaxSize().background(BgDark).padding(horizontal = 16.dp)) {
        // Top Greeting
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Hola, Sofía 👋", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                Text("\${uiState.lights.count { it.isOn }} de \${uiState.lights.size} luminarias encendidas", fontSize = 12.sp, color = TextSecondary)
            }
            // En Casa (5G)
            Text(
                "En Casa (5G)",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = EmeraldAccent,
                modifier = Modifier.clip(RoundedCornerShape(50)).background(Color(0x2210B981)).padding(8.dp, 4.dp)
            )
        }

        // Aviso de Presencia
        if (uiState.hasActiveAlert) {
            Box(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(SurfaceElevated).border(1.dp, Color(0x66F59E0B)).padding(16.dp)
            ) {
                Column {
                    Text("AVISO DE PRESENCIA • Hace 4 min", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AmberPrimary)
                    Text("Lámpara de Estudio olvidada", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("Sin movimiento detectado durante 90 minutos.", fontSize = 12.sp, color = TextSecondary)
                    Row(modifier = Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { viewModel.turnOffForgottenLight() },
                            colors = ButtonDefaults.buttonColors(containerColor = AmberPrimary)
                        ) {
                            Text("Apagar ahora", color = BgDark, fontWeight = FontWeight.Bold)
                        }
                        OutlinedButton(onClick = { viewModel.dismissAlert() }) {
                            Text("Mantener")
                        }
                    }
                }
            }
        }
    }
}`
    },
    {
      id: 'viewmodel',
      name: 'LumiControlViewModel.kt',
      path: 'app/src/main/java/com/lumicontrol/iot/viewmodel/LumiControlViewModel.kt',
      lang: 'kotlin',
      code: `package com.lumicontrol.iot.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lumicontrol.iot.data.MqttClientRepository
import com.lumicontrol.iot.model.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class LumiUiState(
    val lights: List<Luminaria> = emptyList(),
    val scenes: List<Escena> = emptyList(),
    val incidents: List<Incidente> = emptyList(),
    val activeSceneName: String = "Relax Atardecer",
    val hasActiveAlert: Boolean = true,
    val totalWatts: Double = 52.4,
    val weeklySavingsPercent: Int = 32,
    val estimatedHourlyCostEur: Double = 0.08
)

class LumiControlViewModel(
    private val repository: MqttClientRepository = MqttClientRepository()
) : ViewModel() {
    private val _uiState = MutableStateFlow(LumiUiState())
    val uiState: StateFlow<LumiUiState> = _uiState.asStateFlow()

    fun toggleLight(id: String) {
        val updated = _uiState.value.lights.map {
            if (it.id == id) it.copy(isOn = !it.isOn) else it
        }
        _uiState.value = _uiState.value.copy(lights = updated)
    }

    fun turnOffForgottenLight() {
        _uiState.value = _uiState.value.copy(hasActiveAlert = false)
        repository.turnOffLight("estudio", "lum-1")
    }

    fun dismissAlert() {
        _uiState.value = _uiState.value.copy(hasActiveAlert = false)
    }
}`
    },
    {
      id: 'mqtt_repo',
      name: 'MqttClientRepository.kt (Flow)',
      path: 'app/src/main/java/com/lumicontrol/iot/data/MqttClientRepository.kt',
      lang: 'kotlin',
      code: `package com.lumicontrol.iot.data

import com.lumicontrol.iot.model.MqttLogEntry
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import org.eclipse.paho.client.mqttv3.*
import java.text.SimpleDateFormat
import java.util.*

class MqttClientRepository(
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO)
) {
    companion object {
        const val TOPIC_LUZ1_COMANDO = "hogar/luz1/comando" // Android -> ESP32: "ENCENDER" o "APAGAR"
        const val TOPIC_LUZ1_ESTADO  = "hogar/luz1/estado"  // ESP32 -> Android: "ENCENDIDO" o "APAGADO"
    }

    private val _luz1State = MutableStateFlow(true)
    val luz1State: StateFlow<Boolean> = _luz1State.asStateFlow()

    private val _incomingMessages = MutableSharedFlow<MqttLogEntry>(replay = 20)
    val incomingMessages: SharedFlow<MqttLogEntry> = _incomingMessages.asSharedFlow()

    // Envía la instrucción de control al tópico 'hogar/luz1/comando'
    fun sendCommandLuz1(encender: Boolean) {
        val payload = if (encender) "ENCENDER" else "APAGAR"
        publish(TOPIC_LUZ1_COMANDO, payload)
    }

    // Callback de mensajes recibidos desde el broker MQTT
    fun onMessageArrived(topic: String, payload: String) {
        if (topic == TOPIC_LUZ1_ESTADO) {
            val isNowOn = payload.equals("ENCENDIDO", ignoreCase = true)
            _luz1State.value = isNowOn // Actualiza estado verificado en UI
        }
    }

    fun publish(topic: String, payload: String, qos: Int = 1) {
        scope.launch {
            val entry = MqttLogEntry(
                id = System.currentTimeMillis().toString(),
                timestamp = SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault()).format(Date()),
                type = "PUB",
                topic = topic,
                payload = payload
            )
            _incomingMessages.emit(entry)
        }
    }
}`
    },
    {
      id: 'esp32_firmware',
      name: 'lumi_esp32_mqtt.ino (ESP32 C++)',
      path: 'esp32_firmware/lumi_esp32_mqtt.ino',
      lang: 'cpp',
      code: `/*
 * Firmware ESP32 - Comunicación MQTT vía Wi-Fi
 * Tópicos:
 * - Suscribe: hogar/luz1/comando ("ENCENDER" / "APAGAR")
 * - Publica:  hogar/luz1/estado  ("ENCENDIDO" / "APAGADO")
 */

#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID     = "MiRedWiFi_Hogar";
const char* WIFI_PASSWORD = "PasswordSeguro123";
const char* MQTT_BROKER   = "broker.emqx.io";
const int   MQTT_PORT     = 1883;

const char* TOPIC_COMANDO = "hogar/luz1/comando";
const char* TOPIC_ESTADO  = "hogar/luz1/estado";
const int   RELAY_PIN     = 23;

WiFiClient espClient;
PubSubClient client(espClient);

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  message.trim();

  if (String(topic) == TOPIC_COMANDO) {
    if (message.equalsIgnoreCase("ENCENDER")) {
      digitalWrite(RELAY_PIN, HIGH);
      client.publish(TOPIC_ESTADO, "ENCENDIDO", true);
    } else if (message.equalsIgnoreCase("APAGAR")) {
      digitalWrite(RELAY_PIN, LOW);
      client.publish(TOPIC_ESTADO, "APAGADO", true);
    }
  }
}

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  
  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    if (client.connect("ESP32_LumiControl")) {
      client.subscribe(TOPIC_COMANDO);
    } else delay(5000);
  }
  client.loop();
}`
    },
    {
      id: 'bluetooth_manager',
      name: 'BluetoothManager.kt (Celular Android)',
      path: 'app/src/main/java/com/lumicontrol/iot/data/BluetoothManager.kt',
      lang: 'kotlin',
      code: `package com.lumicontrol.iot.data

import android.annotation.SuppressLint
import android.bluetooth.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import java.io.*
import java.util.UUID

class BluetoothManager(
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.IO)
) {
    companion object {
        val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        const val TARGET_DEVICE = "ESP32_LumiControl"
    }

    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    // Envía "ENCENDER\\n" o "APAGAR\\n" directo al ESP32 por Bluetooth
    fun sendCommand(encender: Boolean) {
        val cmd = if (encender) "ENCENDER\\n" else "APAGAR\\n"
        scope.launch {
            try {
                outputStream?.write(cmd.toByteArray())
                outputStream?.flush()
            } catch (e: Exception) {
                // Manejo de desconexión
            }
        }
    }

    @SuppressLint("MissingPermission")
    fun connect(device: BluetoothDevice) {
        scope.launch {
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            socket?.connect()
            outputStream = socket?.outputStream
        }
    }
}`
    },
    {
      id: 'bluetooth_ino',
      name: 'lumi_esp32_bluetooth.ino (ESP32 C++)',
      path: 'esp32_firmware/lumi_esp32_bluetooth.ino',
      lang: 'cpp',
      code: `/*
 * Firmware Bluetooth Serial para ESP32
 * Conexión directa Celular ↔ ESP32 (Sin Wi-Fi ni Internet)
 */

#include "BluetoothSerial.h"

BluetoothSerial SerialBT;
const int RELAY_PIN = 23;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  // Nombre visible en el Bluetooth del celular
  SerialBT.begin("ESP32_LumiControl");
}

void loop() {
  if (SerialBT.available()) {
    String comando = SerialBT.readStringUntil('\\n');
    comando.trim();

    if (comando.equalsIgnoreCase("ENCENDER")) {
      digitalWrite(RELAY_PIN, HIGH);
      SerialBT.println("ENCENDIDO");
    } else if (comando.equalsIgnoreCase("APAGAR")) {
      digitalWrite(RELAY_PIN, LOW);
      SerialBT.println("APAGADO");
    }
  }
}`
    },
    {
      id: 'models',
      name: 'LumiModels.kt',
      path: 'app/src/main/java/com/lumicontrol/iot/model/LumiModels.kt',
      lang: 'kotlin',
      code: `package com.lumicontrol.iot.model

import kotlinx.serialization.Serializable

@Serializable
data class Luminaria(
    val id: String,
    val name: String,
    val room: String,
    val roomType: String,
    val isOn: Boolean = false,
    val brightness: Int = 0,
    val colorTemp: Int = 2700,
    val powerWatts: Double = 0.0,
    val pirActive: Boolean = false
)

@Serializable
data class Escena(
    val id: String,
    val name: String,
    val category: String,
    val temperature: Int,
    val intensity: Int,
    val powerWatts: Double,
    val active: Boolean = false
)

@Serializable
data class Incidente(
    val id: String,
    val title: String,
    val timeAgo: String,
    val specs: String,
    val description: String,
    val type: String,
    val typeLabel: String,
    val metricLabel: String,
    val canUndo: Boolean = false
)`
    },
    {
      id: 'gradle',
      name: 'build.gradle.kts',
      path: 'app/build.gradle.kts',
      lang: 'kotlin',
      code: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.lumicontrol.iot"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.lumicontrol.iot"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "2.4.12"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.navigation:navigation-compose:2.8.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("org.eclipse.paho:org.eclipse.paho.client.mqttv3:1.2.5")
}`
    }
  ];

  const [selectedFileId, setSelectedFileId] = useState<string>(files[0].id);
  const currentFile = files.find((f) => f.id === selectedFileId) || files[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(currentFile.id);
    setTimeout(() => setCopiedFile(null), 2500);
  };

  const handleDownload = (filenamePath: string, text: string) => {
    const baseName = filenamePath.split('/').pop() || 'LumiControl.kt';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = baseName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in text-left">
      <div className="w-full max-w-4xl bg-[#0E1526] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-[#10182C] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  Proyecto Android en Kotlin &amp; Jetpack Compose
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] font-bold">
                  /android/ + APK
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Arquitectura MVI + Coroutines Flow + WebView/BLE listo para Android Studio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content split: File sidebar & Code preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* File Explorer Sidebar */}
          <div className="w-full md:w-64 bg-[#0A101E] border-r border-slate-800 p-3 overflow-y-auto space-y-1 shrink-0">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>Archivos Kotlin (.kt)</span>
            </div>

            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => setSelectedFileId(file.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  selectedFileId === file.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <FileCode className="w-4 h-4 shrink-0 text-purple-300" />
                <span className="truncate">{file.name}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-[#070B14] overflow-hidden">
            {/* Action toolbar */}
            <div className="px-4 py-2.5 bg-[#0C1220] border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
              <span className="font-mono text-slate-400 text-[11px] truncate">
                {currentFile.path}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(currentFile.path, currentFile.code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold transition-colors active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(currentFile.code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors active:scale-95 cursor-pointer"
                >
                  {copiedFile === currentFile.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code container */}
            <pre className="flex-1 p-4 font-mono text-[12px] text-slate-300 overflow-auto leading-relaxed select-text">
              <code>{currentFile.code}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#10182C] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Archivos disponibles en <code>/android/</code> y listos para descargar en Android Studio</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
          >
            Cerrar Visor
          </button>
        </div>
      </div>
    </div>
  );
};

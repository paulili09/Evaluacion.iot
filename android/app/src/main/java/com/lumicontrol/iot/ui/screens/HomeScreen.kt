package com.lumicontrol.iot.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import com.lumicontrol.iot.model.Luminaria
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

    val filteredLights = remember(uiState.lights, selectedRoom) {
        if (selectedRoom == "todas") uiState.lights
        else uiState.lights.filter { it.roomType == selectedRoom }
    }

    val activeCount = uiState.lights.count { it.isOn }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(BgDark)
            .padding(horizontal = 16.dp)
    ) {
        // Top Greeting
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 12.dp, bottom = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Hola, Sofía 👋",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(AmberPrimary)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "$activeCount de ${uiState.lights.size} luminarias encendidas en el hogar",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            }

            // Wi-Fi 5G Pill
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(Color(0x2210B981))
                    .border(1.dp, Color(0x4410B981), RoundedCornerShape(50))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Wifi,
                    contentDescription = null,
                    tint = EmeraldAccent,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "En Casa (5G)",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = EmeraldAccent
                )
            }
        }

        // Direct Bluetooth Connection Hero Card
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(SurfaceDark)
                .border(1.dp, if (uiState.isBluetoothConnected) Color(0xFF3B82F6) else Color(0x443B82F6), RoundedCornerShape(20.dp))
                .padding(14.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (uiState.isBluetoothConnected) Color(0x3310B981) else Color(0x333B82F6)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Bluetooth,
                                contentDescription = null,
                                tint = if (uiState.isBluetoothConnected) EmeraldAccent else Color(0xFF60A5FA),
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = if (uiState.isBluetoothConnected) "Bluetooth ESP32 Enlazado" else "Conexión Directa Bluetooth",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextPrimary
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(if (uiState.isBluetoothConnected) EmeraldAccent else Color(0xFF60A5FA))
                                )
                            }
                            Text(
                                text = if (uiState.isBluetoothConnected) "Dispositivo: ${uiState.bluetoothDeviceName} • Latencia 8ms" else "Control directo desde el celular sin Wi-Fi",
                                fontSize = 11.sp,
                                color = TextSecondary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                if (!uiState.isBluetoothConnected) {
                    Button(
                        onClick = { viewModel.connectBluetooth() },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Bluetooth, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("📲 Abrir Conexión Bluetooth con Celular", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { viewModel.sendBtCommand("ENCENDER") },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldAccent),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("ENCENDER", color = BgDark, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                        }
                        Button(
                            onClick = { viewModel.sendBtCommand("APAGAR") },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = SurfaceElevated),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("APAGAR", color = TextPrimary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                        }
                        OutlinedButton(
                            onClick = { viewModel.disconnectBluetooth() },
                            shape = RoundedCornerShape(10.dp),
                            border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(Color(0xFFEF4444)))
                        ) {
                            Text("Desconectar", color = Color(0xFFEF4444), fontSize = 11.sp)
                        }
                    }
                }
            }
        }

        // Active Warning Banner (Anti-Olvido)
        if (uiState.hasActiveAlert) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(SurfaceElevated)
                    .border(1.dp, Color(0x66F59E0B), RoundedCornerShape(20.dp))
                    .padding(16.dp)
            ) {
                Row(crossAxisAlignment = CrossAlignment.Start) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0x33F59E0B)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.NotificationsActive,
                            contentDescription = null,
                            tint = AmberPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "AVISO DE PRESENCIA • Hace 4 min",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = AmberPrimary,
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = "Lámpara de Estudio olvidada",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                        Text(
                            text = "Sin movimiento detectado durante 90 minutos. Consumiendo 22.4W continuos.",
                            fontSize = 12.sp,
                            color = TextSecondary,
                            lineHeight = 16.sp,
                            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Button(
                                onClick = { viewModel.turnOffForgottenLight() },
                                modifier = Modifier.weight(1.5f),
                                colors = ButtonDefaults.buttonColors(containerColor = AmberPrimary),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.PowerSettingsNew,
                                    contentDescription = null,
                                    tint = BgDark,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Apagar ahora", color = BgDark, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }

                            OutlinedButton(
                                onClick = { viewModel.dismissAlert() },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                                border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(Color(0xFF334155))),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Mantener", fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }

        // Carga Lumínica Instantánea Card
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(SurfaceDark)
                .border(1.dp, CardBorder, RoundedCornerShape(20.dp))
                .padding(16.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Bolt,
                            contentDescription = null,
                            tint = EmeraldAccent,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Carga Lumínica Instantánea",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary
                        )
                    }

                    Text(
                        text = "● A+ Eco Eficiente",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = EmeraldAccent,
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(Color(0x2210B981))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    MetricBox(
                        title = "Potencia Total",
                        value = "${uiState.totalWatts} W",
                        modifier = Modifier.weight(1f)
                    )
                    MetricBox(
                        title = "Ahorro Semanal",
                        value = "+${uiState.weeklySavingsPercent}%",
                        valueColor = EmeraldAccent,
                        modifier = Modifier.weight(1f)
                    )
                    MetricBox(
                        title = "Coste Estimado",
                        value = "${uiState.estimatedHourlyCostEur} €/h",
                        modifier = Modifier.weight(1f)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Button(
                    onClick = { viewModel.turnOffAllHome() },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = SurfaceElevated),
                    shape = RoundedCornerShape(12.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(Color(0x33F59E0B)))
                ) {
                    Icon(
                        imageVector = Icons.Default.PowerSettingsNew,
                        contentDescription = null,
                        tint = AmberPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Apagar Todo el Hogar",
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                    Spacer(modifier = Modifier.weight(1f))
                    Text(
                        text = "Toque doble",
                        color = TextSecondary,
                        fontSize = 10.sp
                    )
                }
            }
        }

        // Quick Scenes Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "ESCENAS RÁPIDAS",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = TextSecondary,
                letterSpacing = 0.5.sp
            )
            Text(
                text = "Gestionar",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = AmberPrimary,
                modifier = Modifier.clickable { onNavigateToScenes() }
            )
        }

        // Quick Scenes Horizontal Scroll
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(bottom = 16.dp)
        ) {
            items(uiState.scenes) { scene ->
                val isActive = scene.name == uiState.activeSceneName
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (isActive) AmberPrimary else SurfaceElevated)
                        .clickable { viewModel.activateScene(scene.id) }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.WbSunny,
                        contentDescription = null,
                        tint = if (isActive) BgDark else AmberPrimary,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = scene.name,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isActive) BgDark else TextPrimary
                    )
                }
            }
        }

        // Room Filter Tabs
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(bottom = 14.dp)
        ) {
            val rooms = listOf("todas" to "Todas (${uiState.lights.size})", "estudio" to "Estudio (2)", "dormitorio" to "Dormitorio (1)", "cocina" to "Cocina (1)")
            items(rooms) { (key, label) ->
                val isSelected = selectedRoom == key
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(if (isSelected) AmberPrimary else SurfaceElevated)
                        .clickable { selectedRoom = key }
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = label,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isSelected) BgDark else TextSecondary
                    )
                }
            }
        }

        // Light Cards Grid
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(filteredLights) { light ->
                LightCardItem(
                    light = light,
                    onToggle = { viewModel.toggleLight(light.id) },
                    onBrightness = { b -> viewModel.updateBrightness(light.id, b) }
                )
            }
        }
    }
}

@Composable
fun MetricBox(
    title: String,
    value: String,
    valueColor: Color = TextPrimary,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(SurfaceSubtle)
            .padding(10.dp)
    ) {
        Column {
            Text(text = title, fontSize = 10.sp, color = TextSecondary)
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = value, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = valueColor)
        }
    }
}

@Composable
fun LightCardItem(
    light: Luminaria,
    onToggle: () -> Unit,
    onBrightness: (Int) -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(18.dp))
            .background(if (light.isOn) SurfaceElevated else SurfaceDark)
            .border(1.dp, if (light.isOn) Color(0x44F59E0B) else CardBorder, RoundedCornerShape(18.dp))
            .padding(12.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (light.isOn) Color(0x33F59E0B) else Color(0x22334155)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Lightbulb,
                        contentDescription = null,
                        tint = if (light.isOn) AmberPrimary else TextMuted,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Switch(
                    checked = light.isOn,
                    onCheckedChange = { onToggle() },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = BgDark,
                        checkedTrackColor = AmberPrimary,
                        uncheckedTrackColor = Color(0xFF334155)
                    )
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (light.pirActive) {
                Text(
                    text = "● PIR Activo",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = EmeraldAccent
                )
            } else if (light.modeLabel != null) {
                Text(
                    text = light.modeLabel,
                    fontSize = 10.sp,
                    color = AmberPrimary
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = light.name,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )

            Text(
                text = "${light.room} • ${if (light.isOn) "${light.powerWatts}W" else "Inactivo"}",
                fontSize = 11.sp,
                color = TextSecondary
            )

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = "Brillo", fontSize = 10.sp, color = TextSecondary)
                Text(text = "${if (light.isOn) light.brightness else 0}%", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }

            Slider(
                value = (if (light.isOn) light.brightness else 0).toFloat(),
                onValueChange = { onBrightness(it.toInt()) },
                valueRange = 0f..100f,
                enabled = light.isOn,
                colors = SliderDefaults.colors(
                    thumbColor = AmberPrimary,
                    activeTrackColor = AmberPrimary,
                    inactiveTrackColor = Color(0xFF334155)
                )
            )
        }
    }
}

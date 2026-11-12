package com.lumicontrol.iot.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.lumicontrol.iot.model.Incidente
import com.lumicontrol.iot.ui.theme.*
import com.lumicontrol.iot.viewmodel.LumiControlViewModel

@Composable
fun AntiOlvidoScreen(
    viewModel: LumiControlViewModel,
    onNavigateToNewRule: () -> Unit,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    var soundAlertsEnabled by remember { mutableStateOf(true) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(BgDark)
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Centro Anti-Olvido",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = TextPrimary
                )

                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(Color(0x2210B981))
                        .border(1.dp, Color(0x4410B981), RoundedCornerShape(50))
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = null,
                        tint = EmeraldAccent,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Radar Activo",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = EmeraldAccent
                    )
                }
            }
        }

        item {
            // 3 KPI Cards
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                KpiCard(title = "Avisos hoy", value = "3", subtitle = "+1 vs ayer", subColor = AmberPrimary, modifier = Modifier.weight(1f))
                KpiCard(title = "Resp. media", value = "4.2m", subtitle = "-1.1 min", subColor = EmeraldAccent, modifier = Modifier.weight(1f))
                KpiCard(title = "Ahorro", value = "1.8kWh", subtitle = "≈ $0.34 USD", subColor = TextSecondary, modifier = Modifier.weight(1f))
            }
        }

        if (uiState.hasActiveAlert) {
            item {
                // Critical Alert Card
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(20.dp))
                        .background(SurfaceElevated)
                        .border(1.dp, Color(0x66F59E0B), RoundedCornerShape(20.dp))
                        .padding(16.dp)
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = null,
                                tint = AmberPrimary,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "ALERTA CRÍTICA • Ahora mismo",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = AmberPrimary
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = "¡Luz encendida sin presencia!",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = TextPrimary
                        )

                        Text(
                            text = "Lámpara de Estudio lleva 90 minutos encendida sin registrar movimiento en el sensor PIR mmWave de estancia.",
                            fontSize = 12.sp,
                            color = TextSecondary,
                            lineHeight = 16.sp,
                            modifier = Modifier.padding(vertical = 6.dp)
                        )

                        // mmWave badge
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(SurfaceSubtle)
                                .padding(8.dp)
                        ) {
                            Text(
                                text = "📡 Sensor mmWave Estudio • 0.00 m/s mov.",
                                fontSize = 11.sp,
                                color = CyanAccent,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Button(
                                onClick = { viewModel.turnOffForgottenLight() },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = AmberPrimary),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Apagar (MQTT)", color = BgDark, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }

                            Button(
                                onClick = { viewModel.dismissAlert() },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = SurfaceDark),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text("Posponer 15m", color = TextPrimary, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }

        item {
            Button(
                onClick = onNavigateToNewRule,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = AmberPrimary),
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, tint = BgDark)
                Spacer(modifier = Modifier.width(6.dp))
                Text("Nueva Regla Anti-Olvido", color = BgDark, fontWeight = FontWeight.Bold)
            }
        }

        item {
            Text(
                text = "Incidentes Recientes",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = TextSecondary
            )
        }

        items(uiState.incidents) { incident ->
            IncidentItem(incident = incident)
        }

        item {
            // Umbrales & Alertas Sonoras
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(18.dp))
                    .background(SurfaceDark)
                    .border(1.dp, CardBorder, RoundedCornerShape(18.dp))
                    .padding(16.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Umbrales & Alertas Sonoras", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text("Sensibilidad mmWave y tonos prioritarios", fontSize = 11.sp, color = TextSecondary)
                        }

                        Switch(
                            checked = soundAlertsEnabled,
                            onCheckedChange = { soundAlertsEnabled = it },
                            colors = SwitchDefaults.colors(checkedTrackColor = AmberPrimary, checkedThumbColor = BgDark)
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(SurfaceSubtle)
                            .padding(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Umbral actual: 30 min inactividad", fontSize = 11.sp, color = TextSecondary)
                            Text("Ajustar >", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AmberPrimary)
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
fun KpiCard(
    title: String,
    value: String,
    subtitle: String,
    subColor: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceDark)
            .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
            .padding(12.dp)
    ) {
        Column {
            Text(text = title, fontSize = 10.sp, color = TextSecondary)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = value, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = subtitle, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = subColor)
        }
    }
}

@Composable
fun IncidentItem(incident: Incidente) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(SurfaceDark)
            .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = incident.title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Text(
                    text = "● ${incident.typeLabel}",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = EmeraldAccent,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .background(Color(0x2210B981))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }

            Text(text = "${incident.timeAgo} • ${incident.specs}", fontSize = 11.sp, color = TextSecondary)
            Text(
                text = incident.description,
                fontSize = 11.sp,
                color = TextPrimary,
                modifier = Modifier.padding(vertical = 4.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = incident.metricLabel, fontSize = 10.sp, color = EmeraldAccent)
                if (incident.canUndo) {
                    Text(
                        text = "Deshacer",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(SurfaceElevated)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }
        }
    }
}

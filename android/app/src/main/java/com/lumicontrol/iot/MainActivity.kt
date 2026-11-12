package com.lumicontrol.iot

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
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
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.lumicontrol.iot.ui.screens.AntiOlvidoScreen
import com.lumicontrol.iot.ui.screens.HomeScreen
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
        topBar = {
            TopAppBarLumi(onOpenProfile = {})
        },
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
        NavHost(
            navController = navController,
            startDestination = "luces",
            modifier = Modifier.padding(innerPadding)
        ) {
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
            composable("consumo") {
                Box(
                    modifier = Modifier.fillMaxSize().background(BgDark),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Telemetría de Consumo & Ahorro", color = TextPrimary)
                }
            }
            composable("ajustes") {
                Box(
                    modifier = Modifier.fillMaxSize().background(BgDark),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Ajustes & Firmware ESP32", color = TextPrimary)
                }
            }
        }
    }
}

@Composable
fun TopAppBarLumi(onOpenProfile: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .background(BgDark)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(AmberPrimary),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Sensors,
                    contentDescription = null,
                    tint = BgDark,
                    modifier = Modifier.size(18.dp)
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Column {
                Text(
                    text = "LumiControl IoT",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = "Home Mesh Network",
                    fontSize = 10.sp,
                    color = TextSecondary
                )
            }
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            // MQTT / ESP32 Pill
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(SurfaceDark)
                    .border(1.dp, CardBorder, RoundedCornerShape(50))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(EmeraldAccent)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "MQTT / ESP32",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = EmeraldAccent
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Profile Avatar
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF6366F1)),
                contentAlignment = Alignment.Center
            ) {
                Text("SM", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun BottomBarLumi(
    currentRoute: String,
    onNavigate: (String) -> Unit
) {
    NavigationBar(
        containerColor = SurfaceElevated,
        modifier = Modifier.border(1.dp, CardBorder)
    ) {
        val items = listOf(
            Triple("luces", "Luces", Icons.Default.Lightbulb),
            Triple("automatizacion", "Automatización", Icons.Default.Schedule),
            Triple("consumo", "Consumo", Icons.Default.Bolt),
            Triple("ajustes", "Ajustes", Icons.Default.Settings)
        )

        items.forEach { (route, label, icon) ->
            val isSelected = currentRoute == route
            NavigationBarItem(
                selected = isSelected,
                onClick = { onNavigate(route) },
                icon = {
                    Icon(
                        imageVector = icon,
                        contentDescription = label,
                        tint = if (isSelected) AmberPrimary else TextMuted
                    )
                },
                label = {
                    Text(
                        text = label,
                        color = if (isSelected) AmberPrimary else TextMuted,
                        fontSize = 10.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    indicatorColor = Color.Transparent
                )
            )
        }
    }
}

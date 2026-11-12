package com.lumicontrol.iot.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color

val BgDark = Color(0xFF080D1A)
val SurfaceDark = Color(0xFF101728)
val SurfaceElevated = Color(0xFF121B30)
val SurfaceSubtle = Color(0xFF0B111E)
val CardBorder = Color(0x33334155)

// Accents
val AmberPrimary = Color(0xFFF59E0B)
val AmberSecondary = Color(0xFFD97706)
val AmberDark = Color(0xFFB45309)
val EmeraldAccent = Color(0xFF10B981)
val CyanAccent = Color(0xFF06B6D4)
val PurpleAccent = Color(0xFF8B5CF6)

val TextPrimary = Color(0xFFF8FAFC)
val TextSecondary = Color(0xFF94A3B8)
val TextMuted = Color(0xFF64748B)

val DarkColorScheme = darkColorScheme(
    primary = AmberPrimary,
    onPrimary = Color(0xFF080D1A),
    secondary = CyanAccent,
    onSecondary = Color(0xFF080D1A),
    tertiary = EmeraldAccent,
    background = BgDark,
    surface = SurfaceDark,
    onBackground = TextPrimary,
    onSurface = TextPrimary
)

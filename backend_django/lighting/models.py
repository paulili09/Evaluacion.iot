from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Luminaria(models.Model):
    ROOM_CHOICES = [
        ('estudio', 'Sala de Estudio'),
        ('dormitorio', 'Habitación Principal'),
        ('cocina', 'Cocina'),
        ('salon', 'Salón'),
    ]
    ICON_CHOICES = [
        ('lamp', 'Lámpara de Escritorio'),
        ('ceiling', 'Plafón de Techo'),
        ('strip', 'Tira LED'),
        ('spot', 'Focos Spot'),
        ('bedside', 'Aplique Cabecero'),
    ]

    name = models.CharField(max_length=100)
    room = models.CharField(max_length=100)
    room_type = models.CharField(max_length=20, choices=ROOM_CHOICES, default='estudio')
    is_on = models.BooleanField(default=False)
    brightness = models.IntegerField(
        default=80,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    color_temp = models.IntegerField(
        default=3000,
        validators=[MinValueValidator(2000), MaxValueValidator(6500)]
    )
    power_watts = models.DecimalField(max_digits=6, decimal_places=1, default=0.0)
    pir_active = models.BooleanField(default=False)
    icon_type = models.CharField(max_length=20, choices=ICON_CHOICES, default='lamp')
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Regla de negocio: cálculo automático de consumo real en Watts
        if not self.is_on or self.brightness <= 0:
            self.power_watts = 0.0
        else:
            self.power_watts = round((self.brightness / 100.0) * 25.0, 1)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.room})"


class Escena(models.Model):
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=30, default='favoritas')
    description = models.TextField(blank=True)
    temperature = models.IntegerField(default=2700)
    intensity = models.IntegerField(default=50)
    active = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class ReglaAntiOlvido(models.Model):
    TRIGGER_CHOICES = [
        ('pir_mmwave', 'Inactividad PIR mmWave'),
        ('radar_24g', 'Radar 24G'),
        ('geofence', 'Geocerca Wi-Fi'),
    ]
    ACTION_CHOICES = [
        ('warning_with_snooze', 'Alerta preventiva con pre-aviso'),
        ('direct_cut', 'Corte directo sin confirmación'),
    ]

    target_device = models.ForeignKey(
        Luminaria,
        on_delete=models.CASCADE,
        related_name='reglas',
        null=True,
        blank=True
    )
    device_label = models.CharField(max_length=120)
    trigger_type = models.CharField(max_length=30, choices=TRIGGER_CHOICES, default='pir_mmwave')
    wait_minutes = models.PositiveIntegerField(default=20)
    only_night = models.BooleanField(default=True)
    outside_geofence = models.BooleanField(default=False)
    action_type = models.CharField(max_length=30, choices=ACTION_CHOICES, default='warning_with_snooze')
    soft_dimming = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Regla {self.device_label} ({self.wait_minutes} min)"


class IncidenteAntiOlvido(models.Model):
    luminaria = models.ForeignKey(Luminaria, on_delete=models.CASCADE, related_name='incidentes')
    title = models.CharField(max_length=120)
    description = models.TextField()
    incident_type = models.CharField(max_length=30, default='auto-resolved')
    saved_kwh = models.DecimalField(max_digits=6, decimal_places=3, default=0.04)
    created_at = models.DateTimeField(auto_now_add=True)

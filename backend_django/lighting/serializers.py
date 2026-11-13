from rest_framework import serializers
from .models import Luminaria, Escena, ReglaAntiOlvido, IncidenteAntiOlvido


class LuminariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Luminaria
        fields = [
            'id',
            'name',
            'room',
            'room_type',
            'is_on',
            'brightness',
            'color_temp',
            'power_watts',
            'pir_active',
            'icon_type',
            'updated_at',
        ]
        read_only_fields = ['id', 'power_watts', 'updated_at']

    def validate_brightness(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError('El brillo debe estar entre 0 y 100.')
        return value

    def validate_color_temp(self, value):
        if value < 2000 or value > 6500:
            raise serializers.ValidationError('La temperatura debe estar entre 2000K y 6500K.')
        return value


class EscenaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Escena
        fields = '__all__'


class ReglaAntiOlvidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReglaAntiOlvido
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def validate_wait_minutes(self, value):
        if value < 1 or value > 180:
            raise serializers.ValidationError('El tiempo de espera debe estar entre 1 y 180 minutos.')
        return value


class IncidenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidenteAntiOlvido
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

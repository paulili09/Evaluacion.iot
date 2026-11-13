from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Luminaria, Escena, ReglaAntiOlvido, IncidenteAntiOlvido
from .serializers import (
    LuminariaSerializer,
    EscenaSerializer,
    ReglaAntiOlvidoSerializer,
    IncidenteSerializer,
)


class LuminariaViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de luminarias IoT con protección JWT obligatoria
    y acciones de conmutación para ESP32.
    """
    queryset = Luminaria.objects.all().order_by('id')
    serializer_class = LuminariaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        room_type = self.request.query_params.get('room_type')
        search = self.request.query_params.get('search')
        if room_type and room_type != 'todas':
            queryset = queryset.filter(room_type=room_type)
        if search:
            queryset = queryset.filter(name__icontains=search)
        return queryset

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        luminaria = self.get_object()
        luminaria.is_on = not luminaria.is_on
        if luminaria.is_on and luminaria.brightness == 0:
            luminaria.brightness = 80
        luminaria.save()
        return Response(self.get_serializer(luminaria).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def apagar_todas(self, request):
        for lum in Luminaria.objects.all():
            lum.is_on = False
            lum.save()
        return Response({'detail': 'Todas las luminarias apagadas.'}, status=status.HTTP_200_OK)


class EscenaViewSet(viewsets.ModelViewSet):
    queryset = Escena.objects.all()
    serializer_class = EscenaSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        escena = self.get_object()
        Escena.objects.update(active=False)
        escena.active = True
        escena.save()
        return Response({'active_scene': escena.name}, status=status.HTTP_200_OK)


class ReglaAntiOlvidoViewSet(viewsets.ModelViewSet):
    queryset = ReglaAntiOlvido.objects.all().order_by('-created_at')
    serializer_class = ReglaAntiOlvidoSerializer
    permission_classes = [IsAuthenticated]


class IncidenteViewSet(viewsets.ModelViewSet):
    queryset = IncidenteAntiOlvido.objects.all().order_by('-created_at')
    serializer_class = IncidenteSerializer
    permission_classes = [IsAuthenticated]

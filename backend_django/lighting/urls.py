from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LuminariaViewSet,
    EscenaViewSet,
    ReglaAntiOlvidoViewSet,
    IncidenteViewSet,
)

router = DefaultRouter()
router.register(r'luminarias', LuminariaViewSet, basename='luminaria')
router.register(r'escenas', EscenaViewSet, basename='escena')
router.register(r'reglas', ReglaAntiOlvidoViewSet, basename='regla')
router.register(r'incidentes', IncidenteViewSet, basename='incidente')

urlpatterns = [
    path('', include(router.urls)),
]

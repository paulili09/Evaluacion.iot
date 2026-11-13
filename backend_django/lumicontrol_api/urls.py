from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'ok',
        'service': 'LumiControl IoT Django REST API',
        'auth': 'SimpleJWT Bearer Token',
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='api_health'),
    # Endpoints oficiales de SimpleJWT (ES03 Req 3)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Rutas REST del dominio IoT registradas con DefaultRouter
    path('api/', include('lighting.urls')),
]

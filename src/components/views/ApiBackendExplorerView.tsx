import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  ShieldAlert,
  LogOut,
  Copy,
  Check,
  Terminal,
  Server,
  FileCode2,
} from 'lucide-react';
import {
  ApiLogEntry,
  AuthUser,
  getStoredAccessToken,
  getStoredRefreshToken,
  refreshJwt,
  subscribeApiLogs,
  testUnauthenticatedRequest,
} from '../../services/apiClient';

interface ApiBackendExplorerViewProps {
  user: AuthUser | null;
  onLogout: () => void;
  onNotify: (msg: string) => void;
}

type CodeTab = 'settings' | 'models' | 'serializers' | 'views' | 'urls' | 'curl';

const LIVE_ORIGIN =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

const DJANGO_SNIPPETS: Record<CodeTab, { filename: string; content: string }> = {
  settings: {
    filename: 'backend_django/lumicontrol_api/settings.py',
    content: `INSTALLED_APPS = [
    ...,
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'lighting',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Debe ir antes de CommonMiddleware
    'django.middleware.security.SecurityMiddleware',
    ...,
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS restrictivo por dominio autorizado (sin CORS_ALLOW_ALL_ORIGINS=True)
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv('CORS_ALLOWED_ORIGINS', '${LIVE_ORIGIN}').split(',')
    if origin.strip()
]`,
  },
  models: {
    filename: 'backend_django/lighting/models.py',
    content: `class Luminaria(models.Model):
    ROOM_CHOICES = [
        ('estudio', 'Estudio'),
        ('dormitorio', 'Dormitorio'),
        ('cocina', 'Cocina'),
        ('salon', 'Salón'),
    ]
    id = models.CharField(primary_key=True, max_length=32)
    name = models.CharField(max_length=120)
    room = models.CharField(max_length=80)
    room_type = models.CharField(max_length=20, choices=ROOM_CHOICES, default='estudio')
    is_on = models.BooleanField(default=False)
    brightness = models.PositiveIntegerField(default=80)
    color_temp = models.PositiveIntegerField(default=3000)
    power_watts = models.FloatField(default=0.0)
    pir_active = models.BooleanField(default=False)
    icon_type = models.CharField(max_length=20, default='lamp')
    updated_at = models.DateTimeField(auto_now=True)`,
  },
  serializers: {
    filename: 'backend_django/lighting/serializers.py',
    content: `class LuminariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Luminaria
        fields = [
            'id', 'name', 'room', 'room_type', 'is_on',
            'brightness', 'color_temp', 'power_watts',
            'pir_active', 'icon_type', 'updated_at',
        ]
        read_only_fields = ['id', 'power_watts', 'updated_at']

    def validate_brightness(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError('El brillo debe estar entre 0 y 100.')
        return value

    def validate_color_temp(self, value):
        if value < 2000 or value > 6500:
            raise serializers.ValidationError('La temperatura debe estar entre 2000K y 6500K.')
        return value`,
  },
  views: {
    filename: 'backend_django/lighting/views.py',
    content: `class LuminariaViewSet(viewsets.ModelViewSet):
    queryset = Luminaria.objects.all().order_by('id')
    serializer_class = LuminariaSerializer
    permission_classes = [IsAuthenticated]

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
        Luminaria.objects.update(is_on=False, power_watts=0)
        return Response({'detail': 'Todas las luminarias apagadas.'}, status=status.HTTP_200_OK)`,
  },
  urls: {
    filename: 'backend_django/lumicontrol_api/urls.py',
    content: `router = DefaultRouter()
router.register(r'luminarias', LuminariaViewSet, basename='luminaria')
router.register(r'escenas', EscenaViewSet, basename='escena')
router.register(r'reglas', ReglaAntiOlvidoViewSet, basename='regla')
router.register(r'incidentes', IncidenteViewSet, basename='incidente')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='api_health'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include(router.urls)),
]`,
  },
  curl: {
    filename: 'backend_django/scripts/test_api_curl.sh',
    content: `# 1. Acceso SIN token (debe retornar HTTP 401)
curl -i ${LIVE_ORIGIN}/api/luminarias/

# 2. Obtener par Access + Refresh JWT
curl -X POST ${LIVE_ORIGIN}/api/token/ \\
  -H "Content-Type: application/json" \\
  -d '{"username": "sofia", "password": "lumi2026"}'

# 3. CRUD protegido con Authorization: Bearer <access>
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \\
  ${LIVE_ORIGIN}/api/luminarias/

curl -X POST ${LIVE_ORIGIN}/api/luminarias/ \\
  -H "Authorization: Bearer <ACCESS_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Foco Terraza","room":"Terraza","roomType":"salon","brightness":75,"colorTemp":3000,"isOn":true}'`,
  },
};

export const ApiBackendExplorerView: React.FC<ApiBackendExplorerViewProps> = ({
  user,
  onLogout,
  onNotify,
}) => {
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [accessPreview, setAccessPreview] = useState<string>('');
  const [refreshPreview, setRefreshPreview] = useState<string>('');
  const [unauthResult, setUnauthResult] = useState<{ status: number; detail: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('settings');
  const [copied, setCopied] = useState(false);

  const syncTokenPreviews = () => {
    const a = getStoredAccessToken() || '';
    const r = getStoredRefreshToken() || '';
    setAccessPreview(a ? `${a.slice(0, 28)}...${a.slice(-16)}` : 'Sin token');
    setRefreshPreview(r ? `${r.slice(0, 28)}...${r.slice(-16)}` : 'Sin token');
  };

  useEffect(() => {
    syncTokenPreviews();
    return subscribeApiLogs(setLogs);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshJwt();
      syncTokenPreviews();
      onNotify('Access Token renovado vía POST /api/token/refresh/');
    } catch {
      onNotify('Error al refrescar el token JWT');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTest401 = async () => {
    const res = await testUnauthenticatedRequest();
    setUnauthResult(res);
    onNotify(`Prueba sin Authorization devolvió HTTP ${res.status}`);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(DJANGO_SNIPPETS[activeCodeTab].content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6 pb-20 text-left">
      {/* Header summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            API REST, SimpleJWT & Entregable Django
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Verificación en vivo de autenticación Bearer, políticas CORS y código fuente Django REST Framework.
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 self-start cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión JWT</span>
        </button>
      </div>

      {/* Row 1: JWT Session + 401 Security Probe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-[#101728] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Sesión JWT Activa</h2>
                <p className="text-xs text-slate-400">
                  Usuario: <span className="text-slate-200 font-semibold">{user?.full_name || user?.username}</span> · Rol: {user?.role}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-semibold">Bearer Auth</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="p-3 rounded-xl bg-[#090D18] border border-slate-800">
              <span className="text-[11px] font-sans text-slate-400 block mb-1">Access Token (exp. 30m)</span>
              <span className="text-amber-300 break-all">{accessPreview}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#090D18] border border-slate-800">
              <span className="text-[11px] font-sans text-slate-400 block mb-1">Refresh Token (exp. 7d)</span>
              <span className="text-cyan-300 break-all">{refreshPreview}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={isRefreshing}
              onClick={handleRefresh}
              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refrescar Token (/api/token/refresh/)</span>
            </button>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#101728] border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Prueba de Protección (HTTP 401)</h2>
              <p className="text-xs text-slate-400">
                Envía <code className="text-slate-200">GET /api/luminarias/</code> omitiendo el header Authorization.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTest401}
            className="w-full py-2.5 px-4 rounded-xl bg-[#162038] hover:bg-[#1C2947] border border-slate-700 text-slate-100 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Server className="w-4 h-4 text-rose-400" />
            <span>Ejecutar Petición Sin Token (Verificar 401)</span>
          </button>

          {unauthResult ? (
            <div className="p-3.5 rounded-xl bg-[#090D18] border border-rose-500/40 font-mono text-xs space-y-1">
              <div className="text-rose-400 font-bold">HTTP {unauthResult.status} Unauthorized</div>
              <pre className="text-slate-300 whitespace-pre-wrap">
                {JSON.stringify({ detail: unauthResult.detail }, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[#090D18] border border-slate-800 text-xs text-slate-400">
              Todas las rutas bajo <code className="text-slate-300">/api/*</code> (excepto <code className="text-slate-300">/api/health/</code> y <code className="text-slate-300">/api/token/*</code>) exigen <code className="text-slate-300">IsAuthenticated</code> y restringen CORS a orígenes autorizados.
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Live Axios Telemetry Table */}
      <div className="p-5 rounded-2xl bg-[#101728] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Registro HTTP Axios en Vivo</h2>
          </div>
          <span className="text-xs text-slate-400">{logs.length} peticiones recientes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-sans">
                <th className="py-2 pr-3">Hora</th>
                <th className="py-2 pr-3">Método</th>
                <th className="py-2 pr-3">Endpoint</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Auth</th>
                <th className="py-2">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-500 font-sans">
                    Realiza cualquier acción CRUD para ver las peticiones HTTP reales aquí.
                  </td>
                </tr>
              ) : (
                logs.map((entry) => (
                  <tr key={entry.id} className="text-slate-300">
                    <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{entry.timestamp}</td>
                    <td className="py-2 pr-3 font-bold text-amber-300">{entry.method}</td>
                    <td className="py-2 pr-3 text-slate-200 whitespace-nowrap">{entry.url}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`font-bold ${
                          entry.status >= 200 && entry.status < 300
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {entry.hasBearer ? 'Bearer JWT' : 'Sin Token'}
                    </td>
                    <td className="py-2 font-sans text-slate-400">
                      {entry.summary} ({entry.durationMs}ms)
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: Django REST Framework Code Explorer */}
      <div className="p-5 rounded-2xl bg-[#101728] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">
              Arquitectura Backend Django + SimpleJWT + CORS (ES03)
            </h2>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 self-start cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar archivo'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'settings', label: 'settings.py' },
              { id: 'models', label: 'models.py' },
              { id: 'serializers', label: 'serializers.py' },
              { id: 'views', label: 'views.py' },
              { id: 'urls', label: 'urls.py' },
              { id: 'curl', label: 'test_api_curl.sh' },
            ] as { id: CodeTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCodeTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                activeCodeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-[#090D18] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-[#070B14] border border-slate-800 overflow-hidden">
          <div className="px-4 py-2 bg-[#0D1322] border-b border-slate-800 text-[11px] font-mono text-slate-400">
            {DJANGO_SNIPPETS[activeCodeTab].filename}
          </div>
          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
            {DJANGO_SNIPPETS[activeCodeTab].content}
          </pre>
        </div>
      </div>
    </div>
  );
};

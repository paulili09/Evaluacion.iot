# LumiControl IoT — Backend API REST (Django REST Framework + SimpleJWT + CORS)

Proyecto backend y cliente web full-stack desarrollado para la **Evaluación Sumativa 3 (ES03 - Programación Backend)**.

## URL Pública de la API REST y Cliente
- **API & Cliente Web en vivo:** `https://ais-pre-mvtv43uehfigzrem2hnraj-547993537681.us-west1.run.app`
- **Health Endpoint (`AllowAny`):** `/api/health/`
- **JWT Auth Endpoints (`AllowAny`):** `/api/token/` y `/api/token/refresh/`

## Arquitectura de Seguridad (SimpleJWT + CORS)
1. **Autenticación JWT (`JWTAuthentication`)**: Todos los endpoints CRUD (`/api/luminarias/`, `/api/escenas/`, `/api/reglas/`, `/api/incidentes/`, `/api/telemetria/`) exigen encabezado `Authorization: Bearer <access_token>` mediante `IsAuthenticated`.
2. **CORS Restrictivo (`django-cors-headers`)**: Se permiten explícitamente los orígenes declarados en `CORS_ALLOWED_ORIGINS` (`localhost:3000`, dominio de despliegue). No se utiliza `CORS_ALLOW_ALL_ORIGINS=True`.
3. **Despliegue Vercel + Supabase**: Configuración preparada mediante `DATABASE_URL` con SSL (`sslmode=require`) y variables de entorno en `.env.example`.

## Endpoints Disponibles
| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health/` | `AllowAny` | Estado de la API y configuración JWT/CORS |
| `POST` | `/api/token/` | `AllowAny` | Obtiene par `access` + `refresh` JWT |
| `POST` | `/api/token/refresh/` | `AllowAny` | Renueva `access` token |
| `GET/POST` | `/api/luminarias/` | `IsAuthenticated` | Listar y crear luminarias IoT |
| `GET/PATCH/DELETE` | `/api/luminarias/:id/` | `IsAuthenticated` | Detalle, actualización y borrado |
| `POST` | `/api/luminarias/:id/toggle/` | `IsAuthenticated` | Conmutación de relé ESP32 |
| `GET/POST/PATCH/DELETE` | `/api/reglas/` | `IsAuthenticated` | Reglas Anti-Olvido PIR/Geocerca |
| `GET/POST` | `/api/escenas/` | `IsAuthenticated` | Escenas circadianas y activación |

## Ejecución de Pruebas `curl`
```bash
chmod +x backend_django/scripts/test_api_curl.sh
./backend_django/scripts/test_api_curl.sh http://localhost:3000
```

# VRIN Web

Frontend Angular del SGR-VRIN. La compilación de producción utiliza `/api` y `/sanctum` en el mismo dominio del frontend; Vercel reenvía ambas rutas a Laravel mediante las reglas de `vercel.json`.

## Despliegue desde GitHub a Vercel

1. Sube este repositorio (`ksvdevs/vrin-web`) a GitHub. El repositorio de Laravel es independiente; Vercel solo compila el frontend.
2. Importa `ksvdevs/vrin-web` en Vercel. Selecciona la raíz del repositorio como **Root Directory**. `vercel.json` fija el preset Angular, `npm run build` y `dist/vrin-web/browser`; `package.json` fija Node.js 24.
3. Comprueba que el backend, la base de datos y el túnel estén activos. Ejecuta `php artisan serve --host=127.0.0.1 --port=8000` y `cloudflared tunnel --url http://127.0.0.1:8000`. Verifica `http://127.0.0.1:8000/api/ping` y la URL pública del túnel con `/api/ping`.
4. Antes de iniciar sesión, incluye el dominio **exacto** de producción de Vercel (sin `https://`) en `SANCTUM_STATEFUL_DOMAINS` del `.env` de Laravel. La configuración actual ya incluye `vrin-web.vercel.app`; si Vercel asigna otro dominio, actualízala. Mantén `SESSION_DOMAIN=` vacío, usa `APP_DEBUG=false` y ejecuta `php artisan config:clear`. Para que las cookies de la sesión pública solo viajen por HTTPS, configura `SESSION_SECURE_COOKIE=true`.
5. Comprueba en el dominio de Vercel `/api/ping`, `/login`, el inicio de sesión y una ruta interna abierta directamente, por ejemplo `/expedientes`. Si usas dominios de Preview, añade cada dominio que necesite autenticación a `SANCTUM_STATEFUL_DOMAINS`.

La URL del túnel actual es `https://fragrance-whenever-findings-compare.trycloudflare.com`. Está configurada en `vercel.json` para producción y en `proxy.conf.json` para `ng serve`. El valor `apiUrl: '/api'` de ambos archivos de entorno mantiene las peticiones en el dominio del frontend.

Los Quick Tunnels de Cloudflare son temporales. Si el túnel cambia, actualiza su URL en `vercel.json`, `proxy.conf.json` y `APP_URL` de Laravel; vuelve a desplegar Vercel y reinicia `ng serve` si lo usas. La máquina que ejecuta Laravel, la base de datos y `cloudflared` debe permanecer encendida para que la aplicación funcione. Para disponibilidad estable, utiliza un backend alojado y un dominio o túnel estable.

El `.env` de Laravel no se sube a GitHub y tampoco configura automáticamente Vercel. Si utilizas Google Drive OAuth desde fuera de tu máquina, configura `GOOGLE_DRIVE_REDIRECT_URI` con una URL pública válida del backend y registra esa misma URL en Google Cloud.

## Desarrollo local

```bash
npm install
npm start
```

Abre `http://localhost:4200`. El servidor de Angular usa `proxy.conf.json` para reenviar `/api` y `/sanctum` al túnel. Reinicia `npm start` después de modificar ese archivo. Ejecuta `npm run build` para verificar la compilación de producción.

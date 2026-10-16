# VRIN Web

Frontend Angular del SGR-VRIN. La compilación de producción utiliza `/api` y `/sanctum` en el mismo dominio del frontend; Vercel reenvía ambas rutas a Laravel mediante las reglas de `vercel.json`.

## Despliegue desde GitHub a Vercel

1. Sube este repositorio (`ksvdevs/vrin-web`) a GitHub. El repositorio de Laravel es independiente; Vercel solo compila el frontend.
2. Importa `ksvdevs/vrin-web` en Vercel. Selecciona la raíz del repositorio como **Root Directory**. `vercel.json` fija el preset Angular, `npm run build` y `dist/vrin-web/browser`; `package.json` fija Node.js 24.
3. Comprueba que el backend, la base de datos y el túnel estén activos. Ejecuta `php artisan serve --host=127.0.0.1 --port=8000` y `cloudflared tunnel --url http://127.0.0.1:8000`. Verifica `http://127.0.0.1:8000/api/ping` y la URL pública del túnel con `/api/ping`.
4. Antes de iniciar sesión, incluye el dominio **exacto** de producción de Vercel (sin `https://`) en `SANCTUM_STATEFUL_DOMAINS` del `.env` de Laravel. La configuración actual ya incluye `vrin-web.vercel.app`; si Vercel asigna otro dominio, actualízala. Mantén `SESSION_DOMAIN=` vacío, usa `APP_DEBUG=false` y ejecuta `php artisan config:clear`. Para que las cookies de la sesión pública solo viajen por HTTPS, configura `SESSION_SECURE_COOKIE=true`.
5. Comprueba en el dominio de Vercel `/api/ping`, `/login`, el inicio de sesión y una ruta interna abierta directamente, por ejemplo `/expedientes`. Si usas dominios de Preview, añade cada dominio que necesite autenticación a `SANCTUM_STATEFUL_DOMAINS`.

`npm start` envía `/api` y `/sanctum` a Laravel local. Para usar un túnel desde Angular local, ejecuta `npm run start:tunnel` con `VRIN_API_TUNNEL_URL` apuntando a la URL HTTPS vigente. El valor `apiUrl: '/api'` mantiene las peticiones en el dominio del frontend.

Los Quick Tunnels de Cloudflare son temporales. `vercel.json` contiene una URL fija para el despliegue: reemplázala en las reglas de `/api` y `/sanctum` por la URL HTTPS vigente antes de desplegar y vuelve a desplegar Vercel cuando cambie. Ajusta también `APP_URL` de Laravel si generas enlaces públicos desde el backend. La máquina que ejecuta Laravel, la base de datos y `cloudflared` debe permanecer encendida para que la aplicación funcione. Para disponibilidad estable, utiliza un backend alojado y un dominio o túnel estable.

El `.env` de Laravel no se sube a GitHub y tampoco configura automáticamente Vercel. Si utilizas Google Drive OAuth desde fuera de tu máquina, configura `GOOGLE_DRIVE_REDIRECT_URI` con una URL pública válida del backend y registra esa misma URL en Google Cloud.

## Desarrollo local

```bash
cd vrin-api
php artisan serve --host=127.0.0.1 --port=8000
```

En otra terminal:

```bash
cd vrin-web
npm install
npm start
```

Abre `http://localhost:4200`. `proxy.conf.json` reenvía `/api` y `/sanctum` a `http://127.0.0.1:8000`. Verifica `http://localhost:4200/api/ping` antes de iniciar sesión. Si `SESSION_SECURE_COOKIE=true` en Laravel, usa `false` para el desarrollo local por HTTP y ejecuta `php artisan config:clear`. Reinicia `npm start` después de modificar el proxy. En PowerShell, si la política de ejecución bloquea `npm.ps1`, usa `npm.cmd`.

## Desarrollo con túnel

Con Laravel activo en el puerto 8000, inicia `cloudflared tunnel --url http://127.0.0.1:8000`. Copia la URL HTTPS que muestre el comando. En PowerShell:

```powershell
$env:VRIN_API_TUNNEL_URL = 'https://TU-TUNEL.trycloudflare.com'
cd vrin-web
npm.cmd run start:tunnel
```

Comprueba `https://TU-TUNEL.trycloudflare.com/api/ping` y `http://localhost:4200/api/ping`. `proxy.tunnel.conf.cjs` usa esa variable para ambas rutas; no necesita editarse cuando cambie el túnel. Mantén `localhost:4200` en `SANCTUM_STATEFUL_DOMAINS` de Laravel y ejecuta `php artisan config:clear` si cambias su `.env`. Ejecuta `npm run build` para verificar la compilación de producción.

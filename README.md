# VrinWeb

## Despliegue desde GitHub en Vercel

1. Confirma la compilación con `npm run build`. Desde este directorio, sube los cambios con `git add .`, `git commit -m "Preparar despliegue en Vercel"` y `git push origin main`.
2. En Vercel, importa el repositorio `ksvdevs/vrin-web` y selecciona **Angular**. La raíz del proyecto es la raíz del repositorio.
3. Usa Node.js 24 y `npm run build`. `vercel.json` ya define la salida `dist/vrin-web/browser`, el proxy al backend y la ruta de respaldo para Angular.
4. Comprueba `/login`, una ruta interna abierta directamente y `/api/ping` en el dominio de Vercel.

### Backend local para la presentación

El build de producción solicita `/api` y `/sanctum` desde el dominio de Vercel. `vercel.json` reenvía estas rutas a `https://centered-christina-lady-antivirus.trycloudflare.com`, el Quick Tunnel actual.

1. Mantén MySQL encendido y Laravel en `127.0.0.1:8000` (`php artisan serve --host=127.0.0.1 --port=8000`). Comprueba `http://127.0.0.1:8000/api/ping`.
2. Mantén abierto `cloudflared tunnel --url http://localhost:8000`. Comprueba `https://centered-christina-lady-antivirus.trycloudflare.com/api/ping`.
3. Cuando Vercel asigne el dominio del frontend, agrégalo sin `https://` a `SANCTUM_STATEFUL_DOMAINS` en el `.env` de Laravel; conserva también `localhost:4200,127.0.0.1:4200` si usas el frontend local. Mantén `SESSION_DOMAIN=` vacío y `APP_DEBUG=false`. Ejecuta `php artisan config:clear`.

El Quick Tunnel deja de funcionar al cerrar `cloudflared` y puede generar otra URL al reiniciarlo. Si cambia, actualiza las dos reglas de `vercel.json`, confirma `APP_URL` en Laravel y vuelve a desplegar Vercel. La PC debe permanecer encendida y conectada a Internet durante la presentación.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

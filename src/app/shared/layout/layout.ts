import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import type { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MenuModule],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
})
export class LayoutComponent {
  auth = inject(AuthService);
  router = inject(Router);
  private readonly rutaActual = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  readonly menuUsuario: MenuItem[] = [
    { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => this.cerrarSesion() },
  ];
  isPersonalOpen = true;
  menuContraido = false;

  togglePersonal() {
    if (this.menuContraido) {
      this.menuContraido = false;
      this.isPersonalOpen = true;
      return;
    }
    this.isPersonalOpen = !this.isPersonalOpen;
  }

  get usuario() {
    return this.auth.usuarioActual();
  }

  get inicial() {
    return (
      this.usuario?.nombre
        ?.trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase() || 'U'
    );
  }

  get seccionActual() {
    return this.rutaActual().startsWith('/expedientes') ? 'Investigación' : 'General';
  }

  get paginaActual() {
    const ruta = this.rutaActual().split('?')[0];
    if (ruta.startsWith('/expedientes')) return 'Artículos financiados';
    if (ruta.startsWith('/catalogos/docentes')) return 'Docentes';
    if (ruta.startsWith('/plantillas')) return 'Gestor de plantillas';
    if (ruta.startsWith('/roles')) return 'Roles';
    if (ruta.startsWith('/usuarios')) return 'Usuarios';
    return 'Panel de control';
  }

  get esAdmin() {
    return this.usuario?.rol_codigo === 'ADMINISTRADOR_GENERAL';
  }

  cerrarSesion() {
    this.auth.salir();
  }
}

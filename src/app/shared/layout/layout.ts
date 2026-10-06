import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MenuModule } from 'primeng/menu';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MenuModule],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
})
export class LayoutComponent implements OnInit {
  auth = inject(AuthService);
  router = inject(Router);
  isPersonalOpen = true;
  menuContraido = false;

  ngOnInit() {
    if (this.router.url.includes('/roles') || this.router.url.includes('/usuarios')) {
      this.isPersonalOpen = true;
    }
  }

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
    return this.router.url.startsWith('/expedientes') ? 'Investigación' : 'General';
  }

  get paginaActual() {
    const ruta = this.router.url.split('?')[0];
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

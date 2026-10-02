import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MenuModule } from 'primeng/menu';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MenuModule],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss']
})
export class LayoutComponent implements OnInit {
  auth = inject(AuthService);
  router = inject(Router);
  isPersonalOpen = false;

  ngOnInit() {
    if (this.router.url.includes('/roles') || this.router.url.includes('/usuarios')) {
      this.isPersonalOpen = true;
    }
  }

  togglePersonal() {
    this.isPersonalOpen = !this.isPersonalOpen;
  }

  get usuario() {
    return this.auth.usuarioActual();
  }

  get inicial() {
    return this.usuario?.nombre?.charAt(0).toUpperCase() || 'U';
  }

  get esAdmin() {
    return this.usuario?.rol_codigo === 'ADMINISTRADOR_GENERAL';
  }

  cerrarSesion() {
    this.auth.salir();
  }
}

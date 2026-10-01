import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MenuModule } from 'primeng/menu';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MenuModule],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss']
})
export class LayoutComponent {
  auth = inject(AuthService);

  get usuario() {
    return this.auth.usuarioActual();
  }

  get inicial() {
    return this.usuario?.nombre?.charAt(0).toUpperCase() || 'U';
  }

  get esAdmin() {
    return this.usuario?.rol === 'ADMINISTRADOR';
  }

  cerrarSesion() {
    this.auth.salir();
  }
}

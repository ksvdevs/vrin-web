import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

import { Rol } from '../../core/models/usuario.model';
import { ApiService, PingResponse } from '../../core/services/api.service';
import { DevAuthService } from '../../core/services/dev-auth.service';

@Component({
  selector: 'app-inicio',
  imports: [Button, Card, RouterLink, Tag],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio implements OnInit {
  protected readonly auth = inject(DevAuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly ping = signal<PingResponse | null>(null);
  protected readonly pingError = signal<string | null>(null);

  protected readonly puedeRegistrarExpedientes = computed(() => {
    const rol = this.auth.usuarioActual()?.rol;
    return rol === 'ADMINISTRADOR' || rol === 'SECRETARIA';
  });

  protected readonly esAdmin = computed(() => this.auth.usuarioActual()?.rol === 'ADMINISTRADOR');

  ngOnInit(): void {
    this.auth.cargarUsuarioActual().subscribe();
    this.api.ping().subscribe({
      next: (respuesta) => this.ping.set(respuesta),
      error: () => this.pingError.set('No se pudo conectar con la API (/ping).'),
    });
  }

  protected cambiarUsuario(): void {
    this.auth.salir();
    this.router.navigateByUrl('/login');
  }

  protected severidadRol(rol: Rol): 'danger' | 'info' | 'success' {
    switch (rol) {
      case 'ADMINISTRADOR':
        return 'danger';
      case 'SECRETARIA':
        return 'info';
      case 'CALIDAD':
        return 'success';
    }
  }
}

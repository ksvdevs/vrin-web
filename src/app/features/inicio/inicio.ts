import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

import { ApiService, PingResponse } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inicio',
  imports: [Button, Card, RouterLink, Tag],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  protected readonly ping = signal<PingResponse | null>(null);
  protected readonly pingError = signal<string | null>(null);

  protected readonly puedeRegistrarExpedientes = computed(() => {
    const rolCodigo = this.auth.usuarioActual()?.rol_codigo;
    return rolCodigo === 'ADMINISTRADOR_GENERAL' || rolCodigo === 'SECRETARIA';
  });

  protected readonly esAdmin = computed(() => this.auth.usuarioActual()?.rol_codigo === 'ADMINISTRADOR_GENERAL');

  ngOnInit(): void {
    this.auth.verificarSesion().subscribe();
    this.api.ping().subscribe({
      next: (respuesta) => this.ping.set(respuesta),
      error: () => this.pingError.set('No se pudo conectar con la API (/ping).'),
    });
  }

  protected cambiarUsuario(): void {
    this.auth.salir();
  }

  protected severidadRol(rolCodigo: string): 'danger' | 'info' | 'success' {
    switch (rolCodigo) {
      case 'ADMINISTRADOR_GENERAL':
        return 'danger';
      case 'SECRETARIA':
        return 'info';
      default:
        return 'success';
    }
  }
}

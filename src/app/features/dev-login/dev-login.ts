import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';

import { Rol, Usuario } from '../../core/models/usuario.model';
import { DevAuthService } from '../../core/services/dev-auth.service';

@Component({
  selector: 'app-dev-login',
  imports: [Button, Card, Tag],
  templateUrl: './dev-login.html',
  styleUrl: './dev-login.scss',
})
export class DevLogin implements OnInit {
  private readonly auth = inject(DevAuthService);
  private readonly router = inject(Router);

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.auth.listarUsuariosDev().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo conectar con la API. Verifica que el backend esté en ejecución.');
        this.cargando.set(false);
      },
    });
  }

  protected ingresarComo(usuario: Usuario): void {
    this.auth.entrarComo(usuario.id);
    this.router.navigateByUrl('/');
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

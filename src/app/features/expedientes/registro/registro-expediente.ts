import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { AutoComplete, type AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { Toast } from 'primeng/toast';
import { Tooltip } from 'primeng/tooltip';

import { Docente } from '../../../core/models/docente.model';
import {
  BASES_INDEXADORAS,
  CUARTILES,
  type BaseIndexadora,
  type Cuartil,
  type EstadoExpediente,
  type Expediente,
  type ExpedientePayload,
  type OcrDatosCarta,
  type RespuestaDuplicidad,
  type ResultadoOcr,
  esRespuestaDuplicidad,
} from '../../../core/models/expediente.model';
import { AuthService } from '../../../core/services/auth.service';
import { ArchivoService } from '../../../core/services/archivo.service';
import { DocenteService } from '../../../core/services/docente.service';
import {
  ArchivoExpediente,
  ExpedienteService,
} from '../../../core/services/expediente.service';
import { DocenteFormulario } from '../../../shared/docente-formulario/docente-formulario';

interface SugerenciaDocente {
  label: string;
  valor: Docente;
}

const EXTENSIONES_PERMITIDAS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
const EXTENSIONES_OCR = ['pdf', 'jpg', 'jpeg', 'png'];
const TAMANO_MAXIMO = 25 * 1024 * 1024; // 25 MB (replica ck_arch_tamano)

@Component({
  selector: 'app-registro-expediente',
  imports: [
    AutoComplete,
    Button,
    ConfirmDialog,
    DatePicker,
    DocenteFormulario,
    InputNumber,
    InputText,
    ReactiveFormsModule,
    Select,
    Tag,
    Textarea,
    Toast,
    Tooltip,
  ],
  templateUrl: './registro-expediente.html',
  styleUrl: './registro-expediente.scss',
})
export class RegistroExpediente implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly docenteService = inject(DocenteService);
  private readonly archivoService = inject(ArchivoService);
  private readonly expedienteService = inject(ExpedienteService);
  private readonly mensajes = inject(MessageService);
  private readonly confirmacion = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute);

  protected readonly editandoId = signal<number | null>(null);
  protected readonly guardando = signal(false);
  protected readonly expedienteCreado = signal<Expediente | null>(null);
  protected readonly cartaSubida = signal<ArchivoExpediente | null>(null);
  protected readonly archivoSeleccionado = signal<File | null>(null);
  protected readonly subiendo = signal(false);
  protected readonly analizando = signal(false);
  protected readonly resultadoOcr = signal<ResultadoOcr | null>(null);

  protected readonly dialogoDocenteVisible = signal(false);

  protected readonly sugerencias = signal<SugerenciaDocente[]>([]);
  private readonly docenteSeleccionado = signal<Docente | null>(null);
  private readonly busquedaDocente$ = new Subject<string>();
  private suscripcionBusqueda?: Subscription;
  private suscripcionDocente?: Subscription;

  protected readonly opcionesBase = BASES_INDEXADORAS.map((b) => ({ label: b, value: b }));
  protected readonly opcionesCuartil = CUARTILES.map((c) => ({ label: c, value: c }));
  protected readonly opcionesDocumentos = [
    { label: 'Sí', value: true },
    { label: 'No', value: false },
  ];

  protected readonly gradoDocente = computed(() => this.docenteSeleccionado()?.grado ?? null);
  protected readonly tipoContratoDocente = computed(() => {
    const tipo = this.docenteSeleccionado()?.tipo_contrato;
    return tipo === 'NOMBRADO' ? 'Nombrado' : tipo === 'CONTRATADO' ? 'Contratado' : null;
  });
  protected readonly facultadDocente = computed(
    () => this.docenteSeleccionado()?.escuela?.facultad?.nombre ?? null,
  );
  protected readonly escuelaDocente = computed(
    () => this.docenteSeleccionado()?.escuela?.nombre ?? null,
  );

  protected readonly formulario = this.fb.group({
    carta_docente_numero: ['', [Validators.required, Validators.maxLength(80)]],
    carta_docente_fecha: [null as Date | null, Validators.required],
    docente: [null as SugerenciaDocente | null, [Validators.required, this.docenteValido]],
    revista: ['', [Validators.required, Validators.maxLength(255)]],
    base_indexadora: [null as BaseIndexadora | null, Validators.required],
    cuartil: [null as Cuartil | null, Validators.required],
    titulo: ['', Validators.required],
    monto_solicitado: [null as number | null, [Validators.required, Validators.min(0.01)]],
    doi: [''],
    documentos_completos: [null as boolean | null, Validators.required],
  });

  ngOnInit(): void {
    this.auth.verificarSesion().subscribe();

    const idStr = this.route.snapshot.paramMap.get('id');
    if (idStr) {
      const id = Number(idStr);
      this.editandoId.set(id);
      this.cargarParaEdicion(id);
    }

    this.suscripcionBusqueda = this.busquedaDocente$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((q) => {
        if (!q) {
          this.sugerencias.set([]);
          return;
        }
        this.docenteService.listar(q).subscribe({
          next: (docentes) =>
            this.sugerencias.set(
              docentes.map((d) => ({ label: this.etiquetaDocente(d), valor: d })),
            ),
          error: () => this.sugerencias.set([]),
        });
      });

    this.suscripcionDocente = this.formulario.controls.docente.valueChanges.subscribe((valor) => {
      this.docenteSeleccionado.set(
        valor && typeof valor === 'object' && 'valor' in valor ? valor.valor : null,
      );
    });
  }

  ngOnDestroy(): void {
    this.suscripcionBusqueda?.unsubscribe();
    this.suscripcionDocente?.unsubscribe();
  }

  protected alBuscarDocente(event: AutoCompleteCompleteEvent): void {
    this.busquedaDocente$.next(event.query.trim());
  }

  protected abrirNuevoDocente(): void {
    this.dialogoDocenteVisible.set(true);
  }

  protected alGuardarDocenteNuevo(docente: Docente): void {
    const sugerencia: SugerenciaDocente = { label: this.etiquetaDocente(docente), valor: docente };
    this.sugerencias.set([sugerencia]);
    this.formulario.controls.docente.setValue(sugerencia);
  }

  private cargarParaEdicion(id: number): void {
    this.expedienteService.obtener(id).subscribe({
      next: (detalle) => {
        const docente = detalle.docente;
        const sugerencia: SugerenciaDocente = { label: docente?.nombre_completo ?? '', valor: docente as any };
        
        let fechaCarta: Date | null = null;
        if (detalle.carta_docente_fecha) {
          const [anio, mes, dia] = detalle.carta_docente_fecha.split('-').map(Number);
          fechaCarta = new Date(anio, mes - 1, dia);
        }

        this.formulario.patchValue({
          carta_docente_numero: detalle.carta_docente_numero,
          carta_docente_fecha: fechaCarta,
          docente: sugerencia,
          revista: detalle.articulo?.revista,
          base_indexadora: detalle.articulo?.base_indexadora as BaseIndexadora,
          cuartil: detalle.articulo?.cuartil as Cuartil,
          titulo: detalle.articulo?.titulo,
          monto_solicitado: detalle.articulo?.monto_solicitado,
          doi: detalle.articulo?.doi,
          documentos_completos: detalle.documentos_completos,
        });

        const cartaDocente = detalle.archivos?.find((a: any) => a.tipo === 'CARTA_DOCENTE');
        if (cartaDocente) {
          this.cartaSubida.set({
            ...cartaDocente,
            sha256: cartaDocente.sha256 ?? undefined,
            mime: cartaDocente.mime ?? undefined
          });
        }
      },
      error: () => {
        this.mensajes.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el expediente para edición.' });
        this.router.navigate(['/expedientes']);
      }
    });
  }

  protected cancelar(): void {
    this.router.navigate(['/expedientes']);
  }

  protected guardar(): void {
    if (this.formulario.invalid || this.guardando()) {
      this.formulario.markAllAsTouched();
      return;
    }
    const payload = this.construirPayload();
    if (!payload) {
      return;
    }
    this.enviar(payload);
  }

  protected seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo) {
      return;
    }
    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    if (!EXTENSIONES_PERMITIDAS.includes(extension)) {
      this.mensajes.add({
        severity: 'error',
        summary: 'Archivo no permitido',
        detail: 'La carta debe ser PDF, DOC, DOCX, JPG o PNG.',
      });
      return;
    }
    if (archivo.size > TAMANO_MAXIMO) {
      this.mensajes.add({
        severity: 'error',
        summary: 'Archivo muy grande',
        detail: 'La carta no puede superar los 25 MB.',
      });
      return;
    }
    this.archivoSeleccionado.set(archivo);
  }

  protected seleccionarCartaOcr(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo) {
      return;
    }
    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    if (!EXTENSIONES_OCR.includes(extension)) {
      this.mensajes.add({
        severity: 'error',
        summary: 'Archivo no permitido',
        detail: 'Para el análisis IA la carta debe ser PDF, JPG o PNG.',
      });
      return;
    }
    if (archivo.size > TAMANO_MAXIMO) {
      this.mensajes.add({
        severity: 'error',
        summary: 'Archivo muy grande',
        detail: 'La carta no puede superar los 25 MB.',
      });
      return;
    }
    this.archivoSeleccionado.set(archivo);
    this.resultadoOcr.set(null);
    this.analizarCarta();
  }

  protected analizarCarta(): void {
    const archivo = this.archivoSeleccionado();
    if (!archivo || this.analizando()) {
      return;
    }
    this.analizando.set(true);
    this.expedienteService.analizarCarta(archivo).subscribe({
      next: (resultado) => {
        this.analizando.set(false);
        this.resultadoOcr.set(resultado);
        this.aplicarOcr(resultado.datos);
      },
      error: (error) => {
        this.analizando.set(false);
        this.resultadoOcr.set(null);
        this.mensajes.add({
          severity: 'warn',
          summary: 'Análisis IA no disponible',
          detail: `${this.detalleError(error)} Puede completar el formulario manualmente.`,
        });
      },
    });
  }

  protected cerrarBannerOcr(): void {
    this.resultadoOcr.set(null);
  }

  private aplicarOcr(datos: OcrDatosCarta): void {
    let fechaCarta: Date | null = null;
    if (datos.carta_docente_fecha) {
      const [anio, mes, dia] = datos.carta_docente_fecha.split('-').map(Number);
      if (anio && mes && dia) {
        fechaCarta = new Date(anio, mes - 1, dia);
      }
    }

    this.formulario.patchValue({
      carta_docente_numero: datos.carta_docente_numero || undefined,
      carta_docente_fecha: fechaCarta ?? undefined,
      titulo: datos.titulo || undefined,
      revista: datos.revista || undefined,
      base_indexadora: BASES_INDEXADORAS.includes(datos.base_indexadora as BaseIndexadora)
        ? (datos.base_indexadora as BaseIndexadora)
        : undefined,
      cuartil: CUARTILES.includes(datos.cuartil as Cuartil)
        ? (datos.cuartil as Cuartil)
        : undefined,
      monto_solicitado:
        datos.monto_solicitado && datos.monto_solicitado > 0
          ? Number(datos.monto_solicitado)
          : undefined,
      doi: datos.doi || undefined,
    });

    this.buscarDocentePorDni(datos.docente_dni);
  }

  private buscarDocentePorDni(dni?: string | null): void {
    const limpio = dni?.trim();
    if (!limpio) {
      return;
    }
    this.docenteService.listar(limpio).subscribe({
      next: (docentes) => {
        const exacto =
          docentes.find((d) => d.dni === limpio) ?? (docentes.length === 1 ? docentes[0] : null);
        if (!exacto) {
          this.mensajes.add({
            severity: 'warn',
            summary: 'Docente no encontrado',
            detail: `La carta indica el DNI ${limpio}, pero no existe en el padrón. Regístrelo o selecciónelo manualmente.`,
          });
          return;
        }
        const sugerencia: SugerenciaDocente = {
          label: this.etiquetaDocente(exacto),
          valor: exacto,
        };
        this.sugerencias.set([sugerencia]);
        this.formulario.controls.docente.setValue(sugerencia);
      },
      error: () => {},
    });
  }

  protected subirCarta(): void {
    const expediente = this.expedienteCreado();
    const archivo = this.archivoSeleccionado();
    if (!expediente || !archivo || this.subiendo()) {
      return;
    }
    this.subiendo.set(true);
    this.expedienteService.subirCarta(expediente.id, archivo).subscribe({
      next: (guardado) => {
        this.subiendo.set(false);
        this.cartaSubida.set(guardado);
        this.archivoSeleccionado.set(null);
        this.mensajes.add({
          severity: 'success',
          summary: 'Carta adjuntada',
          detail: guardado.nombre_original,
        });
      },
      error: (error) => {
        this.subiendo.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo adjuntar la carta',
          detail: this.detalleError(error),
        });
      },
    });
  }

  protected finalizar(): void {
    this.router.navigate(['/']);
  }

  protected verCarta(): void {
    const id = this.editandoId();
    const carta = this.cartaSubida();
    if (!id || !carta) {
      return;
    }
    this.archivoService.obtenerBlob(id, carta.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo abrir la carta',
          detail: 'Intenta nuevamente.',
        });
      },
    });
  }

  protected descargarCarta(): void {
    const id = this.editandoId();
    const carta = this.cartaSubida();
    if (!id || !carta) {
      return;
    }
    this.archivoService.obtenerBlob(id, carta.id, true).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = carta.nombre_original;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.mensajes.add({
          severity: 'error',
          summary: 'Descarga fallida',
          detail: 'No se pudo descargar la carta del docente.',
        });
      },
    });
  }

  protected mensajeError(control: AbstractControl): string {
    const errores = control.errors;
    if (!errores) {
      return '';
    }
    if (errores['servidor']) {
      return errores['servidor'] as string;
    }
    if (errores['required']) {
      return 'Obligatorio.';
    }
    if (errores['maxlength']) {
      return `No puede superar los ${(errores['maxlength'] as { requiredLength: number }).requiredLength} caracteres.`;
    }
    if (errores['min']) {
      return 'Debe ser mayor que cero.';
    }
    return 'Valor no válido.';
  }

  protected etiquetaDocente(docente: Docente): string {
    const apellidos = [docente.apellido_paterno, docente.apellido_materno]
      .filter(Boolean)
      .join(' ');
    return `${apellidos}, ${docente.nombres} — ${docente.dni}`;
  }

  protected etiquetaEstado(estado: EstadoExpediente): string {
    const etiquetas: Partial<Record<EstadoExpediente, string>> = {
      OBSERVADO: 'Observado',
      EN_REVISION_CALIDAD: 'En revisión de Calidad',
    };
    return etiquetas[estado] ?? estado;
  }

  private docenteValido(control: AbstractControl) {
    const valor = control.value;
    return valor && typeof valor === 'object' && typeof valor.valor?.id === 'number'
      ? null
      : { required: true };
  }

  private construirPayload(): ExpedientePayload | null {
    const valores = this.formulario.getRawValue();
    const fecha = valores.carta_docente_fecha;
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
      return null;
    }
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const docente = this.docenteSeleccionado();
    const facultadId = docente?.escuela?.facultad?.id;
    if (!docente || facultadId == null) {
      this.mensajes.add({
        severity: 'error',
        summary: 'Docente incompleto',
        detail: 'El docente seleccionado no tiene una facultad asignada.',
      });
      return null;
    }
    return {
      carta_docente_numero: (valores.carta_docente_numero ?? '').trim(),
      carta_docente_fecha: `${anio}-${mes}-${dia}`,
      docente_id: docente.id,
      facultad_id: facultadId,
      titulo: (valores.titulo ?? '').trim(),
      revista: (valores.revista ?? '').trim(),
      base_indexadora: valores.base_indexadora as BaseIndexadora,
      cuartil: valores.cuartil as Cuartil,
      monto_solicitado: valores.monto_solicitado ?? 0,
      doi: valores.doi?.trim() || null,
      documentos_completos: valores.documentos_completos ?? false,
    };
  }

  private enviar(payload: ExpedientePayload): void {
    this.guardando.set(true);
    const id = this.editandoId();
    
    if (id) {
      this.expedienteService.actualizar(id, payload).subscribe({
        next: () => {
          const archivoNuevo = this.archivoSeleccionado();
          if (!archivoNuevo) {
            this.guardando.set(false);
            this.mensajes.add({
              severity: 'success',
              summary: 'Expediente actualizado',
              detail: `Expediente actualizado con éxito.`,
            });
            this.router.navigate(['/expedientes']);
            return;
          }
          // Se eligió una carta de reemplazo: se sube antes de volver al listado.
          this.expedienteService.subirCarta(id, archivoNuevo).subscribe({
            next: () => {
              this.router.navigate(['/expedientes']);
            },
            error: (error) => {
              this.guardando.set(false);
              this.mensajes.add({
                severity: 'warn',
                summary: 'Expediente actualizado, pero no se pudo reemplazar la carta',
                detail: this.detalleError(error),
              });
              this.router.navigate(['/expedientes']);
            },
          });
        },
        error: (error) => {
          this.guardando.set(false);
          this.procesarErrorRegistro(error);
        },
      });
    } else {
      this.expedienteService.registrar(payload).subscribe({
        next: (respuesta) => {
          this.guardando.set(false);
          if (esRespuestaDuplicidad(respuesta)) {
            this.confirmarDuplicado(respuesta, payload);
          } else {
            this.alRegistrar(respuesta);
          }
        },
        error: (error) => {
          this.guardando.set(false);
          this.procesarErrorRegistro(error);
        },
      });
    }
  }

  private confirmarDuplicado(respuesta: RespuestaDuplicidad, payload: ExpedientePayload): void {
    this.confirmacion.confirm({
      header: 'Posible expediente duplicado',
      message: `${respuesta.advertencia}\n\nExistente: ${respuesta.existente.codigo}${respuesta.existente.estado ? ` (${respuesta.existente.estado})` : ''}`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Registrar de todos modos',
      rejectLabel: 'Cancelar',
      accept: () => this.enviar({ ...payload, confirmar_duplicado: true }),
    });
  }

  private alRegistrar(expediente: Expediente): void {
    this.mensajes.add({
      severity: 'success',
      summary: `Expediente ${expediente.codigo} registrado`,
      detail: `Estado: ${this.etiquetaEstado(expediente.estado)}`,
    });

    const archivo = this.archivoSeleccionado();
    if (!archivo) {
      this.expedienteCreado.set(expediente);
      return;
    }

    // La carta ya se eligió en el bloque OCR: se adjunta y se vuelve al listado.
    this.guardando.set(true);
    this.expedienteService.subirCarta(expediente.id, archivo).subscribe({
      next: () => {
        this.router.navigate(['/expedientes']);
      },
      error: (error) => {
        this.guardando.set(false);
        this.mensajes.add({
          severity: 'warn',
          summary: 'No se pudo adjuntar la carta',
          detail: this.detalleError(error),
        });
        this.expedienteCreado.set(expediente);
      },
    });
  }

  private procesarErrorRegistro(error: unknown): void {
    const respuesta = error as {
      status?: number;
      error?: { message?: string; errors?: Record<string, string[]> };
    };
    if (respuesta.status === 403) {
      this.mensajes.add({
        severity: 'error',
        summary: 'Sin permisos',
        detail: 'Tu rol no puede registrar expedientes.',
      });
      return;
    }
    const errores = respuesta.error?.errors;
    if (errores) {
      for (const [campo, mensajes] of Object.entries(errores)) {
        const nombreControl = campo === 'docente_id' ? 'docente' : campo;
        const control = this.formulario.get(nombreControl);
        if (control) {
          control.setErrors({ servidor: mensajes[0] });
          control.markAsTouched();
        }
      }
    }
    this.mensajes.add({
      severity: 'error',
      summary: 'No se pudo registrar el expediente',
      detail: respuesta.error?.message ?? this.detalleError(error),
    });
  }

  private detalleError(error: unknown): string {
    const mensaje = (error as { error?: { message?: string } })?.error?.message;
    return mensaje ?? 'Ocurrió un error inesperado.';
  }
}

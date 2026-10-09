import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';

import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService, type MenuItem } from 'primeng/api';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';

import {
  ESTADO_INFO,
  type EstadoExpediente,
} from '../../../core/models/expediente.model';
import {
  type ArchivoDetalle,
  type DocumentoGeneradoDetalle,
  type ExpedienteDetalle,
} from '../../../core/models/expediente-detalle.model';
import { ArchivoService } from '../../../core/services/archivo.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartaVrinService } from '../../../core/services/carta-vrin.service';
import { DocumentoService } from '../../../core/services/documento.service';
import { ExpedienteService } from '../../../core/services/expediente.service';
import { ResolucionService } from '../../../core/services/resolucion.service';
import { BadgeEtapa } from '../../../shared/badge-etapa/badge-etapa';
import { ValidacionExpediente } from '../../validacion/validacion-expediente';

import { Dialog } from 'primeng/dialog';

@Component({
  selector: 'app-vista-expediente',
  imports: [
    BadgeEtapa,
    Button,
    ConfirmDialog,
    DatePicker,
    Dialog,
    InputNumber,
    InputText,
    ReactiveFormsModule,
    RouterLink,
    Tag,
    Toast,
    ValidacionExpediente,
  ],
  templateUrl: './expediente.html',
  styleUrl: './expediente.scss',
})
export class VistaExpediente implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly expedienteService = inject(ExpedienteService);
  private readonly archivoService = inject(ArchivoService);
  private readonly auth = inject(AuthService);
  private readonly cartaVrinService = inject(CartaVrinService);
  private readonly resolucionService = inject(ResolucionService);
  private readonly documentoService = inject(DocumentoService);
  private readonly mensajes = inject(MessageService);
  private readonly confirmacion = inject(ConfirmationService);

  protected readonly detalle = signal<ExpedienteDetalle | null>(null);
  protected readonly cargando = signal(true);
  protected readonly urlCarta = signal<SafeResourceUrl | null>(null);
  protected readonly urlDocGenerado = signal<SafeResourceUrl | null>(null);
  protected readonly errorVistaCarta = signal(false);
  protected readonly esperaVistaCartaAgotada = signal(false);
  protected readonly urlDocResolucion = signal<SafeResourceUrl | null>(null);
  protected readonly drawerValidacion = signal(false);
  protected readonly subsanando = signal(false);
  protected readonly guardandoCarta = signal(false);
  protected readonly guardandoOpp = signal(false);
  protected readonly editandoOpp = signal(false);
  protected readonly adjuntandoOpp = signal(false);
  protected readonly analizandoOpp = signal(false);
  protected readonly modoOpp = signal<'IA' | 'MANUAL'>('IA');
  protected readonly archivoOppSeleccionado = signal<File | null>(null);
  protected readonly vistaArchivoOppVisible = signal(false);
  protected readonly urlArchivoOpp = signal<SafeResourceUrl | null>(null);
  protected readonly errorArchivoOpp = signal(false);
  private blobArchivoOpp?: string;
  protected readonly guardandoResolucion = signal(false);
  protected readonly vistaResolucionVisible = signal(false);
  protected readonly vistaResolucionGenerada = signal(false);
  protected readonly documentoResolucionVista = signal<DocumentoGeneradoDetalle | null>(null);
  protected readonly urlVistaResolucion = signal<SafeResourceUrl | null>(null);
  protected readonly cargandoVistaResolucion = signal(false);
  protected readonly errorVistaResolucion = signal('');
  private blobVistaResolucion?: string;
  protected readonly archivoComprobanteSeleccionado = signal<File | null>(null);
  protected readonly vistaComprobanteVisible = signal(false);
  protected readonly urlComprobante = signal<SafeResourceUrl | null>(null);
  protected readonly urlImagenComprobante = signal<string | null>(null);
  protected readonly errorComprobante = signal(false);
  protected readonly retirandoComprobante = signal<number | null>(null);
  private blobComprobante?: string;
  protected readonly modalDoi = signal(false);
  protected readonly modalCartaVisible = signal(false);
  protected readonly editandoCarta = signal(false);
  private versionEditando?: number;
  protected readonly vistaCartaVrinVisible = signal(false);
  protected readonly vistaBorrador = signal(false);
  protected readonly documentoVista = signal<DocumentoGeneradoDetalle | null>(null);
  protected readonly urlVersionCarta = signal<SafeResourceUrl | null>(null);
  protected readonly cargandoVersionCarta = signal(false);
  protected readonly errorVersionCarta = signal(false);
  protected readonly mensajeErrorPreview = signal('No se pudo preparar la vista previa de la plantilla.');
  private blobVersionCarta?: string;
  private solicitudVista = 0;
  protected readonly versionesCarta = computed(() => (this.detalle()?.documentos_generados ?? [])
    .filter(d => d.tipo === 'CARTA_VRIN').sort((a, b) => b.version - a.version));
  protected readonly puedeEditarCarta = computed(() => ['EN_ESPERA_OPP', 'DISPONIBILIDAD_CONFIRMADA', 'RESOLUCION_EMITIDA'].includes(this.detalle()?.estado ?? '')
    && !!this.docCartaGenerada() && ['SECRETARIA', 'ADMINISTRADOR_GENERAL'].includes(this.auth.usuarioActual()?.rol_codigo ?? ''));
  protected readonly guardandoDesembolso = signal(false);
  protected readonly guardandoDoi = signal(false);
  protected readonly cerrandoRendicion = signal(false);
  protected readonly adjuntandoComprobante = signal(false);

  private blobUrlCarta?: string;
  private archivoCartaCargadoId?: number;
  private blobUrlDocGenerado?: string;
  private blobUrlDocResolucion?: string;
  private expedienteId?: number;
  private docGeneradoCargadoId?: number;
  private docResolucionCargadoId?: number;
  private pollingId?: ReturnType<typeof setInterval>;
  private intentosPolling = 0;
  private pasoInicializado = false;

  protected readonly paso0Ok = computed(() =>
    ['VALIDADO_CALIDAD', 'EN_ESPERA_OPP', 'DISPONIBILIDAD_CONFIRMADA', 'SIN_DISPONIBILIDAD', 'RESOLUCION_EMITIDA', 'POR_RENDIR', 'RENDICION_VENCIDA', 'RENDIDO'].includes(this.detalle()?.estado ?? ''),
  );
  protected readonly paso1Ok = computed(() =>
    this.detalle()?.carta_vrin?.estado === 'EMITIDA'
      || ['EN_ESPERA_OPP', 'DISPONIBILIDAD_CONFIRMADA', 'SIN_DISPONIBILIDAD', 'RESOLUCION_EMITIDA', 'POR_RENDIR', 'RENDICION_VENCIDA', 'RENDIDO'].includes(this.detalle()?.estado ?? ''),
  );
  protected readonly paso2Ok = computed(() =>
    this.detalle()?.resolucion?.estado === 'EMITIDA'
      || ['RESOLUCION_EMITIDA', 'POR_RENDIR', 'RENDICION_VENCIDA', 'RENDIDO'].includes(this.detalle()?.estado ?? ''),
  );
  protected readonly paso3Ok = computed(() => this.detalle()?.estado === 'RENDIDO');

  protected pasoCompletado(index: number): boolean {
    if (this.paso3Ok()) return true;
    return [this.paso0Ok(), this.paso1Ok(), this.paso2Ok(), this.paso3Ok()][index] ?? false;
  }

  protected readonly pasos = computed<MenuItem[]>(() => {
    return [
      { label: 'Carta Docente', command: () => this.cambiarPaso(0) },
      { label: 'Carta VRIN / OPP', command: () => this.cambiarPaso(1) },
      { label: 'Resolución', command: () => this.cambiarPaso(2) },
      { label: 'Rendición', command: () => this.cambiarPaso(3) },
    ];
  });

  protected readonly indiceActivoVisible = signal<number>(0);

  protected pasoDisponible(index: number): boolean {
    if (!this.detalle()) return false;
    return [true, this.paso0Ok(), this.paso1Ok(), this.paso2Ok()][index] ?? false;
  }

  protected etiquetaPaso(index: number): string {
    const detalle = this.detalle();
    if (!detalle) return '';
    if (index === 0) {
      if (detalle.estado === 'NO_CUMPLE') return 'No cumple';
      if (detalle.estado === 'OBSERVADO') return 'Observado';
      return this.paso0Ok() ? 'Validado' : 'Pendiente de Calidad';
    }
    if (!this.pasoDisponible(index)) return 'Bloqueado';
    if (index === 1) return this.paso1Ok() ? 'Generada' : 'En elaboración';
    if (index === 2) {
      if (detalle.estado === 'SIN_DISPONIBILIDAD') return 'Sin disponibilidad';
      return this.paso2Ok() ? 'Generada' : 'En elaboración';
    }
    if (this.paso3Ok()) return 'Rendida';
    if (detalle.estado === 'RENDICION_VENCIDA') return 'Vencida';
    return detalle.rendicion ? 'Por rendir' : 'Pendiente';
  }

  protected cambiarPaso(index: number): void {
    if (Number.isInteger(index) && this.pasoDisponible(index)) {
      this.indiceActivoVisible.set(index);
    }
  }

  protected readonly carta = computed(() => {
    const archivos = this.detalle()?.archivos ?? [];
    return archivos.find((a) => a.tipo === 'CARTA_DOCENTE') ?? null;
  });

  protected readonly observacionesPendientes = computed(() =>
    (this.detalle()?.observaciones ?? []).filter((o) => o.resuelta_at === null),
  );

  protected readonly severidadBadge = computed<'success' | 'warn' | 'danger'>(() => {
    const estado = this.detalle()?.estado;
    return estado ? (ESTADO_INFO[estado]?.severity ?? 'warn') : 'warn';
  });

  protected readonly puedeValidar = computed(() =>
    (this.detalle()?.transiciones_disponibles ?? []).some(
      (t) => t.accion?.clave === 'validar' && t.habilitada,
    ),
  );

  protected readonly puedeSubsanar = computed(() =>
    (this.detalle()?.transiciones_disponibles ?? []).some(
      (t) => t.accion?.clave === 'subsanar' && t.habilitada,
    ),
  );

  // Los permisos de cada formulario siguen las transiciones del backend.
  protected readonly puedeGenerarCarta = computed(() =>
    (this.detalle()?.transiciones_disponibles ?? []).some(
      (t) => t.accion?.clave === 'generar_carta' && t.habilitada,
    ),
  );

  protected readonly puedeRegistrarOpp = computed(
    () =>
      this.detalle()?.estado === 'EN_ESPERA_OPP' &&
      (this.detalle()?.transiciones_disponibles ?? []).some((t) => t.habilitada),
  );

  protected readonly docCartaGenerada = computed<DocumentoGeneradoDetalle | null>(
    () =>
      (this.detalle()?.documentos_generados ?? []).filter((d) => d.tipo === 'CARTA_VRIN' && d.es_vigente)[0] ?? null,
  );

  protected readonly puedeGenerarResolucion = computed(() =>
    (this.detalle()?.transiciones_disponibles ?? []).some(
      (t) => t.accion?.clave === 'generar_resolucion' && t.habilitada,
    ),
  );

  protected readonly docResolucionGenerada = computed<DocumentoGeneradoDetalle | null>(
    () =>
      (this.detalle()?.documentos_generados ?? []).filter((d) => d.tipo === 'RESOLUCION' && d.es_vigente)[0] ?? null,
  );

  protected readonly adjuntosOpp = computed(() =>
    (this.detalle()?.archivos ?? []).filter((a) => a.tipo === 'CARTA_OPP'),
  );

  protected readonly puedeReevaluar = computed(() => {
    const expediente = this.detalle();
    return this.auth.usuarioActual()?.rol_codigo === 'CALIDAD'
      && ['VALIDADO_CALIDAD', 'NO_CUMPLE'].includes(expediente?.estado ?? '')
      && expediente?.validacion_calidad !== null
      && expediente?.carta_vrin === null
      && !(expediente?.documentos_generados ?? []).some((documento) => documento.tipo === 'CARTA_VRIN');
  });

  protected readonly puedeEditarExpediente = computed(() =>
    ['SECRETARIA', 'ADMINISTRADOR_GENERAL'].includes(this.auth.usuarioActual()?.rol_codigo ?? '')
      && ['OBSERVADO', 'EN_REVISION_CALIDAD'].includes(this.detalle()?.estado ?? ''),
  );

  protected readonly puedeGestionarRendicion = computed(() =>
    ['SECRETARIA', 'ADMINISTRADOR_GENERAL'].includes(this.auth.usuarioActual()?.rol_codigo ?? '')
      && ['RESOLUCION_EMITIDA', 'POR_RENDIR', 'RENDICION_VENCIDA'].includes(this.detalle()?.estado ?? ''),
  );

  protected readonly fechaMinimaInforme = computed(() => {
    const fecha = this.detalle()?.rendicion?.fecha_desembolso;
    return fecha ? new Date(`${fecha}T00:00:00`) : undefined;
  });
  protected readonly puedeEditarOpp = computed(() => ['DISPONIBILIDAD_CONFIRMADA', 'RESOLUCION_EMITIDA'].includes(this.detalle()?.estado ?? '')
    && !!this.detalle()?.respuesta_opp
    && ['SECRETARIA', 'ADMINISTRADOR_GENERAL'].includes(this.auth.usuarioActual()?.rol_codigo ?? ''));

  protected readonly versionesResolucion = computed(() => (this.detalle()?.documentos_generados ?? [])
    .filter((documento) => documento.tipo === 'RESOLUCION').sort((a, b) => b.version - a.version));


  protected readonly comprobantes = computed(() =>
    (this.detalle()?.archivos ?? []).filter((a) => a.tipo === 'COMPROBANTE_RENDICION'),
  );

  protected readonly verificados = computed(() => {
    const checklist = this.detalle()?.validacion_calidad?.checklist;
    return checklist ? Object.keys(checklist).length : 0;
  });

  protected readonly cartaForm = this.fb.group({
    numero_completo: ['', [Validators.required, Validators.pattern(/^(?:CARTA\s+N[°º]?\s*)?0*[1-9]\d*-(?:20[2-9]\d|2100)(?:-VRIN-UNAMBA)?$/i)]],
    fecha: [new Date() as Date | null, Validators.required],
    asunto: ['', [Validators.required, Validators.maxLength(255)]],
    carta_docente_registro_numero: ['', [Validators.required, Validators.maxLength(80)]],
    carta_docente_registro_fecha: [null as Date | null, Validators.required],
  });

  protected readonly oppForm = this.fb.group({
    disponibilidad: ['SI' as 'SI' | 'NO', Validators.required],
    monto_aprobado: [null as number | null],
    meta_presupuestal: [''],
    especifica_gasto: [''],
    fuente_financiamiento: [''],
    carta_numero: ['', Validators.required],
    carta_fecha: [null as Date | null, Validators.required],
    registro_vrin_numero: ['', Validators.required],
    registro_vrin_fecha: [null as Date | null, Validators.required],
  });

  protected readonly resolucionForm = this.fb.group({
    numero: [null as number | null, [Validators.required, Validators.min(1)]],
    anio: [new Date().getFullYear(), [Validators.required]],
    fecha_emision: [new Date() as Date | null, Validators.required],
  });

  protected readonly desembolsoForm = this.fb.group({
    fecha_desembolso: [new Date() as Date | null, Validators.required],
    monto_desembolsado: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  protected readonly doiForm = this.fb.group({
    doi: ['', Validators.required],
  });

  protected readonly rendicionForm = this.fb.group({
    fecha_informe: [new Date() as Date | null, Validators.required],
    doi: ['', Validators.maxLength(255)],
  });

  constructor() {
    this.oppForm.controls.disponibilidad.valueChanges.subscribe((valor) => {
      const camposSi = [
        this.oppForm.controls.monto_aprobado,
        this.oppForm.controls.meta_presupuestal,
        this.oppForm.controls.especifica_gasto,
        this.oppForm.controls.fuente_financiamiento,
      ];
      if (valor === 'SI') {
        camposSi.forEach((c) => c.enable({ emitEvent: false }));
      } else {
        camposSi.forEach((c) => {
          c.reset(null, { emitEvent: false });
          c.disable({ emitEvent: false });
        });
      }
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.router.navigate(['/expedientes']);
      return;
    }
    this.expedienteId = id;
    this.cargar(id);
  }

  private cargar(id: number, silencioso = false, desdePolling = false): void {
    if (!silencioso) {
      this.cargando.set(true);
    }
    this.expedienteService.obtener(id).subscribe({
      next: (detalle) => {
        this.detalle.set(detalle);
        if (this.pasoInicializado && !this.pasoDisponible(this.indiceActivoVisible())) {
          this.indiceActivoVisible.set([3, 2, 1, 0].find((paso) => this.pasoDisponible(paso)) ?? 0);
        }
        const fechaMinima = detalle.rendicion?.fecha_desembolso;
        const fechaInforme = this.rendicionForm.controls.fecha_informe.value;
        const fechaInformeIso = this.iso(fechaInforme);
        if (fechaMinima && (!fechaInformeIso || fechaInformeIso < fechaMinima)) {
          this.rendicionForm.controls.fecha_informe.setValue(new Date(`${fechaMinima}T00:00:00`));
        }
        if (!this.rendicionForm.controls.doi.dirty) {
          this.rendicionForm.controls.doi.setValue(detalle.articulo?.doi ?? '', { emitEvent: false });
        }
        if (detalle.estado === 'RESOLUCION_EMITIDA' && this.desembolsoForm.controls.monto_desembolsado.value === null) {
          this.desembolsoForm.controls.monto_desembolsado.setValue(detalle.respuesta_opp?.monto_aprobado ?? detalle.articulo?.monto_solicitado ?? null);
        }
        if (!silencioso) {
          if (!this.pasoInicializado) {
            const pasoQuery = this.route.snapshot.queryParamMap.get('paso');
            const paso = pasoQuery === null ? NaN : Number(pasoQuery);
            this.cambiarPaso(this.pasoDisponible(paso) ? paso : this.pasoSugerido(detalle));
            this.pasoInicializado = true;
            this.restablecerDatosCarta(detalle);
            this.restablecerDatosResolucion(detalle);
          }
          this.cargando.set(false);
        }
        this.prepararVistaCarta(detalle);
        this.prepararVistaDocGenerado(detalle);
        this.prepararVistaDocResolucion(detalle);
        const documentoAbierto = this.documentoVista();
        if (this.vistaCartaVrinVisible() && !this.vistaBorrador() && documentoAbierto && !documentoAbierto.pdf_path) {
          const versionActualizada = detalle.documentos_generados.find((doc) => doc.id === documentoAbierto.id);
          if (versionActualizada?.pdf_path) {
            if (this.urlVersionCarta()) {
              this.documentoVista.set(versionActualizada);
            } else if (!this.cargandoVersionCarta()) {
              this.verVersionCarta(versionActualizada);
            }
          }
        }
        this.gestionarPolling(detalle);
        this.sugerirNumeroSiCorresponde();
        this.sugerirNumeroResolucionSiCorresponde();
      },
      error: (error) => {
        if (silencioso) {
          if (desdePolling) {
            this.esperaVistaCartaAgotada.set(true);
            this.detenerPolling();
          } else {
            this.mensajes.add({ severity: 'error', summary: 'No se pudo actualizar el expediente', detail: 'Recarga la página para consultar los datos actuales.' });
          }
          return;
        }
        this.cargando.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'Expediente no disponible',
          detail:
            (error as { error?: { message?: string } })?.error?.message ??
            'No se pudo cargar el expediente.',
        });
        this.router.navigate(['/expedientes']);
      },
    });
  }

  private pasoSugerido(detalle: ExpedienteDetalle): number {
    if (this.auth.usuarioActual()?.rol_codigo === 'CALIDAD'
      && ['VALIDADO_CALIDAD', 'NO_CUMPLE'].includes(detalle.estado)) {
      return 0;
    }
    if (['VALIDADO_CALIDAD', 'EN_ESPERA_OPP'].includes(detalle.estado)) {
      return 1;
    }
    if (['DISPONIBILIDAD_CONFIRMADA', 'SIN_DISPONIBILIDAD'].includes(detalle.estado)) {
      return 2;
    }
    return Math.min(Math.max((detalle.etapa_actual ?? 1) - 1, 0), 3);
  }

  protected descartarCarta(): void {
    const detalle = this.detalle();
    if (detalle && !this.guardandoCarta()) {
      this.restablecerDatosCarta(detalle);
      this.editandoCarta.set(false);
      this.sugerirNumeroSiCorresponde();
    }
  }

  private restablecerDatosCarta(detalle: ExpedienteDetalle): void {
    this.cartaForm.reset({
      numero_completo: detalle.carta_vrin ? `CARTA N° ${this.numeroCartaFormateado(detalle.carta_vrin.numero, detalle.carta_vrin.anio)}-VRIN-UNAMBA` : '',
      fecha: detalle.carta_vrin?.fecha ? new Date(`${detalle.carta_vrin.fecha}T00:00:00`) : new Date(),
      asunto: detalle.carta_vrin?.asunto ?? `Solicito financiamiento para publicación en revista indexada para el docente ${detalle.docente?.nombre_completo ?? ''}`.trim(),
      carta_docente_registro_numero: detalle.carta_docente_registro_numero ?? detalle.registro_mp_numero ?? '',
      carta_docente_registro_fecha: detalle.carta_docente_registro_fecha
        ? new Date(`${detalle.carta_docente_registro_fecha}T00:00:00`) : null,
    });
  }

  private restablecerDatosResolucion(detalle: ExpedienteDetalle): void {
    const borrador = detalle.resolucion_borrador;
    const emitida = detalle.resolucion;
    this.resolucionForm.patchValue({
      numero: emitida?.numero != null ? Number(emitida.numero) : borrador?.numero ?? null,
      anio: emitida?.anio ?? borrador?.anio ?? new Date().getFullYear(),
      fecha_emision: emitida?.fecha_emision ? new Date(`${emitida.fecha_emision}T00:00:00`)
        : borrador?.fecha_emision ? new Date(`${borrador.fecha_emision}T00:00:00`) : new Date(),
    });
  }

  // Polling D-14: tras generar la carta, el PDF tarda unos segundos; se
  // reconsulta el detalle cada 2 s hasta que pdf_path aparezca (máx. 30).
  private gestionarPolling(detalle: ExpedienteDetalle): void {
    const docCarta = detalle.documentos_generados?.filter((d) => d.tipo === 'CARTA_VRIN' && d.es_vigente)[0];
    const docResol = detalle.documentos_generados?.filter((d) => d.tipo === 'RESOLUCION' && d.es_vigente)[0];
    
    const pendienteCarta = docCarta !== undefined && docCarta.pdf_path === null;
    const pendienteResol = docResol !== undefined && docResol.pdf_path === null;

    if (!pendienteCarta && !pendienteResol) {
      this.detenerPolling();
      return;
    }

    if (this.pollingId !== undefined) {
      return;
    }

    this.intentosPolling = 0;
    this.pollingId = setInterval(() => {
      this.intentosPolling += 1;
      if (this.intentosPolling > 30 || this.expedienteId === undefined) {
        this.esperaVistaCartaAgotada.set(true);
        this.detenerPolling();
        return;
      }
      this.cargar(this.expedienteId, true, true);
    }, 2000);
  }

  private detenerPolling(): void {
    if (this.pollingId !== undefined) {
      clearInterval(this.pollingId);
      this.pollingId = undefined;
    }
  }

  private sugerirNumeroSiCorresponde(): void {
    if (!this.puedeGenerarCarta() || this.cartaForm.controls.numero_completo.value) {
      return;
    }
    const anio = new Date().getFullYear();
    this.cartaVrinService.sugerencia(anio).subscribe({
      next: ({ siguiente_numero }) => {
        if (!this.cartaForm.controls.numero_completo.value) {
          const numeroStr = String(siguiente_numero).padStart(4, '0');
          this.cartaForm.controls.numero_completo.setValue(`CARTA Nº ${numeroStr}-${anio}-VRIN-UNAMBA`);
        }
      },
      error: () => {},
    });
  }

  private sugerirNumeroResolucionSiCorresponde(): void {
    if ((!this.puedeGenerarResolucion() && !this.puedeRegistrarOpp()) || this.resolucionForm.controls.numero.value !== null) {
      return;
    }
    const anio = this.resolucionForm.controls.anio.value ?? new Date().getFullYear();
    this.resolucionService.sugerencia(anio).subscribe({
      next: ({ siguiente_numero }) => {
        if (this.resolucionForm.controls.numero.value === null) {
          this.resolucionForm.controls.numero.setValue(siguiente_numero);
        }
      },
      error: () => {},
    });
  }

  private prepararVistaDocGenerado(detalle: ExpedienteDetalle): void {
    const doc = detalle.documentos_generados?.find((d) => d.tipo === 'CARTA_VRIN' && d.es_vigente);
    if (!doc || doc.id !== this.docGeneradoCargadoId) {
      this.urlDocGenerado.set(null);
      this.errorVistaCarta.set(false);
      if (this.blobUrlDocGenerado) {
        URL.revokeObjectURL(this.blobUrlDocGenerado);
        this.blobUrlDocGenerado = undefined;
      }
      this.docGeneradoCargadoId = undefined;
    }
    if (!doc || doc.pdf_path === null || doc.id === this.docGeneradoCargadoId) {
      return;
    }
    this.docGeneradoCargadoId = doc.id;
    this.documentoService.obtenerBlob(detalle.id, doc.id, 'pdf').subscribe({
      next: (blob) => {
        if (this.docCartaGenerada()?.id !== doc.id) return;
        if (this.blobUrlDocGenerado) {
          URL.revokeObjectURL(this.blobUrlDocGenerado);
        }
        this.blobUrlDocGenerado = URL.createObjectURL(blob);
        this.urlDocGenerado.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrlDocGenerado));
        this.esperaVistaCartaAgotada.set(false);
      },
      error: () => {
        if (this.docCartaGenerada()?.id === doc.id) {
          this.errorVistaCarta.set(true);
        }
      },
    });
  }

  protected reintentarVistaCarta(): void {
    if (this.expedienteId === undefined) return;
    this.docGeneradoCargadoId = undefined;
    this.errorVistaCarta.set(false);
    this.esperaVistaCartaAgotada.set(false);
    this.detenerPolling();
    this.cargar(this.expedienteId, true);
  }

  private prepararVistaDocResolucion(detalle: ExpedienteDetalle): void {
    const doc = detalle.documentos_generados?.filter((d) => d.tipo === 'RESOLUCION' && d.es_vigente)[0];
    if (!doc || doc.pdf_path === null || doc.id === this.docResolucionCargadoId) {
      return;
    }
    this.docResolucionCargadoId = doc.id;
    this.documentoService.obtenerBlob(detalle.id, doc.id, 'pdf').subscribe({
      next: (blob) => {
        if (this.blobUrlDocResolucion) {
          URL.revokeObjectURL(this.blobUrlDocResolucion);
        }
        this.blobUrlDocResolucion = URL.createObjectURL(blob);
        this.urlDocResolucion.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrlDocResolucion));
      },
      error: () => {},
    });
  }

  protected confirmarGenerarCarta(): void {
    if (this.cartaForm.invalid || this.guardandoCarta()) {
      this.cartaForm.markAllAsTouched();
      return;
    }
    this.vistaBorrador.set(true);
    this.documentoVista.set(null);
    this.vistaCartaVrinVisible.set(true);
    this.cargandoVersionCarta.set(true);
    this.errorVersionCarta.set(false);
    this.urlVersionCarta.set(null);
    const detalle = this.detalle();
    if (!detalle) return;
    const valores = this.cartaForm.getRawValue();
    const match = valores.numero_completo?.match(/(\d+)-(\d{4})/);
    const solicitud = ++this.solicitudVista;
    this.cartaVrinService.preview(detalle.id, {
      numero: Number(match?.[1]), anio: Number(match?.[2]),
      fecha: this.iso(valores.fecha), ciudad: detalle.carta_vrin?.ciudad ?? 'Abancay',
      carta_docente_registro_numero: valores.carta_docente_registro_numero?.trim(),
      carta_docente_registro_fecha: this.iso(valores.carta_docente_registro_fecha),
      asunto: valores.asunto?.trim(),
    }).subscribe({
      next: blob => {
        if (solicitud !== this.solicitudVista) return;
        if (this.blobVersionCarta) URL.revokeObjectURL(this.blobVersionCarta);
        this.blobVersionCarta = URL.createObjectURL(blob);
        this.urlVersionCarta.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobVersionCarta));
        this.cargandoVersionCarta.set(false);
      },
      error: async (error) => {
        if (solicitud !== this.solicitudVista) return;
        this.cargandoVersionCarta.set(false);
        this.errorVersionCarta.set(true);
        let mensaje = 'No se pudo preparar la vista previa de la plantilla.';
        try {
          const contenido = error.error instanceof Blob ? JSON.parse(await error.error.text()) : error.error;
          mensaje = contenido?.message ?? mensaje;
        } catch {}
        if (solicitud === this.solicitudVista) this.mensajeErrorPreview.set(mensaje);
      },
    });
  }

  protected generarCarta(): void {
    const detalle = this.detalle();
    if (!detalle || this.guardandoCarta() || this.cartaForm.invalid || (this.vistaBorrador() && !this.urlVersionCarta())) {
      return;
    }
    const valores = this.cartaForm.getRawValue();
    
    // Parse "CARTA Nº 0667-2026-VRIN-UNAMBA" -> 667, 2026
    const match = valores.numero_completo?.match(/(\d+)-(\d{4})/);
    const numero = match ? parseInt(match[1], 10) : 0;
    const anio = match ? parseInt(match[2], 10) : new Date().getFullYear();

    this.guardandoCarta.set(true);
    const payload = {
        numero: numero,
        anio: anio,
        fecha: this.iso(valores.fecha) ?? '',
        ciudad: 'Abancay',
        carta_docente_registro_numero: valores.carta_docente_registro_numero?.trim() || null,
        carta_docente_registro_fecha: this.iso(valores.carta_docente_registro_fecha) ?? null,
        asunto: valores.asunto?.trim() || null,
      };
    const operacion = this.editandoCarta()
      ? this.cartaVrinService.actualizar(detalle.id, { ...payload, version_actual: this.versionEditando ?? 0 })
      : this.expedienteService.generarCarta(detalle.id, payload);
    operacion
      .subscribe({
        next: (respuesta) => {
          this.guardandoCarta.set(false);
          this.editandoCarta.set(false);
          this.vistaCartaVrinVisible.set(false);
          this.indiceActivoVisible.set(1);
          this.mensajes.add({
            severity: 'success',
            summary: `${valores.numero_completo} generada`,
            detail: 'Carta guardada. Puedes ver el documento aquí y registrar la respuesta OPP en el paso 3: Resolución.',
          });
          this.cargar(detalle.id, true);
        },
        error: (error) => {
          this.guardandoCarta.set(false);
          this.mensajes.add({
            severity: 'error',
            summary: 'No se pudo generar la carta',
            detail:
              (error as { error?: { message?: string } })?.error?.message ??
              'Ocurrió un error inesperado.',
          });
        },
      });
  }

  protected editarCarta(): void {
    const detalle = this.detalle();
    if (!detalle || !this.puedeEditarCarta()) return;
    this.restablecerDatosCarta(detalle);
    this.versionEditando = this.docCartaGenerada()?.version;
    this.editandoCarta.set(true);
  }

  protected verVersionCarta(doc: DocumentoGeneradoDetalle): void {
    const detalle = this.detalle();
    if (!detalle) return;
    const solicitud = ++this.solicitudVista;
    if (this.blobVersionCarta) URL.revokeObjectURL(this.blobVersionCarta);
    this.blobVersionCarta = undefined;
    this.urlVersionCarta.set(null);
    this.errorVersionCarta.set(false);
    this.documentoVista.set(doc);
    this.vistaBorrador.set(false);
    this.vistaCartaVrinVisible.set(true);
    this.cargandoVersionCarta.set(true);
    this.documentoService.obtenerBlob(detalle.id, doc.id, 'pdf').subscribe({
      next: blob => {
        if (solicitud !== this.solicitudVista) return;
        this.blobVersionCarta = URL.createObjectURL(blob);
        this.urlVersionCarta.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobVersionCarta));
        this.cargandoVersionCarta.set(false);
        if (!doc.pdf_path) this.cargar(detalle.id, true);
      },
      error: () => {
        if (solicitud !== this.solicitudVista) return;
        this.cargandoVersionCarta.set(false);
        this.errorVersionCarta.set(true);
      },
    });
  }

  protected fechaCartaVista(fecha: Date | null | undefined): string {
    return fecha instanceof Date ? fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  }

  protected guardarRespuestaOpp(): void {
    const detalle = this.detalle();
    if (!detalle || this.guardandoOpp()) {
      return;
    }
    if (this.oppForm.invalid || (this.oppForm.controls.disponibilidad.value === 'SI' && this.resolucionForm.invalid)) {
      this.oppForm.markAllAsTouched();
      this.resolucionForm.markAllAsTouched();
      return;
    }
    const valores = this.oppForm.getRawValue();

    if (valores.disponibilidad === 'SI') {
      const faltantes: string[] = [];
      if (!valores.monto_aprobado || valores.monto_aprobado <= 0) {
        faltantes.push('monto aprobado');
      }
      if (!/^[0-9]{3}$/.test(valores.meta_presupuestal ?? '')) {
        faltantes.push('meta presupuestal (3 dígitos)');
      }
      if (!valores.especifica_gasto?.trim()) {
        faltantes.push('específica de gasto');
      }
      if (!valores.fuente_financiamiento?.trim()) {
        faltantes.push('fuente de financiamiento');
      }
      if (faltantes.length > 0) {
        this.oppForm.markAllAsTouched();
        this.mensajes.add({
          severity: 'warn',
          summary: 'Faltan datos de la asignación',
          detail: `Completa: ${faltantes.join(', ')}.`,
        });
        return;
      }
    }

    const payload: Record<string, string | number | null> = {
      disponibilidad: valores.disponibilidad,
      carta_numero: (valores.carta_numero ?? '').trim(),
      carta_fecha: this.iso(valores.carta_fecha) ?? '',
      registro_vrin_numero: (valores.registro_vrin_numero ?? '').trim(),
      registro_vrin_fecha: this.iso(valores.registro_vrin_fecha) ?? '',
    };
    if (valores.disponibilidad === 'SI') {
      payload['monto_aprobado'] = valores.monto_aprobado ?? 0;
      payload['meta_presupuestal'] = (valores.meta_presupuestal ?? '').trim();
      payload['especifica_gasto'] = (valores.especifica_gasto ?? '').trim();
      payload['fuente_financiamiento'] = (valores.fuente_financiamiento ?? '').trim();
      const resolucion = this.resolucionForm.getRawValue();
      payload['resolucion_numero'] = resolucion.numero;
      payload['resolucion_anio'] = resolucion.anio;
      payload['resolucion_fecha_emision'] = this.iso(resolucion.fecha_emision) ?? null;
    }

    this.guardandoOpp.set(true);
    const operacion = this.editandoOpp()
      ? this.expedienteService.actualizarRespuestaOpp(detalle.id, payload)
      : this.expedienteService.registrarRespuestaOpp(detalle.id, payload);
    operacion.subscribe({
      next: (respuesta) => {
        this.guardandoOpp.set(false);
        this.editandoOpp.set(false);
        this.mensajes.add({
          severity: respuesta.estado === 'SIN_DISPONIBILIDAD' ? 'warn' : 'success',
          summary:
            respuesta.estado === 'RESOLUCION_EMITIDA' ? 'Datos de la resolución actualizados'
              : respuesta.estado === 'DISPONIBILIDAD_CONFIRMADA' ? 'Disponibilidad confirmada'
                : 'Expediente cerrado: sin disponibilidad presupuestal',
          detail: `${detalle.codigo} · ${respuesta.estado}.`,
        });
        this.oppForm.reset({ disponibilidad: 'SI' });
        this.cargar(detalle.id);
        if (respuesta.estado === 'DISPONIBILIDAD_CONFIRMADA' || respuesta.estado === 'RESOLUCION_EMITIDA') this.confirmarGenerarResolucion(true);
      },
      error: (error) => {
        this.guardandoOpp.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo registrar la respuesta',
          detail:
            (error as { error?: { message?: string } })?.error?.message ??
            'Ocurrió un error inesperado.',
        });
      },
    });
  }

  protected seleccionarEscaneoOpp(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo || this.adjuntandoOpp()) {
      return;
    }
    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) {
      this.mensajes.add({
        severity: 'error',
        summary: 'Archivo no permitido',
        detail: 'El escaneo debe ser PDF, JPG o PNG.',
      });
      return;
    }
    if (archivo.size > 25 * 1024 * 1024) {
      this.mensajes.add({
        severity: 'error',
        summary: 'Archivo muy grande',
        detail: 'El escaneo no puede superar los 25 MB.',
      });
      return;
    }
    this.archivoOppSeleccionado.set(archivo);
  }

  protected editarRespuestaOpp(): void {
    const detalle = this.detalle();
    const opp = detalle?.respuesta_opp;
    if (!opp || !this.puedeEditarOpp()) return;
    const fecha = (valor: string | null): Date | null => valor ? new Date(`${valor}T00:00:00`) : null;
    this.oppForm.patchValue({
      disponibilidad: opp.disponibilidad ?? 'SI', monto_aprobado: opp.monto_aprobado,
      meta_presupuestal: opp.meta_presupuestal ?? '', especifica_gasto: opp.especifica_gasto ?? '',
      fuente_financiamiento: opp.fuente_financiamiento ?? '', carta_numero: opp.carta_numero ?? '',
      carta_fecha: fecha(opp.carta_fecha), registro_vrin_numero: opp.registro_vrin_numero ?? '',
      registro_vrin_fecha: fecha(opp.registro_vrin_fecha),
    });
    this.restablecerDatosResolucion(detalle);
    this.editandoOpp.set(true);
  }

  protected descartarRespuestaOpp(): void {
    if (!this.editandoOpp()) {
      this.oppForm.reset({ disponibilidad: 'SI' });
      this.resolucionForm.reset({ numero: null, anio: new Date().getFullYear(), fecha_emision: new Date() });
      this.archivoOppSeleccionado.set(null);
      this.sugerirNumeroResolucionSiCorresponde();
    }
    this.editandoOpp.set(false);
  }

  protected verArchivoOpp(archivo: ArchivoDetalle): void {
    const detalle = this.detalle();
    if (!detalle) return;
    this.vistaArchivoOppVisible.set(true);
    this.urlArchivoOpp.set(null);
    this.errorArchivoOpp.set(false);
    this.archivoService.obtenerBlob(detalle.id, archivo.id).subscribe({
      next: (blob) => {
        if (this.blobArchivoOpp) URL.revokeObjectURL(this.blobArchivoOpp);
        this.blobArchivoOpp = URL.createObjectURL(blob);
        this.urlArchivoOpp.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobArchivoOpp));
      },
      error: () => {
        this.errorArchivoOpp.set(true);
        this.mensajes.add({ severity: 'error', summary: 'No se pudo abrir la carta OPP' });
      },
    });
  }

  protected subirEscaneoOpp(): void {
    const detalle = this.detalle();
    const archivo = this.archivoOppSeleccionado();
    if (!detalle || !archivo || this.adjuntandoOpp()) return;

    this.adjuntandoOpp.set(true);
    this.expedienteService.subirArchivo(detalle.id, archivo, 'CARTA_OPP', 3).subscribe({
      next: (guardado) => {
        this.adjuntandoOpp.set(false);
        this.archivoOppSeleccionado.set(null);
        this.mensajes.add({
          severity: 'success',
          summary: 'Escaneo adjuntado',
          detail: guardado.nombre_original,
        });
        this.cargar(detalle.id, true);
        if (this.modoOpp() === 'IA') this.analizarEscaneoOpp(archivo);
      },
      error: (error) => {
        this.adjuntandoOpp.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo adjuntar',
          detail:
            (error as { error?: { message?: string } })?.error?.message ??
            'Ocurrió un error inesperado.',
        });
      },
    });
  }

  private analizarEscaneoOpp(archivo: File): void {
    const detalle = this.detalle();
    if (!detalle) return;
    this.analizandoOpp.set(true);
    this.expedienteService.analizarCartaOpp(detalle.id, archivo).subscribe({
      next: ({ datos }) => {
        this.analizandoOpp.set(false);
        const fecha = (valor: unknown): Date | null => typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)
          ? new Date(`${valor}T00:00:00`) : null;
        const texto = (valor: unknown): string => typeof valor === 'string' ? valor.trim() : '';
        const disponibilidad = datos['disponibilidad'];
        this.oppForm.patchValue({
          disponibilidad: disponibilidad === 'SI' || disponibilidad === 'NO' ? disponibilidad : this.oppForm.controls.disponibilidad.value,
          monto_aprobado: datos['monto_aprobado'] !== null && datos['monto_aprobado'] !== '' && datos['monto_aprobado'] !== undefined && Number.isFinite(Number(datos['monto_aprobado'])) ? Number(datos['monto_aprobado']) : this.oppForm.controls.monto_aprobado.value,
          meta_presupuestal: texto(datos['meta_presupuestal']) || this.oppForm.controls.meta_presupuestal.value,
          especifica_gasto: texto(datos['especifica_gasto']) || this.oppForm.controls.especifica_gasto.value,
          fuente_financiamiento: texto(datos['fuente_financiamiento']) || this.oppForm.controls.fuente_financiamiento.value,
          carta_numero: texto(datos['carta_numero']) || this.oppForm.controls.carta_numero.value,
          carta_fecha: fecha(datos['carta_fecha']) ?? this.oppForm.controls.carta_fecha.value,
          registro_vrin_numero: texto(datos['registro_vrin_numero']) || this.oppForm.controls.registro_vrin_numero.value,
          registro_vrin_fecha: fecha(datos['registro_vrin_fecha']) ?? this.oppForm.controls.registro_vrin_fecha.value,
        });
        this.mensajes.add({ severity: 'success', summary: 'Carta analizada', detail: 'Revisa y completa los datos extraídos antes de guardarlos.' });
      },
      error: (error) => {
        this.analizandoOpp.set(false);
        this.mensajes.add({ severity: 'warn', summary: 'No se pudo analizar la carta',
          detail: error?.error?.message ?? 'Completa el formulario manualmente.' });
      },
    });
  }

  protected descargarDocGenerado(doc: DocumentoGeneradoDetalle): void {
    const detalle = this.detalle();
    if (!detalle || !this.versionesCarta().some((version) => version.id === doc.id)) {
      return;
    }
    this.documentoService.obtenerBlob(detalle.id, doc.id, 'docx', true).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `${detalle.codigo}_carta_vrin_v${doc.version}.docx`.toLowerCase();
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.mensajes.add({
          severity: 'error',
          summary: 'Descarga fallida',
          detail: 'No se pudo descargar el documento generado.',
        });
      },
    });
  }

  protected numeroCartaFormateado(numero: number | string, anio: number | string): string {
    return `${String(numero).padStart(3, '0')}-${anio}`;
  }

  private iso(fecha: Date | null): string | undefined {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
      return undefined;
    }
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  protected alValidado(): void {
    this.drawerValidacion.set(false);
    if (this.expedienteId) {
      this.cargar(this.expedienteId);
    }
  }

  protected confirmarSubsanacion(): void {
    const detalle = this.detalle();
    if (!detalle) {
      return;
    }
    this.confirmacion.confirm({
      header: 'Completar documentos',
      message: `¿Confirmar que el expediente ${detalle.codigo} tiene la documentación completa? Pasará a «En revisión» para Calidad (RN-12).`,
      icon: 'pi pi-question-circle',
      acceptLabel: 'Completar documentos',
      rejectLabel: 'Cancelar',
      accept: () => this.subsanar(detalle.id, detalle.codigo),
    });
  }

  private subsanar(id: number, codigo: string): void {
    if (this.subsanando()) {
      return;
    }
    this.subsanando.set(true);
    this.expedienteService.marcarDocumentosCompletos(id).subscribe({
      next: () => {
        this.subsanando.set(false);
        this.mensajes.add({
          severity: 'success',
          summary: 'Documentos completos',
          detail: `${codigo} pasó a revisión de Calidad.`,
        });
        this.cargar(id);
      },
      error: (error) => {
        this.subsanando.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo completar',
          detail:
            (error as { error?: { message?: string } })?.error?.message ??
            'Ocurrió un error inesperado.',
        });
      },
    });
  }

  ngOnDestroy(): void {
    this.solicitudVista++;
    if (this.blobVersionCarta) URL.revokeObjectURL(this.blobVersionCarta);
    this.detenerPolling();
    if (this.blobUrlCarta) {
      URL.revokeObjectURL(this.blobUrlCarta);
    }
    if (this.blobUrlDocGenerado) {
      URL.revokeObjectURL(this.blobUrlDocGenerado);
    }
    if (this.blobUrlDocResolucion) URL.revokeObjectURL(this.blobUrlDocResolucion);
    if (this.blobVistaResolucion) URL.revokeObjectURL(this.blobVistaResolucion);
    if (this.blobArchivoOpp) URL.revokeObjectURL(this.blobArchivoOpp);
    if (this.blobComprobante) URL.revokeObjectURL(this.blobComprobante);
  }

  protected descargarCarta(): void {
    const detalle = this.detalle();
    const carta = this.carta();
    if (!detalle || !carta) {
      return;
    }
    this.archivoService.obtenerBlob(detalle.id, carta.id, true).subscribe({
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

  protected formatoSoles(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) {
      return '—';
    }
    return `S/ ${valor.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  protected formatoFecha(fecha: string | null | undefined): string {
    if (!fecha) {
      return '—';
    }
    const [anio, mes, dia] = fecha.slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
  }

  protected etiquetaEstado(estado: EstadoExpediente): string {
    return ESTADO_INFO[estado]?.label ?? estado;
  }

  protected condicionLaboral(tipo: string): string {
    return tipo === 'NOMBRADO' ? 'Nombrado' : tipo === 'CONTRATADO' ? 'Contratado' : tipo;
  }

  protected confirmarGenerarResolucion(trasGuardar = false): void {
    if (this.resolucionForm.invalid || this.guardandoResolucion()) {
      this.resolucionForm.markAllAsTouched();
      return;
    }
    const detalle = this.detalle();
    if (!detalle || (!trasGuardar && !this.puedeGenerarResolucion() && !detalle.resolucion)) return;
    const valores = this.resolucionForm.getRawValue();
    this.vistaResolucionGenerada.set(false);
    this.documentoResolucionVista.set(null);
    this.vistaResolucionVisible.set(true);
    this.cargandoVistaResolucion.set(true);
    this.errorVistaResolucion.set('');
    this.urlVistaResolucion.set(null);
    if (this.blobVistaResolucion) URL.revokeObjectURL(this.blobVistaResolucion);
    this.resolucionService.preview(detalle.id, {
      numero: valores.numero ?? 0,
      anio: valores.anio ?? new Date().getFullYear(),
      fecha_emision: this.iso(valores.fecha_emision) ?? '',
    }).subscribe({
      next: (blob) => {
        this.blobVistaResolucion = URL.createObjectURL(blob);
        this.urlVistaResolucion.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobVistaResolucion));
        this.cargandoVistaResolucion.set(false);
      },
      error: async (error) => {
        this.cargandoVistaResolucion.set(false);
        let mensaje = 'No se pudo crear la vista previa con la plantilla de resolución.';
        try {
          const contenido = error.error instanceof Blob ? JSON.parse(await error.error.text()) : error.error;
          mensaje = contenido?.message ?? mensaje;
        } catch {}
        this.errorVistaResolucion.set(mensaje);
      },
    });
  }

  protected verResolucionGenerada(documento: DocumentoGeneradoDetalle): void {
    const detalle = this.detalle();
    if (!detalle) return;
    this.vistaResolucionGenerada.set(true);
    this.documentoResolucionVista.set(documento);
    this.vistaResolucionVisible.set(true);
    this.cargandoVistaResolucion.set(true);
    this.errorVistaResolucion.set('');
    this.urlVistaResolucion.set(null);
    if (this.blobVistaResolucion) URL.revokeObjectURL(this.blobVistaResolucion);
    this.documentoService.obtenerBlob(detalle.id, documento.id, 'pdf').subscribe({
      next: (blob) => {
        this.blobVistaResolucion = URL.createObjectURL(blob);
        this.urlVistaResolucion.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobVistaResolucion));
        this.cargandoVistaResolucion.set(false);
      },
      error: () => {
        this.cargandoVistaResolucion.set(false);
        this.errorVistaResolucion.set('No se pudo cargar la resolución en PDF. Puedes descargar el documento Word.');
      },
    });
  }

  protected generarResolucion(): void {
    const detalle = this.detalle();
    if (!detalle || this.guardandoResolucion() || !this.urlVistaResolucion()) {
      return;
    }
    const valores = this.resolucionForm.getRawValue();
    this.guardandoResolucion.set(true);
    const payload = {
        numero: valores.numero ?? 0,
        anio: valores.anio ?? new Date().getFullYear(),
        fecha_emision: this.iso(valores.fecha_emision) ?? '',
      };
    const operacion = detalle.resolucion
      ? this.expedienteService.actualizarResolucion(detalle.id, payload)
      : this.expedienteService.generarResolucion(detalle.id, payload);
    operacion.subscribe({
        next: () => {
          this.guardandoResolucion.set(false);
          this.vistaResolucionVisible.set(false);
          const numeroFormateado = String(valores.numero ?? 0).padStart(3, '0');
          this.mensajes.add({
            severity: 'success',
            summary: `Resolución ${numeroFormateado}-${valores.anio} generada`,
            detail: 'El documento fue emitido correctamente.',
          });
          this.cargar(detalle.id);
        },
        error: (error) => {
          this.guardandoResolucion.set(false);
          this.mensajes.add({
            severity: 'error',
            summary: 'No se pudo generar',
            detail:
              (error as { error?: { message?: string } })?.error?.message ??
              'Ocurrió un error inesperado.',
          });
        },
      });
  }

  protected descargarDocResolucion(formato: 'pdf' | 'docx' = 'docx', version?: DocumentoGeneradoDetalle): void {
    const doc = version ?? this.documentoResolucionVista() ?? this.docResolucionGenerada();
    const detalle = this.detalle();
    if (!doc || !detalle) return;

    this.documentoService.obtenerBlob(detalle.id, doc.id, formato, formato === 'pdf').subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const resol = detalle.resolucion as unknown as { numero?: number; anio?: number } | undefined;
        const nombreBase = `Resolucion_${resol?.numero ?? '000'}_${resol?.anio ?? '2026'}_v${doc.version}`;
        a.download = `${nombreBase}.${formato}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.mensajes.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo descargar el documento.',
        });
      },
    });
  }

  protected anularDocumento(idDoc: number): void {
    const detalle = this.detalle();
    if (!detalle) return;
    this.confirmacion.confirm({
      header: 'Confirmar anulación',
      message: '¿Estás seguro de anular este documento? Perderá validez legal (es_vigente = 0).',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, anular',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.expedienteService.anularDocumento(detalle.id, idDoc).subscribe({
          next: () => {
            this.mensajes.add({
              severity: 'success',
              summary: 'Documento anulado',
              detail: 'Se ha registrado la anulación correctamente.',
            });
            this.cargar(detalle.id);
          },
          error: (error) => {
            this.mensajes.add({
              severity: 'error',
              summary: 'No se pudo anular',
              detail:
                (error as { error?: { message?: string } })?.error?.message ??
                'Ocurrió un error inesperado.',
            });
          },
        });
      },
    });
  }

  protected registrarDesembolso(): void {
    if (this.desembolsoForm.invalid || this.guardandoDesembolso()) {
      this.desembolsoForm.markAllAsTouched();
      return;
    }
    const detalle = this.detalle();
    if (!detalle || detalle.estado !== 'RESOLUCION_EMITIDA' || !this.puedeGestionarRendicion()) return;

    const fecha = this.desembolsoForm.value.fecha_desembolso;
    const monto = this.desembolsoForm.value.monto_desembolsado;
    if (!fecha || monto === null || monto === undefined) return;

    this.guardandoDesembolso.set(true);
    this.expedienteService
      .registrarDesembolso(detalle.id, { fecha_desembolso: this.iso(fecha) ?? '', monto_desembolsado: monto })
      .subscribe({
        next: () => {
          this.guardandoDesembolso.set(false);
          this.mensajes.add({ severity: 'success', summary: 'Éxito', detail: 'Fecha de desembolso registrada.' });
          this.cargar(detalle.id);
        },
        error: (error) => {
          this.guardandoDesembolso.set(false);
          this.mensajes.add({
            severity: 'error',
            summary: 'Error',
            detail: (error as { error?: { message?: string } })?.error?.message ?? 'Ocurrió un error inesperado.',
          });
        },
      });
  }

  protected abrirModalDoi(): void {
    this.doiForm.reset({ doi: this.detalle()?.articulo?.doi ?? '' });
    this.modalDoi.set(true);
  }

  protected actualizarDoi(): void {
    if (this.doiForm.invalid || this.guardandoDoi()) return;
    const detalle = this.detalle();
    if (!detalle) return;

    const doi = this.doiForm.value.doi;
    if (!doi) return;

    this.guardandoDoi.set(true);
    this.expedienteService
      .actualizarDoi(detalle.id, { doi })
      .subscribe({
        next: () => {
          this.guardandoDoi.set(false);
          this.modalDoi.set(false);
          this.mensajes.add({ severity: 'success', summary: 'Éxito', detail: 'DOI actualizado.' });
          this.cargar(detalle.id);
        },
        error: (error) => {
          this.guardandoDoi.set(false);
          this.mensajes.add({
            severity: 'error',
            summary: 'Error',
            detail: (error as { error?: { message?: string } })?.error?.message ?? 'Ocurrió un error inesperado.',
          });
        },
      });
  }

  protected seleccionarComprobante(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.archivoComprobanteSeleccionado.set(null);
    const detalle = this.detalle();
    if (!archivo || !detalle || !this.puedeGestionarRendicion() || this.adjuntandoComprobante()) {
      return;
    }
    input.value = '';
    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) {
      this.mensajes.add({ severity: 'error', summary: 'Archivo no permitido', detail: 'El comprobante debe ser PDF, JPG o PNG.' });
      return;
    }
    if (archivo.size > 25 * 1024 * 1024) {
      this.mensajes.add({ severity: 'error', summary: 'Archivo muy grande', detail: 'El comprobante no puede superar los 25 MB.' });
      return;
    }
    this.archivoComprobanteSeleccionado.set(archivo);
  }

  protected subirComprobante(): void {
    const detalle = this.detalle();
    const archivo = this.archivoComprobanteSeleccionado();
    if (!detalle || !archivo || !this.puedeGestionarRendicion()
      || !['POR_RENDIR', 'RENDICION_VENCIDA'].includes(detalle.estado) || this.adjuntandoComprobante()) return;

    this.adjuntandoComprobante.set(true);
    this.expedienteService.subirArchivo(detalle.id, archivo, 'COMPROBANTE_RENDICION', 4).subscribe({
      next: (guardado) => {
        this.adjuntandoComprobante.set(false);
        this.archivoComprobanteSeleccionado.set(null);
        const nuevo: ArchivoDetalle = {
          id: guardado.id,
          tipo: 'COMPROBANTE_RENDICION',
          etapa: 4,
          nombre_original: guardado.nombre_original,
          mime: guardado.mime ?? archivo.type,
          tamano_bytes: guardado.tamano_bytes ?? archivo.size,
          sha256: guardado.sha256 ?? null,
          created_at: new Date().toISOString(),
        };
        this.detalle.update((actual) => actual && actual.id === detalle.id
          ? { ...actual, archivos: [nuevo, ...actual.archivos] }
          : actual);
        this.mensajes.add({ severity: 'success', summary: 'Comprobante adjuntado', detail: guardado.nombre_original });
        this.cargar(detalle.id, true);
      },
      error: (error) => {
        this.adjuntandoComprobante.set(false);
        this.mensajes.add({
          severity: 'error',
          summary: 'No se pudo adjuntar',
          detail: (error as { error?: { message?: string } })?.error?.message ?? 'Ocurrió un error inesperado.',
        });
      },
    });
  }

  protected verComprobante(archivo: ArchivoDetalle): void {
    const detalle = this.detalle();
    if (!detalle) return;
    this.vistaComprobanteVisible.set(true);
    this.urlComprobante.set(null);
    this.urlImagenComprobante.set(null);
    this.errorComprobante.set(false);
    this.archivoService.obtenerBlob(detalle.id, archivo.id).subscribe({
      next: (blob) => {
        if (this.blobComprobante) URL.revokeObjectURL(this.blobComprobante);
        this.blobComprobante = URL.createObjectURL(blob);
        if (this.esImagenComprobante(archivo)) {
          this.urlImagenComprobante.set(this.blobComprobante);
        } else {
          this.urlComprobante.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobComprobante));
        }
      },
      error: () => this.errorComprobante.set(true),
    });
  }

  protected etiquetaComprobante(archivo: ArchivoDetalle): string {
    const extension = archivo.nombre_original.split('.').pop()?.toLowerCase();
    return extension === 'png' ? 'PNG' : extension === 'jpg' || extension === 'jpeg' ? 'JPG' : 'PDF';
  }

  protected esImagenComprobante(archivo: ArchivoDetalle): boolean {
    return ['JPG', 'PNG'].includes(this.etiquetaComprobante(archivo));
  }

  protected retirarComprobante(archivo: ArchivoDetalle): void {
    const detalle = this.detalle();
    if (!detalle || !this.puedeGestionarRendicion()
      || !['POR_RENDIR', 'RENDICION_VENCIDA'].includes(detalle.estado) || this.retirandoComprobante() !== null) return;
    this.confirmacion.confirm({
      header: 'Retirar comprobante',
      message: `¿Retirar ${archivo.nombre_original} de la rendición?`,
      acceptLabel: 'Retirar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.retirandoComprobante.set(archivo.id);
        this.expedienteService.retirarComprobante(detalle.id, archivo.id).subscribe({
          next: () => {
            this.detalle.update((actual) => actual && actual.id === detalle.id
              ? { ...actual, archivos: actual.archivos.filter((item) => item.id !== archivo.id) }
              : actual);
            this.retirandoComprobante.set(null);
            this.cargar(detalle.id, true);
          },
          error: (error) => {
            this.retirandoComprobante.set(null);
            this.mensajes.add({ severity: 'error', summary: 'No se pudo retirar', detail: (error as { error?: { message?: string } })?.error?.message ?? 'Intenta de nuevo.' });
          },
        });
      },
    });
  }

  protected cerrarRendicion(): void {
    if (this.rendicionForm.invalid || this.cerrandoRendicion()) {
      this.rendicionForm.markAllAsTouched();
      return;
    }
    const detalle = this.detalle();
    if (!detalle || !this.puedeGestionarRendicion()
      || !['POR_RENDIR', 'RENDICION_VENCIDA'].includes(detalle.estado)
      || this.comprobantes().length === 0 || this.adjuntandoComprobante() || this.retirandoComprobante() !== null) return;

    const fecha = this.rendicionForm.value.fecha_informe;
    if (!fecha) return;

    this.confirmacion.confirm({
      header: 'Confirmar cierre de rendición',
      message: '¿Estás seguro de cerrar esta rendición? No podrás agregar más comprobantes ni editar la fecha.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cerrar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.cerrandoRendicion.set(true);
        this.expedienteService
          .cerrarRendicion(detalle.id, {
            fecha_informe: this.iso(fecha) ?? '',
            doi: this.rendicionForm.controls.doi.value?.trim() || null,
          })
          .subscribe({
            next: () => {
              this.cerrandoRendicion.set(false);
              this.mensajes.add({ severity: 'success', summary: 'Rendición cerrada', detail: 'El trámite ha finalizado.' });
              this.cargar(detalle.id);
            },
            error: (error) => {
              this.cerrandoRendicion.set(false);
              this.mensajes.add({
                severity: 'error',
                summary: 'No se pudo cerrar',
                detail: (error as { error?: { message?: string } })?.error?.message ?? 'Ocurrió un error inesperado.',
              });
            },
          });
      },
    });
  }

  protected iniciales(nombre: string | null | undefined): string {
    if (!nombre) {
      return '?';
    }
    const palabras = nombre.trim().split(/\s+/);
    return (palabras[0]?.[0] ?? '') + (palabras[1]?.[0] ?? '');
  }

  protected checklistItems(checklist: Record<string, boolean>): { etiqueta: string; cumple: boolean }[] {
    const etiquetas: Record<string, string> = {
      carta_aceptacion: 'Carta Oficial de Aceptación',
      docente_ordinario_contratado: 'Docente Ordinario/Contratado',
      afiliacion_universidad: 'Contar con afiliación a la Universidad',
    };
    return Object.entries(checklist).map(([clave, cumple]) => ({
      etiqueta: etiquetas[clave] ?? clave,
      cumple: Boolean(cumple),
    }));
  }

  private prepararVistaCarta(detalle: ExpedienteDetalle): void {
    const carta: ArchivoDetalle | null =
      detalle.archivos.find((a) => a.tipo === 'CARTA_DOCENTE') ?? null;
    const mime = (carta?.mime ?? '').toLowerCase();
    if (!carta || (!mime.includes('pdf') && !mime.startsWith('image')) || carta.id === this.archivoCartaCargadoId) {
      return;
    }
    this.archivoCartaCargadoId = carta.id;
    this.archivoService.obtenerBlob(detalle.id, carta.id).subscribe({
      next: (blob) => {
        if (this.carta()?.id !== carta.id) return;
        if (this.blobUrlCarta) URL.revokeObjectURL(this.blobUrlCarta);
        this.blobUrlCarta = URL.createObjectURL(blob);
        this.urlCarta.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrlCarta));
      },
      error: () => {
        this.mensajes.add({
          severity: 'warn',
          summary: 'Vista previa no disponible',
          detail: 'No se pudo cargar la vista previa de la carta; usa «Descargar».',
        });
      },
    });
  }
}

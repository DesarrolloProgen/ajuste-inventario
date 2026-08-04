import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs/operators';
import { EstadoSolicitud, LINEAS_COMERCIALES, Solicitud } from '../../../core/models';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { SolicitudPdfService } from '../../../core/services/solicitud-pdf.service';
import { FiltrosSolicitud, SolicitudService } from '../../../core/services/solicitud.service';
import { EstadoBadge } from '../../../shared/components/estado-badge/estado-badge';

@Component({
  selector: 'app-solicitud-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    EstadoBadge,
  ],
  templateUrl: './solicitud-list.html',
  styleUrl: './solicitud-list.scss',
})
export class SolicitudList {
  private readonly solicitudService = inject(SolicitudService);
  private readonly solicitudPdfService = inject(SolicitudPdfService);
  private readonly notificacion = inject(NotificacionService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly estadosDisponibles = Object.values(EstadoSolicitud);
  protected readonly lineasComerciales = LINEAS_COMERCIALES;
  protected readonly columnas = ['numero', 'fecha', 'solicitante', 'lineaComercial', 'estado', 'total', 'acciones'];
  protected readonly solicitudes = signal<Solicitud[]>([]);
  protected readonly hayMas = signal(false);
  protected readonly cargandoMas = signal(false);

  protected readonly filtros = this.fb.nonNullable.group({
    estado: [''],
    solicitante: [''],
    lineaComercial: [''],
    fecha: [''],
  });

  private filtrosActuales: FiltrosSolicitud = {};
  private ultimoId?: number;

  constructor() {
    this.buscar();
    this.filtros.valueChanges.pipe(debounceTime(300)).subscribe(() => this.buscar());
  }

  protected verSolicitud(id: string): void {
    this.router.navigate(['/solicitudes', id]);
  }

  protected generarPdf(solicitud: Solicitud): void {
    this.solicitudPdfService
      .generar(solicitud)
      .catch(() => this.notificacion.error('No se pudo generar el PDF de la solicitud.'));
  }

  protected cargarMas(): void {
    if (!this.hayMas() || this.cargandoMas()) return;
    this.cargandoMas.set(true);
    this.solicitudService.listar(this.filtrosActuales, { ultimoId: this.ultimoId }).subscribe((pagina) => {
      this.solicitudes.update((actuales) => [...actuales, ...pagina.datos]);
      this.hayMas.set(pagina.hayMas);
      this.ultimoId = pagina.ultimoId;
      this.cargandoMas.set(false);
    });
  }

  private buscar(): void {
    const valor = this.filtros.getRawValue();
    this.filtrosActuales = {
      estado: (valor.estado as EstadoSolicitud) || '',
      solicitante: valor.solicitante,
      lineaComercial: valor.lineaComercial,
      fechaDesde: valor.fecha || undefined,
      fechaHasta: valor.fecha || undefined,
    };
    this.ultimoId = undefined;
    this.solicitudService.listar(this.filtrosActuales).subscribe((pagina) => {
      this.solicitudes.set(pagina.datos);
      this.hayMas.set(pagina.hayMas);
      this.ultimoId = pagina.ultimoId;
    });
  }
}

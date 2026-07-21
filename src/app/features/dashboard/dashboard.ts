import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EstadoSolicitud, Solicitud } from '../../core/models';
import { SolicitudService } from '../../core/services/solicitud.service';
import { EstadoBadge } from '../../shared/components/estado-badge/estado-badge';

const ESTADOS_PENDIENTES = new Set<EstadoSolicitud>([EstadoSolicitud.Pendiente]);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, MatCardModule, MatTableModule, MatIconModule, MatButtonModule, EstadoBadge],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly solicitudService = inject(SolicitudService);

  protected readonly solicitudes = signal<Solicitud[]>([]);
  protected readonly columnas = ['numero', 'solicitante', 'fecha', 'lineaComercial', 'estado', 'total'];

  protected readonly indicadores = computed(() => {
    const datos = this.solicitudes();
    return {
      creadas: datos.length,
      pendientes: datos.filter((s) => ESTADOS_PENDIENTES.has(s.estado)).length,
      aprobadas: datos.filter((s) => s.estado === EstadoSolicitud.Aprobado).length,
      rechazadas: datos.filter((s) => s.estado === EstadoSolicitud.Rechazado).length,
    };
  });

  protected readonly ultimasSolicitudes = computed(() => this.solicitudes().slice(0, 5));

  constructor() {
    // El GET-ALL pagina: los indicadores solo reflejan esta primera tanda (no todo el histórico).
    this.solicitudService.listar({}, { top: 500 }).subscribe((pagina) => this.solicitudes.set(pagina.datos));
  }
}

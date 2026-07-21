import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Solicitud } from '../../../core/models';
import { NotificacionService } from '../../../core/services/notificacion.service';
import { SolicitudPdfService } from '../../../core/services/solicitud-pdf.service';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { EstadoBadge } from '../../../shared/components/estado-badge/estado-badge';
import { SolicitudExcelDialog } from '../solicitud-excel-dialog/solicitud-excel-dialog';

@Component({
  selector: 'app-solicitud-detail',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatTableModule, EstadoBadge],
  templateUrl: './solicitud-detail.html',
  styleUrl: './solicitud-detail.scss',
})
export class SolicitudDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly solicitudService = inject(SolicitudService);
  private readonly solicitudPdfService = inject(SolicitudPdfService);
  private readonly notificacion = inject(NotificacionService);
  private readonly dialog = inject(MatDialog);

  protected readonly solicitud = signal<Solicitud | null>(null);
  protected readonly columnasItems = [
    'codigoReferencia',
    'descripcion',
    'bodega',
    'cantidad',
    'costoUnitario',
    'costoTotal',
  ];

  constructor() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.solicitudService.obtenerPorId(id).subscribe((solicitud) => {
      if (!solicitud) {
        this.router.navigate(['/solicitudes']);
        return;
      }
      this.solicitud.set(solicitud);
    });
  }

  protected generarPdf(solicitud: Solicitud): void {
    this.solicitudPdfService
      .generar(solicitud)
      .catch(() => this.notificacion.error('No se pudo generar el PDF de la solicitud.'));
  }

  protected abrirGenerarExcel(solicitud: Solicitud): void {
    this.dialog.open(SolicitudExcelDialog, { data: { solicitud }, width: '720px' });
  }
}

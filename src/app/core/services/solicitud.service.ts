import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { DetalleSolicitud, EstadoSolicitud, Solicitud, SolicitudFormValue } from '../models';
import { AjusteInventarioApiService } from './ajuste-inventario-api.service';

export interface FiltrosSolicitud {
  estado?: EstadoSolicitud | '';
  solicitante?: string;
  lineaComercial?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface OpcionesPaginacion {
  top?: number;
  /** Id (numérico, el de SharePoint) del último registro de la página anterior. */
  ultimoId?: number;
}

export interface PaginaSolicitudes {
  datos: Solicitud[];
  hayMas: boolean;
  /** Id a usar como `ultimoId` para pedir la siguiente página. */
  ultimoId?: number;
}

const TAMANO_PAGINA_DEFECTO = 20;

/**
 * Orquesta las reglas de negocio de las solicitudes contra la API real (Power Automate / SharePoint).
 * No hay estado de borrador: una solicitud se crea directamente en "Pendiente" con un único POST.
 * El consecutivo `numero` no lo manda el front ni lo asigna el flujo como tal: se construye como
 * "AJ-" + `id` de la respuesta del servidor (ver `AjusteInventarioApiService.normalizarSolicitud`).
 */
@Injectable({ providedIn: 'root' })
export class SolicitudService {
  private readonly api = inject(AjusteInventarioApiService);

  /**
   * `estado`/`solicitante`/`lineaComercial` se filtran en el propio flujo (GET-ALL); `fechaDesde`/
   * `fechaHasta` no están en ese esquema, así que se filtran acá sobre la página ya recibida.
   */
  listar(filtros: FiltrosSolicitud = {}, paginacion: OpcionesPaginacion = {}): Observable<PaginaSolicitudes> {
    const top = paginacion.top ?? TAMANO_PAGINA_DEFECTO;
    return this.api
      .obtenerTodos({
        estado: filtros.estado || undefined,
        solicitante: filtros.solicitante || undefined,
        lineaComercial: filtros.lineaComercial || undefined,
        top,
        ultimoId: paginacion.ultimoId,
      })
      .pipe(
        map(({ datos, hayMas }) => {
          let resultado = datos;
          if (filtros.fechaDesde) resultado = resultado.filter((s) => s.fecha >= filtros.fechaDesde!);
          if (filtros.fechaHasta) resultado = resultado.filter((s) => s.fecha <= filtros.fechaHasta!);
          resultado = [...resultado].sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
          const ultimoId = datos.length > 0 ? Number(datos[datos.length - 1].id) : undefined;
          return { datos: resultado, hayMas, ultimoId };
        }),
      );
  }

  obtenerPorId(id: string): Observable<Solicitud | undefined> {
    return this.api.obtenerPorId(id);
  }

  /** Crea la solicitud directamente en estado Pendiente con un único POST. */
  crear(payload: SolicitudFormValue): Observable<Solicitud> {
    if (payload.items.length === 0) {
      return throwError(() => new Error('La solicitud debe tener al menos un ítem.'));
    }
    if (!payload.aprobadorGerencia || !payload.aprobadorAlmacen) {
      return throwError(() => new Error('Seleccione el aprobador de Gerencia y de Almacén antes de enviar.'));
    }

    const ahora = new Date().toISOString();
    const items = this.calcularItems(payload.items);
    const totalGeneral = this.calcularTotal(items);
    const nueva: Solicitud = {
      id: 'sol-' + crypto.randomUUID(),
      numero: '',
      estado: EstadoSolicitud.Pendiente,
      ...payload,
      items,
      totalGeneral,
      fechaCreacion: ahora,
      fechaActualizacion: ahora,
    };
    return this.api.guardar(nueva);
  }

  private calcularItems(items: DetalleSolicitud[]): DetalleSolicitud[] {
    return items.map((it) => ({
      ...it,
      id: it.id || 'det-' + crypto.randomUUID(),
      costoTotal: Math.round(it.cantidad * it.costoUnitario * 100) / 100,
    }));
  }

  private calcularTotal(items: DetalleSolicitud[]): number {
    return Math.round(items.reduce((acc, it) => acc + it.costoTotal, 0) * 100) / 100;
  }
}

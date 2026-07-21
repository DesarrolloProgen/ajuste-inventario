import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Solicitud } from '../models';
import { UsuarioService } from './usuario.service';

/**
 * URL del flujo de Power Automate que respalda la lista de SharePoint "Ajustes de Inventario".
 * Una misma URL atiende las 3 operaciones; el header `action` le indica al flujo cuál ejecutar.
 *
 * ADVERTENCIA DE SEGURIDAD: la URL trae su propia firma de autorización (`sig=`) embebida.
 * Al llamarla directamente desde el navegador, esa firma queda visible en el bundle/las
 * peticiones de red para cualquiera que use la app. Es un riesgo aceptado temporalmente
 * porque la app aún no tiene backend propio que la proxee.
 */
const URL_API_AJUSTES =
  'https://defaultf97c6a06f3134f6ea6f32586979707.64.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/30/workflows/b7762fdd756143fda25d000e1d14fcc5/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=yC-61Lg9K-IcZRMF9red0zB2_ix5Z40JMlo9HsDGmpI';

type AccionApi = 'GET' | 'GET-ALL' | 'POST';

/** Filtros/paginación que acepta el GET-ALL del flujo (esquema acordado con Power Automate). */
export interface FiltrosApiAjustes {
  estado?: string;
  solicitante?: string;
  lineaComercial?: string;
  top?: number;
  ultimoId?: number;
}

export interface PaginaApiAjustes {
  datos: Solicitud[];
  /** Heurística: hay más páginas si volvieron tantos registros como se pidieron con `top`. */
  hayMas: boolean;
}

/** Acceso HTTP a la lista de SharePoint "Ajustes de Inventario" vía el flujo de Power Automate. */
@Injectable({ providedIn: 'root' })
export class AjusteInventarioApiService {
  private readonly http = inject(HttpClient);
  private readonly usuarioService = inject(UsuarioService);

  obtenerTodos(filtros: FiltrosApiAjustes = {}): Observable<PaginaApiAjustes> {
    const body: Record<string, string | number> = {};
    if (filtros.estado) body['estado'] = filtros.estado;
    if (filtros.solicitante) body['solicitante'] = filtros.solicitante;
    if (filtros.lineaComercial) body['lineaComercial'] = filtros.lineaComercial;
    if (filtros.top) body['top'] = filtros.top;
    if (filtros.ultimoId != null) body['ultimoId'] = filtros.ultimoId;

    return this.http.post<unknown>(URL_API_AJUSTES, body, { headers: this.headers('GET-ALL') }).pipe(
      map((respuesta) => {
        const lista = Array.isArray(respuesta)
          ? respuesta
          : ((respuesta as { value?: unknown[] } | null)?.value ?? []);
        const datos = lista.map((item) => this.normalizarSolicitud(item));
        const hayMas = !!filtros.top && datos.length === filtros.top;
        return { datos, hayMas };
      }),
    );
  }

  obtenerPorId(id: string): Observable<Solicitud | undefined> {
    return this.http
      .post<unknown>(URL_API_AJUSTES, { id }, { headers: this.headers('GET') })
      .pipe(map((respuesta) => (respuesta ? this.normalizarSolicitud(respuesta) : undefined)));
  }

  /** Crea o actualiza (upsert) el ajuste según si ya existe `id`. Resuelve los correos de los
   * aprobadores seleccionados (por nombre) porque el esquema de la API los pide aparte. */
  guardar(solicitud: Solicitud): Observable<Solicitud> {
    return forkJoin({
      correoAprobadorGerencia: this.usuarioService.correoPorNombre(solicitud.aprobadorGerencia),
      correoAprobadorAlmacen: this.usuarioService.correoPorNombre(solicitud.aprobadorAlmacen),
    }).pipe(
      switchMap(({ correoAprobadorGerencia, correoAprobadorAlmacen }) => {
        const payload = { ...solicitud, correoAprobadorGerencia, correoAprobadorAlmacen };
        return this.http.post<unknown>(URL_API_AJUSTES, payload, { headers: this.headers('POST') });
      }),
      map((respuesta) => (respuesta ? this.normalizarSolicitud(respuesta) : solicitud)),
    );
  }

  private headers(accion: AccionApi): HttpHeaders {
    return new HttpHeaders({ action: accion });
  }

  /**
   * Normaliza lo que devuelve SharePoint al esquema interno de `Solicitud`:
   * - `id` llega como el ID numérico de la lista (SharePoint); se guarda como string.
   * - `items` puede llegar como string JSON o como array real; queda siempre como array tipado.
   * - `numero` no lo asigna el flujo: se construye acá como "AJ-" + `id` de la respuesta.
   */
  private normalizarSolicitud(raw: unknown): Solicitud {
    const solicitud = raw as Solicitud & { id: unknown; items: unknown };
    let items = solicitud.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }
    return {
      ...solicitud,
      id: String(solicitud.id),
      numero: 'AJ-' + solicitud.id,
      items: items ?? [],
    } as Solicitud;
  }
}

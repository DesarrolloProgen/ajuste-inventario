import { DetalleSolicitud } from './detalle-solicitud.model';
import { EstadoSolicitud } from './enums';

export interface Solicitud {
  id: string;
  numero: string;
  solicitante: string;
  fecha: string;
  lineaComercial: string;
  observaciones: string;
  estado: EstadoSolicitud;
  items: DetalleSolicitud[];
  totalGeneral: number;
  /** Aprobador de Gerencia asignado al enviar la solicitud (se le notifica por correo). */
  aprobadorGerencia: string;
  /** Aprobador de Almacén asignado al enviar la solicitud (se le notifica por correo). */
  aprobadorAlmacen: string;
  /** "Aprobado"/"Rechazado" una vez Gerencia responde; vacío mientras está pendiente. */
  estadoGerencia?: string;
  /** "Aprobado"/"Rechazado" una vez Almacén responde; vacío mientras está pendiente. */
  estadoAlmacen?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/** Payload editable desde el formulario, sin campos derivados/controlados por el sistema. */
export type SolicitudFormValue = Pick<
  Solicitud,
  'solicitante' | 'fecha' | 'lineaComercial' | 'observaciones' | 'items' | 'aprobadorGerencia' | 'aprobadorAlmacen'
>;

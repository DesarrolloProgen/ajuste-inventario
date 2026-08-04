export enum EstadoSolicitud {
  Pendiente = 'Pendiente',
  Aprobado = 'Aprobado',
  Rechazado = 'Rechazado',
}

export const LINEAS_COMERCIALES = [
  'FUMIGADORAS + (I+B+K)',
  'MOTORIZADOS',
  'TDA + EQUIP. EPECIALES',
  'FUM. CON DRONES',
  'INSTRUMENTACION',
  'ENVASES',
  'SEÑALIZACION ',
  'STIHL',
  'OTRO',
] as const;

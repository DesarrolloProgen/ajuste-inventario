import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Solicitud } from '../models';
import { ArchivoGenerado } from './solicitud-pdf.service';

/** Campos que el usuario diligencia manualmente para la cabecera del Excel (fila 1: C1, D1, E1). */
export interface ExcelCabecera {
  /** C1 — Tipo de movimiento (ej. "501"). */
  tipoMovimiento: string;
  /** D1 — Fecha del movimiento, formato ISO yyyy-MM-dd. */
  fecha: string;
  /** E1 — Centro de costo (ej. "VT11"). */
  centroCosto: string;
  /** Columna H de cada línea (fila 2+). */
  observaciones: string;
}

interface FilaExportada {
  columna: string;
  a: string;
  b: string;
  c: string;
  d: string;
  h: string;
}

const COLUMNAS = 8; // A..H

/**
 * Genera el archivo de importación de movimientos de inventario en xlsx.
 * Este servicio únicamente ESCRIBE archivos construidos con datos propios de la app;
 * nunca lee/parsea hojas de cálculo externas, por lo que no ejercita las
 * vulnerabilidades de parsing conocidas de la librería `xlsx`.
 */
@Injectable({ providedIn: 'root' })
export class SolicitudExcelService {
  generar(solicitud: Solicitud, cabecera: ExcelCabecera): void {
    const wb = this.construirLibro(solicitud, cabecera);
    XLSX.writeFile(wb, `${solicitud.numero}.xlsx`);
  }

  /** Construye el mismo libro y lo devuelve en base64, sin descargarlo (para adjuntarlo a una API). */
  generarBase64(solicitud: Solicitud, cabecera: ExcelCabecera): ArchivoGenerado {
    const wb = this.construirLibro(solicitud, cabecera);
    const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    return { base64, nombreArchivo: `${solicitud.numero}.xlsx` };
  }

  private construirLibro(solicitud: Solicitud, cabecera: ExcelCabecera): XLSX.WorkBook {
    const ws: XLSX.WorkSheet = {};

    this.setCell(ws, 'A1', 'A', 's');
    this.setCell(ws, 'B1', '01', 's');
    this.setCell(ws, 'C1', cabecera.tipoMovimiento, 's');
    this.setCell(ws, 'D1', this.aSerialExcel(cabecera.fecha), 'n', 'dd/mm/yyyy');
    this.setCell(ws, 'E1', cabecera.centroCosto, 's');

    solicitud.items.forEach((item, indice) => {
      const fila = indice + 2;
      this.setCell(ws, `A${fila}`, 'B', 's');
      this.setCell(ws, `B${fila}`, item.codigoReferencia, 's');
      this.setCell(ws, `C${fila}`, item.bodega, 's');
      this.setCell(ws, `D${fila}`, item.cantidad, 'n');
      if (cabecera.observaciones) this.setCell(ws, `H${fila}`, cabecera.observaciones, 's');
    });

    const ultimaFila = 1 + solicitud.items.length;
    ws['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: ultimaFila - 1, c: COLUMNAS - 1 },
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ajuste');
    return wb;
  }

  /** Filas tal como quedarán en el Excel, para mostrar la vista previa en el diálogo. */
  previsualizar(solicitud: Solicitud, cabecera: ExcelCabecera): FilaExportada[] {
    const encabezado: FilaExportada = {
      columna: '1',
      a: 'A',
      b: '01',
      c: cabecera.tipoMovimiento || '—',
      d: cabecera.fecha || '—',
      h: '',
    };
    const filas = solicitud.items.map((item, indice) => ({
      columna: String(indice + 2),
      a: 'B',
      b: item.codigoReferencia,
      c: item.bodega,
      d: String(item.cantidad),
      h: cabecera.observaciones || '',
    }));
    return [encabezado, ...filas];
  }

  private setCell(
    ws: XLSX.WorkSheet,
    direccion: string,
    valor: string | number | Date,
    tipo: 's' | 'n' | 'd',
    formato?: string,
  ): void {
    const celda: XLSX.CellObject = { t: tipo, v: valor };
    if (formato) celda.z = formato;
    ws[direccion] = celda;
  }

  /**
   * Serial de fecha de Excel (sistema 1900), calculado con aritmética entera en UTC.
   * Evita la deriva de punto flotante de convertir un `Date` local con `t:'d'`,
   * que en ciertas fechas/zonas horarias hace que Excel muestre el día anterior.
   */
  private aSerialExcel(fechaIso: string): number {
    const [aa, mm, dd] = fechaIso.split('-').map(Number);
    const fechaUtc = Date.UTC(aa, (mm || 1) - 1, dd || 1);
    const epocaExcel = Date.UTC(1899, 11, 30);
    return Math.round((fechaUtc - epocaExcel) / 86400000);
  }
}

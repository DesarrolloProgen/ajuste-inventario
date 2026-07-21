import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Solicitud } from '../models';

const MARGEN = 10;
const ANCHO_PAGINA = 215.9; // letter, mm
const ANCHO_CONTENIDO = ANCHO_PAGINA - MARGEN * 2;

const MONEDA = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

interface LogoInfo {
  dataUrl: string;
  width: number;
  height: number;
}

export interface ArchivoGenerado {
  base64: string;
  nombreArchivo: string;
}

/** Genera el PDF "AJ200 - Solicitud movimientos de inventario" a partir de una Solicitud. */
@Injectable({ providedIn: 'root' })
export class SolicitudPdfService {
  async generar(solicitud: Solicitud): Promise<void> {
    const doc = await this.construirDocumento(solicitud);
    doc.save(`${solicitud.numero}.pdf`);
  }

  /** Construye el mismo PDF y lo devuelve en base64, sin descargarlo (para adjuntarlo a una API). */
  async generarBase64(solicitud: Solicitud): Promise<ArchivoGenerado> {
    const doc = await this.construirDocumento(solicitud);
    const nombreArchivo = `${solicitud.numero}.pdf`;
    const dataUri = doc.output('datauristring', { filename: nombreArchivo });
    const base64 = dataUri.substring(dataUri.indexOf('base64,') + 'base64,'.length);
    return { base64, nombreArchivo };
  }

  private async construirDocumento(solicitud: Solicitud): Promise<jsPDF> {
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const logo = await this.cargarLogo();

    let y = this.dibujarEncabezado(doc, solicitud, logo);
    y = this.dibujarSolicitante(doc, solicitud, y);
    y = this.dibujarLineaComercial(doc, solicitud, y);
    y = this.dibujarTablaItems(doc, solicitud, y);
    y = this.dibujarObservaciones(doc, solicitud, y);
    this.dibujarFirmas(doc, solicitud, y);
    this.dibujarPie(doc, solicitud);

    return doc;
  }

  private async cargarLogo(): Promise<LogoInfo | null> {
    try {
      const response = await fetch('/logo_progen.jpeg');
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('No se pudo leer el logo.'));
        img.src = dataUrl;
      });
      return { dataUrl, width, height };
    } catch {
      return null;
    }
  }

  private dibujarEncabezado(doc: jsPDF, solicitud: Solicitud, logo: LogoInfo | null): number {
    const yInicio = MARGEN;
    const alto = 24;
    const anchoLogo = 55;
    const anchoFecha = 46;
    const xTitulo = MARGEN + anchoLogo;
    const anchoTitulo = ANCHO_CONTENIDO - anchoLogo - anchoFecha;
    const xFecha = MARGEN + anchoLogo + anchoTitulo;

    doc.setLineWidth(0.3);
    doc.rect(MARGEN, yInicio, anchoLogo, alto);
    doc.rect(xTitulo, yInicio, anchoTitulo, alto);
    doc.rect(xFecha, yInicio, anchoFecha, alto);

    if (logo) {
      const padding = 2;
      const cajaAncho = anchoLogo - padding * 2;
      const cajaAlto = alto - padding * 2;
      const escala = Math.min(cajaAncho / logo.width, cajaAlto / logo.height);
      const anchoImg = logo.width * escala;
      const altoImg = logo.height * escala;
      const x = MARGEN + (anchoLogo - anchoImg) / 2;
      const yImg = yInicio + (alto - altoImg) / 2;
      doc.addImage(logo.dataUrl, 'JPEG', x, yImg, anchoImg, altoImg);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('PROGEN', MARGEN + anchoLogo / 2, yInicio + alto / 2, { align: 'center' });
    }

    doc.setFillColor(225, 225, 225);
    doc.rect(xTitulo, yInicio, anchoTitulo, 8, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CONTABILIDAD', xTitulo + anchoTitulo / 2, yInicio + 5.5, { align: 'center' });
    doc.setFontSize(11.5);
    const tituloLineas = doc.splitTextToSize('SOLICITUD MOVIMIENTOS DE INVENTARIO', anchoTitulo - 4);
    doc.text(tituloLineas, xTitulo + anchoTitulo / 2, yInicio + 15, { align: 'center' });

    const [aa, mm, dd] = solicitud.fecha.split('-');
    const anchoCasilla = anchoFecha / 3;
    const valores: [string, string][] = [
      [aa ?? '', 'AA'],
      [mm ?? '', 'MM'],
      [dd ?? '', 'DD'],
    ];
    valores.forEach(([valor, etiqueta], i) => {
      const x = xFecha + anchoCasilla * i;
      doc.rect(x, yInicio, anchoCasilla, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(valor, x + anchoCasilla / 2, yInicio + 9.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(etiqueta, x + anchoCasilla / 2, yInicio + 17.5, { align: 'center' });
    });
    doc.setFontSize(7);
    doc.text('FECHA', xFecha + anchoFecha / 2, yInicio + 22, { align: 'center' });

    return yInicio + alto;
  }

  private dibujarSolicitante(doc: jsPDF, solicitud: Solicitud, y: number): number {
    const alto = 9;
    doc.rect(MARGEN, y, ANCHO_CONTENIDO, alto);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SOLICITAN', MARGEN + 3, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(solicitud.solicitante, MARGEN + 26, y + 6);
    doc.line(MARGEN + 24, y + 7.5, ANCHO_PAGINA - MARGEN - 3, y + 7.5);
    return y + alto;
  }

  private dibujarLineaComercial(doc: jsPDF, solicitud: Solicitud, y: number): number {
    const alto = 11;
    doc.rect(MARGEN, y, ANCHO_CONTENIDO, alto);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('LINEA COMERCIAL:', MARGEN + 3, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(solicitud.lineaComercial, MARGEN + 38, y + 6);
    doc.line(MARGEN + 36, y + 7.5, ANCHO_PAGINA - MARGEN - 3, y + 7.5);
    return y + alto;
  }

  private dibujarTablaItems(doc: jsPDF, solicitud: Solicitud, y: number): number {
    const filas = solicitud.items.map((item, i) => [
      String(i + 1),
      item.codigoReferencia,
      item.descripcion,
      item.bodega,
      String(item.cantidad),
      MONEDA.format(item.costoUnitario),
      MONEDA.format(item.costoTotal),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGEN, right: MARGEN },
      theme: 'grid',
      head: [['N°', 'REFERENCIA', 'DESCRIPCIÓN', 'BOD', 'CANT.', 'COSTO UNIT.', 'COSTO TOTAL']],
      body: filas,
      foot: [['', '', '', '', '', 'TOTAL', MONEDA.format(solicitud.totalGeneral)]],
      styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2 },
      headStyles: { fillColor: [225, 225, 225], textColor: [0, 0, 0], halign: 'center', fontStyle: 'bold' },
      footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'right' },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 63 },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 16, halign: 'right' },
        5: { cellWidth: 27, halign: 'right' },
        6: { cellWidth: 27, halign: 'right' },
      },
    });

    return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  private dibujarObservaciones(doc: jsPDF, solicitud: Solicitud, y: number): number {
    const alturaEncabezado = 6;
    doc.setFillColor(225, 225, 225);
    doc.rect(MARGEN, y, ANCHO_CONTENIDO, alturaEncabezado, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('OBSERVACIONES', ANCHO_PAGINA / 2, y + 4.2, { align: 'center' });

    const texto = solicitud.observaciones?.trim() || 'Sin observaciones.';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lineas = doc.splitTextToSize(texto, ANCHO_CONTENIDO - 6);
    const altoCaja = Math.max(16, lineas.length * 5 + 4);
    doc.rect(MARGEN, y + alturaEncabezado, ANCHO_CONTENIDO, altoCaja);
    doc.text(lineas, MARGEN + 3, y + alturaEncabezado + 5);

    return y + alturaEncabezado + altoCaja;
  }

  private dibujarFirmas(doc: jsPDF, solicitud: Solicitud, y: number): void {
    const yInicio = y + 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Vo.Bo.', MARGEN, y + 5);

    const columnas: { etiqueta: string; referencia?: string }[] = [
      { etiqueta: 'SOLICITANTE' },
      { etiqueta: 'GERENCIA', referencia: solicitud.aprobadorGerencia },
      { etiqueta: 'ALMACÉN', referencia: solicitud.aprobadorAlmacen },
      { etiqueta: 'COSTOS' },
    ];
    const anchoColumna = ANCHO_CONTENIDO / columnas.length;
    columnas.forEach((col, i) => {
      const xCentro = MARGEN + anchoColumna * i + anchoColumna / 2;
      if (col.referencia) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(col.referencia, xCentro, yInicio - 1.5, { align: 'center' });
      }
      doc.line(MARGEN + anchoColumna * i + 4, yInicio, MARGEN + anchoColumna * (i + 1) - 4, yInicio);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(col.etiqueta, xCentro, yInicio + 4.5, { align: 'center' });
    });
  }

  private dibujarPie(doc: jsPDF, solicitud: Solicitud): void {
    const alturaPagina = 279.4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    const generado = new Date().toLocaleString('es-CO');
    doc.text(
      `Solicitud ${solicitud.numero} · Estado: ${solicitud.estado} · Generado ${generado}`,
      MARGEN,
      alturaPagina - MARGEN + 5,
    );
    doc.setTextColor(0, 0, 0);
  }
}

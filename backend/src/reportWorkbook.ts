import ExcelJS from 'exceljs';

export type ReportWorkbookRow = Record<string, unknown>;

export type AdminReportWorkbookData = {
  summary: {
    totalRevenue: number;
    orderCount: number;
    averageTicket: number;
    activeProducts: number;
    lowStockCount: number;
    userCount: number;
    totalDiscount: number;
  };
  revenueByCategory: ReportWorkbookRow[];
  topProducts: ReportWorkbookRow[];
  ordersByStatus: ReportWorkbookRow[];
  promotionUsage: ReportWorkbookRow[];
  latestOrders: ReportWorkbookRow[];
  lowStock: ReportWorkbookRow[];
  inventory: ReportWorkbookRow[];
};

const palette = {
  navy: 'FF0B1720',
  blue: 'FF04708B',
  cyan: 'FF4EEAFF',
  cyanDark: 'FF0D5B73',
  card: 'FF16212B',
  cardAlt: 'FF1F2B36',
  white: 'FFFFFFFF',
  muted: 'FFB8C2CC',
  amber: 'FFFFD34D',
  lime: 'FFA7F85A'
};

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asText(value: unknown) {
  return String(value ?? '');
}

function money(value: unknown) {
  return asNumber(value);
}

function bar(value: number, max: number, width = 18) {
  if (max <= 0) return '';
  const size = Math.max(1, Math.round((value / max) * width));
  return '\u2588'.repeat(size);
}

function styleTitle(cell: ExcelJS.Cell) {
  cell.font = { name: 'Aptos Display', size: 20, bold: true, color: { argb: palette.white } };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.blue } };
}

function styleCard(sheet: ExcelJS.Worksheet, range: string) {
  const [from, to] = range.split(':');
  sheet.getCell(from).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.card } };
  sheet.getCell(from).border = cardBorder();
  sheet.mergeCells(range);
  const merged = sheet.getCell(from);
  merged.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  merged.border = cardBorder();
}

function cardBorder() {
  return {
    top: { style: 'thin' as const, color: { argb: 'FF33414E' } },
    left: { style: 'thin' as const, color: { argb: 'FF33414E' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF33414E' } },
    right: { style: 'thin' as const, color: { argb: 'FF33414E' } }
  };
}

function setCardText(sheet: ExcelJS.Worksheet, cellRef: string, label: string, value: string, accent = palette.cyan) {
  const cell = sheet.getCell(cellRef);
  cell.value = {
    richText: [
      { text: `${label}\n`, font: { name: 'Aptos', size: 9, color: { argb: palette.muted } } },
      { text: value, font: { name: 'Aptos Display', size: 19, bold: true, color: { argb: accent } } }
    ]
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
}

function addSectionHeader(sheet: ExcelJS.Worksheet, row: number, fromCol: number, toCol: number, title: string) {
  sheet.mergeCells(row, fromCol, row, toCol);
  const cell = sheet.getCell(row, fromCol);
  cell.value = title;
  cell.font = { name: 'Aptos Display', bold: true, size: 13, color: { argb: palette.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.cyanDark } };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  cell.border = cardBorder();
}

function styleTableHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { name: 'Aptos', bold: true, color: { argb: palette.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.blue } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = cardBorder();
  });
}

function styleDataCell(cell: ExcelJS.Cell, fill = palette.cardAlt) {
  cell.font = { name: 'Aptos', size: 10, color: { argb: palette.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  cell.border = cardBorder();
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
}

function addMiniTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  headers: string[],
  rows: Array<Array<string | number>>,
  title: string
) {
  addSectionHeader(sheet, startRow, startCol, startCol + headers.length - 1, title);
  const headerRow = sheet.getRow(startRow + 1);
  headers.forEach((header, index) => {
    headerRow.getCell(startCol + index).value = header;
  });
  styleTableHeader(headerRow);

  rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(startRow + 2 + rowIndex);
    row.forEach((value, colIndex) => {
      const cell = excelRow.getCell(startCol + colIndex);
      cell.value = value;
      styleDataCell(cell, rowIndex % 2 === 0 ? palette.card : palette.cardAlt);
      if (typeof value === 'number') {
        const header = headers[colIndex]?.toLowerCase() ?? '';
        cell.numFmt = header.includes('ingres') || header.includes('descuento') ? '$#,##0' : '#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });
  });
}

function addDataSheet(workbook: ExcelJS.Workbook, name: string, rows: ReportWorkbookRow[]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.properties.tabColor = { argb: palette.cyan };
  if (!rows.length) {
    sheet.getCell('A1').value = 'Sin datos';
    sheet.getCell('A1').font = { name: 'Aptos', bold: true, color: { argb: palette.white } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.card } };
    return;
  }

  const columns = Object.keys(rows[0]);
  sheet.columns = columns.map((key) => ({ header: key, key, width: Math.max(16, key.length + 3) }));
  styleTableHeader(sheet.getRow(1));

  rows.forEach((source) => {
    const row = sheet.addRow(source);
    row.eachCell((cell) => {
      styleDataCell(cell, row.number % 2 === 0 ? palette.card : palette.cardAlt);
      if (typeof cell.value === 'number') {
        const key = String(sheet.getRow(1).getCell(cell.col).value ?? '').toLowerCase();
        if (key.includes('price') || key.includes('total') || key.includes('revenue') || key.includes('discount')) {
          cell.numFmt = '$#,##0.00';
        } else {
          cell.numFmt = '#,##0';
        }
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });
  });
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length }
  };
}

export async function buildAdminReportWorkbook(data: AdminReportWorkbookData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FORGE CORE';
  workbook.created = new Date();
  workbook.modified = new Date();

  const dashboard = workbook.addWorksheet('Dashboard', { views: [{ showGridLines: false }] });
  dashboard.properties.tabColor = { argb: palette.blue };
  dashboard.columns = [
    { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 },
    { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }
  ];
  for (let row = 1; row <= 42; row += 1) dashboard.getRow(row).height = 24;

  dashboard.mergeCells('A1:J2');
  styleTitle(dashboard.getCell('A1'));
  dashboard.getCell('A1').value = 'FORGE CORE | Reporte Ejecutivo';
  dashboard.mergeCells('A3:J3');
  dashboard.getCell('A3').value = `Exportado desde AWS + MariaDB | ${new Date().toLocaleString('es-PE')}`;
  dashboard.getCell('A3').font = { name: 'Aptos', size: 11, color: { argb: palette.muted } };
  dashboard.getCell('A3').alignment = { horizontal: 'center' };

  const cards = [
    ['A5:B7', 'Ventas simuladas', `$${Math.round(data.summary.totalRevenue).toLocaleString('en-US')}`, palette.cyan],
    ['C5:D7', 'Pedidos', data.summary.orderCount.toLocaleString('en-US'), palette.lime],
    ['E5:F7', 'Ticket promedio', `$${Math.round(data.summary.averageTicket).toLocaleString('en-US')}`, palette.cyan],
    ['G5:H7', 'Stock critico', data.summary.lowStockCount.toLocaleString('en-US'), palette.amber],
    ['I5:J7', 'Usuarios', data.summary.userCount.toLocaleString('en-US'), palette.cyan]
  ] as const;
  for (const [range, label, value, accent] of cards) {
    styleCard(dashboard, range);
    setCardText(dashboard, range.split(':')[0], label, value, accent);
  }

  const maxRevenue = Math.max(...data.revenueByCategory.map((row) => money(row.revenue)), 1);
  addMiniTable(
    dashboard,
    10,
    1,
    ['Categoria', 'Ingresos', 'Unid.', 'Visual'],
    data.revenueByCategory.slice(0, 7).map((row) => [
      asText(row.category),
      money(row.revenue),
      asNumber(row.units),
      bar(money(row.revenue), maxRevenue)
    ]),
    'Ventas por categoria'
  );

  addMiniTable(
    dashboard,
    10,
    6,
    ['Producto', 'Unid.', 'Ingresos', 'Visual'],
    data.topProducts.slice(0, 7).map((row) => [
      asText(row.product_name),
      asNumber(row.units),
      money(row.revenue),
      bar(money(row.revenue), Math.max(...data.topProducts.map((item) => money(item.revenue)), 1), 12)
    ]),
    'Top productos'
  );

  addMiniTable(
    dashboard,
    23,
    1,
    ['Estado', 'Pedidos'],
    data.ordersByStatus.map((row) => [asText(row.fulfillment_status), asNumber(row.total)]),
    'Estados de pedidos'
  );

  addMiniTable(
    dashboard,
    23,
    5,
    ['Cupon', 'Pedidos', 'Descuento'],
    data.promotionUsage.map((row) => [asText(row.promotion_code), asNumber(row.orders), money(row.discount_total)]),
    'Uso de cupones'
  );

  addMiniTable(
    dashboard,
    31,
    1,
    ['Producto', 'Categoria', 'Stock'],
    data.lowStock.slice(0, 8).map((row) => [asText(row.name), asText(row.category), asNumber(row.stock)]),
    'Stock critico'
  );

  dashboard.getColumn(4).font = { name: 'Aptos', color: { argb: palette.cyan } };
  dashboard.getColumn(9).font = { name: 'Aptos', color: { argb: palette.cyan } };

  addDataSheet(workbook, 'Categorias', data.revenueByCategory);
  addDataSheet(workbook, 'Top Productos', data.topProducts);
  addDataSheet(workbook, 'Estados', data.ordersByStatus);
  addDataSheet(workbook, 'Cupones', data.promotionUsage);
  addDataSheet(workbook, 'Ultimos Pedidos', data.latestOrders);
  addDataSheet(workbook, 'Stock Critico', data.lowStock);
  addDataSheet(workbook, 'Inventario', data.inventory);

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output as ArrayBuffer);
}

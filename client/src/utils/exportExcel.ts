import * as XLSX from 'xlsx';

type ExcelSheet = {
  name: string;
  data: Record<string, unknown>[];
  widths?: number[];
};

type ExportOptions = {
  fileName: string;
  sheetName?: string;
  title?: string;
};

const formatSheet = (
  data: Record<string, unknown>[],
  title?: string
) => {
  const headers = Object.keys(data[0] ?? {});

  const rows = [
    ...(title ? [[title], []] : []),
    headers,
    ...data.map(row =>
      headers.map(header => row[header] ?? '')
    ),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet['!cols'] = headers.map(header => ({
    wch: Math.min(
      40,
      Math.max(
        header.length + 5,
        ...data.map(row =>
          String(row[header] ?? '').length + 2
        )
      )
    ),
  }));

  return worksheet;
};

export const exportExcel = (
  data: Record<string, unknown>[],
  options: ExportOptions
) => {
  if (!data.length) {
    alert('No data available to export.');
    return;
  }

  const workbook = XLSX.utils.book_new();

  const worksheet = formatSheet(data, options.title);

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    options.sheetName || 'Report'
  );

  XLSX.writeFile(
    workbook,
    `${options.fileName}.xlsx`
  );
};

export const exportExcelWorkbook = (
  sheets: ExcelSheet[],
  fileName: string
) => {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(sheet => {
    const worksheet = sheet.data.length
      ? formatSheet(sheet.data)
      : XLSX.utils.aoa_to_sheet([
          ['No records available'],
        ]);

    if (sheet.widths) {
      worksheet['!cols'] = sheet.widths.map(w => ({
        wch: w,
      }));
    }

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      sheet.name.slice(0, 31)
    );
  });

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
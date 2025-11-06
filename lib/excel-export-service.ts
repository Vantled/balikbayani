// lib/excel-export-service.ts
import ExcelJS from 'exceljs';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface ExcelExportOptions {
  templateName: string;
  data: any[];
  startRow?: number; // Row to start filling data (1-indexed, default: 2 to skip header)
  sheetName?: string; // Sheet name to fill (default: first sheet)
  placeholderDelimiter?: [string, string]; // Delimiter for placeholders, default: ['{{', '}}']
}

/**
 * Replaces placeholders in a string with data values
 * Similar to docx-templates, uses {{field_name}} syntax
 */
function replacePlaceholders(text: string, data: any, delimiter: [string, string]): string {
  const [open, close] = delimiter;
  const regex = new RegExp(`${open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^${close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]+)${close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
  
  return text.replace(regex, (match, fieldName) => {
    const field = fieldName.trim();
    const value = data[field];
    return value !== undefined && value !== null ? String(value) : '';
  });
}

/**
 * Exports data to Excel by filling a template file using placeholders
 * Similar to docx-templates, uses {{field_name}} placeholders in cells
 * @param options Export options including template name and data
 * @returns Buffer containing the filled Excel file
 */
export async function exportToExcel(options: ExcelExportOptions): Promise<Buffer> {
  const { templateName, data, startRow = 2, sheetName, placeholderDelimiter = ['{{', '}}'] } = options;
  
  // Read the template file from public/templates/exports
  const templatePath = join(process.cwd(), 'public', 'templates', 'exports', templateName);
  
  // Load the workbook using ExcelJS (better style preservation)
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  
  // Get the sheet to fill (use provided sheet name or first sheet)
  const targetSheetName = sheetName || workbook.worksheets[0].name;
  const worksheet = workbook.getWorksheet(targetSheetName);
  
  if (!worksheet) {
    throw new Error(`Sheet "${targetSheetName}" not found in template`);
  }
  
  // We'll preserve formulas in the template and only remove them from data rows we're filling
  
  // Remove ALL table structures and AutoFilter to prevent Excel repair warnings
  // ExcelJS doesn't handle table structures well when modifying worksheets
  // We need to aggressively remove all table references before modifying
  try {
    const workbookModel = (workbook as any).model;
    
    // Remove all tables from the workbook model
    if (workbookModel && workbookModel.tables) {
      // Delete all tables - we don't need them
      workbookModel.tables = {};
    }
    
    // Remove table relationships from workbook relationships
    if (workbookModel && workbookModel.relationships) {
      const rels = workbookModel.relationships;
      const keysToDelete: string[] = [];
      for (const [key, rel] of Object.entries(rels)) {
        const relObj = rel as any;
        if (relObj && relObj.type && typeof relObj.type === 'string' && relObj.type.includes('table')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => delete rels[key]);
    }
    
    // Remove table relationships from workbook.workbook.relationships
    if (workbookModel && workbookModel.workbook && workbookModel.workbook.relationships) {
      const wbRels = workbookModel.workbook.relationships;
      const keysToDelete: string[] = [];
      for (const [key, rel] of Object.entries(wbRels)) {
        const relObj = rel as any;
        if (relObj && relObj.Target && typeof relObj.Target === 'string' && relObj.Target.includes('table')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => delete wbRels[key]);
    }
    
    // Remove AutoFilter and tableParts from worksheet
    const worksheetModel = (worksheet as any).model;
    if (worksheetModel) {
      // Remove autoFilter completely
      if (worksheetModel.autoFilter) {
        delete worksheetModel.autoFilter;
      }
      // Remove tableParts array
      if (worksheetModel.tableParts) {
        worksheetModel.tableParts = [];
      }
      // Remove tableParts count
      if (worksheetModel.tablePartsCount !== undefined) {
        worksheetModel.tablePartsCount = 0;
      }
    }
    
    // Also remove from worksheet directly
    if ((worksheet as any).autoFilter) {
      delete (worksheet as any).autoFilter;
    }
    if ((worksheet as any).tableParts) {
      (worksheet as any).tableParts = [];
    }
    
    // Remove any table references from worksheet relationships
    if (worksheetModel && worksheetModel.relationships) {
      const wsRels = worksheetModel.relationships;
      const keysToDelete: string[] = [];
      for (const [key, rel] of Object.entries(wsRels)) {
        const relObj = rel as any;
        if (relObj && relObj.Target && typeof relObj.Target === 'string' && relObj.Target.includes('table')) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => delete wsRels[key]);
    }
  } catch (e) {
    // If table removal fails, log but continue
    console.warn('Could not remove tables from worksheet:', e);
  }
  
  // Process title row (row 1) to replace year placeholder if present
  const titleRow = worksheet.getRow(1);
  titleRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (cell.value && typeof cell.value === 'string') {
      const cellValue = String(cell.value);
      // Replace {{year}} placeholder with current year
      if (cellValue.includes('{{year}}')) {
        const currentYear = new Date().getFullYear();
        cell.value = cellValue.replace(/\{\{year\}\}/g, String(currentYear));
      }
    }
  });
  
  // The template row is the row at startRow (contains placeholders like {{field_name}})
  const templateRowIndex = startRow; // ExcelJS uses 1-indexed rows
  
  // Get the template row to clone its styles
  const templateRow = worksheet.getRow(templateRowIndex);
  
  // We'll preserve formulas in the template and only remove them from data rows we're filling
  
  // First, read the template row cells to preserve them
  const templateCells: Map<number, { value: any; style: any }> = new Map();
  templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    // Try to get the text value directly from the cell
    // ExcelJS stores text in cell.text property
    let cellValue: any = '';
    
    // First try cell.text (this is the most reliable way to get text from ExcelJS)
    const cellText = cell.text;
    if (cellText !== undefined && cellText !== null && cellText !== '') {
      cellValue = String(cellText);
    } else {
      // If cell.text is empty, try cell.value
      const cellVal = cell.value;
      if (cellVal !== null && cellVal !== undefined) {
        if (typeof cellVal === 'object') {
          // It's an object - could be RichText or other object type
          if ('richText' in cellVal && Array.isArray(cellVal.richText)) {
            // It's a RichText object, extract the text from all rich text parts
            cellValue = cellVal.richText.map((rt: any) => {
              if (typeof rt === 'string') return rt;
              if (rt && typeof rt === 'object' && 'text' in rt) return rt.text || '';
              return '';
            }).join('');
          } else if ('text' in cellVal) {
            // It's a text object
            cellValue = String(cellVal.text || '');
          } else {
            // Try to stringify
            cellValue = String(cellVal);
          }
        } else {
          // Convert to string if it's not already
          cellValue = String(cellVal);
        }
      }
    }
    
    templateCells.set(colNumber, {
      value: cellValue,
      style: cell.style ? JSON.parse(JSON.stringify(cell.style)) : null
    });
  });
  
  // Process each data record
  let currentRowIndex = startRow; // Start filling from the template row
  
  // If no data, at least replace placeholders in the template row with empty strings
  if (data.length === 0) {
    templateCells.forEach((templateCell, colNumber) => {
      const currentCell = worksheet.getCell(currentRowIndex, colNumber);
      let cellValue: any = templateCell.value;
      
      // If cell contains a string with placeholders, replace them with empty strings
      if (typeof cellValue === 'string' && 
          cellValue.includes(placeholderDelimiter[0]) && 
          cellValue.includes(placeholderDelimiter[1])) {
        cellValue = replacePlaceholders(cellValue, {}, placeholderDelimiter);
      }
      
      // Set the cell value
      currentCell.value = cellValue;
      
      // Apply formatting (remove bold from data rows)
      if (templateCell.style) {
        const clonedStyle = JSON.parse(JSON.stringify(templateCell.style));
        if (clonedStyle.font) {
          clonedStyle.font.bold = false;
        } else {
          clonedStyle.font = { bold: false };
        }
        currentCell.style = clonedStyle;
      } else {
        currentCell.style = {
          font: { bold: false }
        };
      }
    });
  }
  
  for (let recordIndex = 0; recordIndex < data.length; recordIndex++) {
    const record = data[recordIndex];
    // For each record, create/update a row by copying the template row
    const currentRow = worksheet.getRow(currentRowIndex);
    
    // Copy row height from template
    if (templateRow.height) {
      currentRow.height = templateRow.height;
    }
    
    // Process each cell in the template row
    templateCells.forEach((templateCell, colNumber) => {
      const currentCell = worksheet.getCell(currentRowIndex, colNumber);
      let cellValue: any = templateCell.value;
      
      // Check if the current cell has a formula (not from template, but from existing data)
      const hasFormula = (currentCell as any).formula;
      
      // Ensure cellValue is a string for placeholder detection
      const cellValueStr = String(cellValue || '');
      
      // Only modify cells that have placeholders - leave formula cells alone
      const hasPlaceholders = cellValueStr.includes(placeholderDelimiter[0]) && 
                              cellValueStr.includes(placeholderDelimiter[1]);
      
      if (hasPlaceholders) {
        // Replace placeholders with actual data from current record
        cellValue = replacePlaceholders(cellValueStr, record, placeholderDelimiter);
        
        // Set the cell value
        // If the cell has a formula, we need to remove it before setting a new value
        // This prevents ExcelJS errors with shared formulas
        if (hasFormula) {
          // Remove the formula and any shared formula references
          delete (currentCell as any).formula;
          const cellModel = (currentCell as any).model;
          if (cellModel) {
            if (cellModel.formula) {
              delete cellModel.formula;
            }
            if (cellModel.sharedFormula) {
              delete cellModel.sharedFormula;
            }
          }
        }
        
        currentCell.value = cellValue;
      } else if (!hasFormula) {
        // If no placeholders and no formula, just copy the template value
        // This preserves empty cells or cells with static values
        currentCell.value = templateCell.value;
      }
      // If the cell has a formula and no placeholders, leave it alone (preserve the formula)
      
      // Copy all formatting from template cell (this preserves colors, etc.)
      // But remove bold formatting from data rows (row 3+)
      if (templateCell.style) {
        const clonedStyle = JSON.parse(JSON.stringify(templateCell.style));
        
        // Remove bold formatting from data rows
        if (clonedStyle.font) {
          clonedStyle.font.bold = false;
        } else {
          clonedStyle.font = { bold: false };
        }
        
        currentCell.style = clonedStyle;
      } else {
        // Ensure no bold if no style exists
        currentCell.style = {
          font: { bold: false }
        };
      }
    });
    
    currentRowIndex++;
  }
  
  // Write workbook to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Maps database record to Excel row format
 * This is a helper function to transform data before export
 */
export function mapRecordToExcelRow(record: any, fieldMapping?: Record<string, string>): any {
  if (fieldMapping) {
    const mapped: any = {};
    Object.entries(fieldMapping).forEach(([dbField, excelField]) => {
      mapped[excelField] = record[dbField];
    });
    return mapped;
  }
  return record;
}


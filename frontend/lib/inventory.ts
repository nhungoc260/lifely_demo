/** Quy tắc kho thấp (khớp truy vấn ở backend): số đơn vị nhỏ hơn hoặc bằng ngưỡng cảnh báo của chính ô kho đó. */
export interface StockCell { organizationId: string; bloodType: string; units: number; lowThreshold: number }

export const isLowStock = (c: Pick<StockCell, "units" | "lowThreshold">): boolean => c.units <= c.lowThreshold;

/** Các nhóm máu đang thấp của một cơ sở, thiếu nhiều nhất xếp trước. */
export function lowCellsOf(cells: StockCell[], organizationId: string): StockCell[] {
  return cells.filter((c) => c.organizationId === organizationId && isLowStock(c)).sort((a, b) => a.units - b.units);
}

/** Các ô của một nhóm máu ở mọi cơ sở, ô thấp xếp trước. */
export function cellsOfType(cells: StockCell[], bloodType: string): StockCell[] {
  return cells.filter((c) => c.bloodType === bloodType).sort((a, b) => Number(isLowStock(b)) - Number(isLowStock(a)) || a.units - b.units);
}

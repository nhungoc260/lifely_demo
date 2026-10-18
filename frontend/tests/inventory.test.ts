import { describe, expect, it } from "vitest";

import { cellsOfType, isLowStock, lowCellsOf, type StockCell } from "@/lib/inventory";

const c = (organizationId: string, bloodType: string, units: number, lowThreshold = 5): StockCell => ({ organizationId, bloodType, units, lowThreshold });
const cells = [c("a", "O-", 3), c("a", "A+", 21), c("a", "AB-", 5), c("b", "O-", 25), c("b", "AB-", 2)];

describe("kho máu thấp", () => {
  it("thấp khi số đơn vị nhỏ hơn hoặc bằng ngưỡng", () => {
    expect(isLowStock({ units: 5, lowThreshold: 5 })).toBe(true);
    expect(isLowStock({ units: 6, lowThreshold: 5 })).toBe(false);
  });
  it("lowCellsOf: chỉ các nhóm thấp của đúng cơ sở, thiếu nhiều nhất trước", () => {
    expect(lowCellsOf(cells, "a").map((x) => x.bloodType)).toEqual(["O-", "AB-"]);
    expect(lowCellsOf(cells, "b").map((x) => x.bloodType)).toEqual(["AB-"]);
    expect(lowCellsOf(cells, "zzz")).toEqual([]);
  });
  it("cellsOfType: mọi cơ sở của một nhóm máu, ô thấp xếp trước", () => {
    expect(cellsOfType(cells, "O-").map((x) => x.organizationId)).toEqual(["a", "b"]);
    expect(cellsOfType(cells, "AB-").map((x) => x.organizationId)).toEqual(["b", "a"]);
  });
});

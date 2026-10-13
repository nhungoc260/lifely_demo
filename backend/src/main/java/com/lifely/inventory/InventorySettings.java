package com.lifely.inventory;

/** Tuỳ chọn kho máu của tổ chức: tự cộng 1 đơn vị vào kho khi xác nhận một lần hiến. */
public record InventorySettings(boolean autoAdd) {
}

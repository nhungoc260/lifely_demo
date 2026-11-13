-- Giá xăng hoàn toàn tự động: không còn nhập tay. Mọi dòng (kể cả dữ liệu khởi tạo từ công bố của Petrolimex) coi là tự động.
ALTER TABLE fuel_prices ALTER COLUMN auto SET DEFAULT TRUE;
UPDATE fuel_prices SET auto = TRUE;

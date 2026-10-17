import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MapSearch } from "@/components/map/map-search";

const html = renderToStaticMarkup(createElement("form", null, createElement(MapSearch, { onFound: () => {} })));

describe("ô tìm kiếm bản đồ nằm trong biểu mẫu khác", () => {
  it("không tạo form lồng nhau (nếu lồng, bấm Tìm sẽ gửi luôn biểu mẫu bên ngoài)", () => {
    expect(html.match(/<form/g)?.length).toBe(1);
  });
  it("nút Tìm kiếm là type=button, không phải nút gửi biểu mẫu", () => {
    const btn = html.match(/<button[^>]*aria-label="Tìm kiếm"[^>]*>/)?.[0] ?? "";
    expect(btn).toContain('type="button"');
    expect(btn).not.toContain('type="submit"');
  });
});

# Tanks of Arena

Game xe tăng 2D top-down (lấy cảm hứng từ BangBang). TypeScript + Vite + PixiJS + Vitest.
Thiết kế chi tiết nằm trong tài liệu thiết kế đã duyệt; file này chỉ ghi cách chạy.

## Chạy

```bash
npm install
npm run dev        # mở http://localhost:5173
npm test           # unit test (chạy headless, không cần trình duyệt)
npm run typecheck
npm run build
```

## Điều khiển

| Phím | Tác dụng |
| --- | --- |
| W A S D / phím mũi tên | Di chuyển (thân xe quay theo hướng đi) |
| Chuột | Ngắm (tháp pháo xoay độc lập, luôn chĩa vào con trỏ) |
| Chuột trái, Q, E, Space | Đã đọc vào `InputCmd`, sẽ có tác dụng từ M3/M4 |
| F3 | Ẩn/hiện debug (hitbox, hướng thân màu cam, hướng tháp pháo màu xanh lá) |

## Quy tắc kiến trúc

- `src/sim/` và `src/shared/` **không** được dùng DOM, PixiJS, `Math.random`, `Date.now`.
  `tests/sim-purity.test.ts` kiểm tra tự động.
- Renderer chỉ đọc `Snapshot`, không sửa trạng thái game.
- Thêm xe mới = thêm một file JSON vào `data/tanks/`; thêm bản đồ = thêm một file vào `data/maps/`
  (nạp tự động, kiểm tra khi khởi động và báo lỗi nêu rõ file, hàng, cột sai).
- Bản đồ là các chuỗi ASCII. Ký tự định nghĩa trong `data/tiles.json`; chữ số `1`-`9` là điểm xuất phát của đội đó.
  Thêm loại địa hình mới = thêm một dòng vào `tiles.json`.
- Bán kính xe tối đa 1 ô (giới hạn của SpatialHash và của va chạm Xe-Tường).

## Cột mốc

- [x] M1: Khung dự án, game loop, điều khiển Dual-Pivot
- [x] M2: Bản đồ lưới + va chạm Xe-Tường, Xe-Xe, bụi cỏ
- [x] M3: Hệ thống đạn + chiến đấu cơ bản
- [ ] M4: Data-driven nhiều xe + Skill
- [ ] M5: AI Bot
- [ ] M6: Team Deathmatch 3v3, UI, hoàn thiện
- [ ] M7: Chuẩn bị Multiplayer

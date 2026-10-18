/**
 * Lưới băm không gian cho broadphase: chỉ kiểm tra va chạm với các đối tượng ở ô lân cận.
 *
 * Mỗi đối tượng được lưu ở ô chứa TÂM của nó, nên bán kính đối tượng phải <= cellSize / 2.
 * Kết quả query là tập ứng viên (có thể xa hơn r một chút); người gọi tự kiểm tra khoảng cách chính xác.
 * Thứ tự kết quả xác định: theo cột, rồi hàng, rồi thứ tự chèn.
 */
export class SpatialHash {
    private readonly cells = new Map<number, number[]>();

    constructor(readonly cellSize: number = 2) {}

    private key(cx: number, cy: number): number {
        return (cx + 32768) * 65536 + (cy + 32768);
    }

    /** Xóa nội dung nhưng giữ lại các mảng đã cấp phát để dùng lại ở tick sau. */
    clear(): void {
        for (const bucket of this.cells.values()) bucket.length = 0;
    }

    insert(id: number, x: number, y: number): void {
        const k = this.key(
            Math.floor(x / this.cellSize),
            Math.floor(y / this.cellSize)
        );
        let bucket = this.cells.get(k);
        if (!bucket) this.cells.set(k, (bucket = []));
        bucket.push(id);
    }

    /** Thêm vào `out` các id ứng viên có thể chạm hình tròn (x, y, r). */
    query(x: number, y: number, r: number, out: number[]): void {
        const pad = r + this.cellSize / 2;
        const cx0 = Math.floor((x - pad) / this.cellSize);
        const cx1 = Math.floor((x + pad) / this.cellSize);
        const cy0 = Math.floor((y - pad) / this.cellSize);
        const cy1 = Math.floor((y + pad) / this.cellSize);
        for (let cx = cx0; cx <= cx1; cx++) {
            for (let cy = cy0; cy <= cy1; cy++) {
                const bucket = this.cells.get(this.key(cx, cy));
                if (bucket)
                    for (let i = 0; i < bucket.length; i++)
                        out.push(bucket[i]!);
            }
        }
    }
}

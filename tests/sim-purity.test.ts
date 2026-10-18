import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Quy tắc sắt: sim/ và shared/ không được phụ thuộc DOM, PixiJS, thời gian thực hay ngẫu nhiên không seed.
 * Đây là điều kiện để chạy cùng một logic trên server khi làm Multiplayer.
 */
const FORBIDDEN: [RegExp, string][] = [
    [/\bdocument\b/, "document (DOM)"],
    [/\bwindow\b/, "window (DOM)"],
    [/pixi/i, "PixiJS"],
    [/Math\.random/, "Math.random"],
    [/Date\.now|new Date\(/, "Date"],
    [/performance\.now/, "performance.now"],
    [/requestAnimationFrame|setTimeout|setInterval/, "timer của trình duyệt"],
    [/from\s+["'][^"']*client[^"']*["']/, "import từ client/"],
];

function sourceFiles(dir: string): string[] {
    return (readdirSync(dir, { recursive: true }) as string[])
        .filter((f) => f.endsWith(".ts"))
        .map((f) => join(dir, f));
}

function stripComments(code: string): string {
    return code
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("sim/ và shared/ giữ thuần logic", () => {
    for (const dir of ["src/sim", "src/shared"]) {
        for (const file of sourceFiles(dir)) {
            it(file, () => {
                const code = stripComments(readFileSync(file, "utf8"));
                for (const [pattern, name] of FORBIDDEN) {
                    expect(
                        pattern.test(code),
                        `${file} không được dùng ${name}`
                    ).toBe(false);
                }
            });
        }
    }
});

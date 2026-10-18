import { SKILL_E, SKILL_Q, SKILL_SPACE } from "../../shared/constants";
import type { InputCmd } from "../../shared/protocol";
import type { Camera } from "../render/Camera";

/**
 * Đọc bàn phím + chuột rồi đóng gói thành InputCmd.
 * WASD / phím mũi tên: di chuyển. Chuột: ngắm, chuột trái: bắn. Q, E, Space: kỹ năng.
 * Dùng KeyboardEvent.code nên đúng cả khi bàn phím không phải QWERTY.
 */
export class InputController {
    private readonly keys = new Set<string>();
    private mouseX = 0;
    private mouseY = 0;
    private mouseDown = false;

    private readonly onKeyDown = (e: KeyboardEvent) => {
        if (e.code === "Space" || e.code.startsWith("Arrow"))
            e.preventDefault();
        this.keys.add(e.code);
    };
    private readonly onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
    private readonly onBlur = () => {
        this.keys.clear();
        this.mouseDown = false;
    };
    private readonly onPointerMove = (e: PointerEvent) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    };
    private readonly onPointerDown = (e: PointerEvent) => {
        if (e.button === 0) this.mouseDown = true;
    };
    private readonly onPointerUp = (e: PointerEvent) => {
        if (e.button === 0) this.mouseDown = false;
    };
    private readonly onContextMenu = (e: Event) => e.preventDefault();

    constructor(
        private readonly camera: Camera,
        private readonly playerId: number
    ) {
        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);
        window.addEventListener("blur", this.onBlur);
        window.addEventListener("pointermove", this.onPointerMove);
        window.addEventListener("pointerdown", this.onPointerDown);
        window.addEventListener("pointerup", this.onPointerUp);
        window.addEventListener("contextmenu", this.onContextMenu);
    }

    /** Điểm ngắm hiện tại trong tọa độ thế giới. */
    get aimWorld(): { x: number; y: number } {
        return this.camera.screenToWorld(this.mouseX, this.mouseY);
    }

    buildCmd(tick: number): InputCmd {
        const k = this.keys;
        const moveX =
            (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) -
            (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
        const moveY =
            (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) -
            (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0);
        const aim = this.aimWorld;

        let skills = 0;
        if (k.has("KeyQ")) skills |= SKILL_Q;
        if (k.has("KeyE")) skills |= SKILL_E;
        if (k.has("Space")) skills |= SKILL_SPACE;

        return {
            tick,
            playerId: this.playerId,
            moveX,
            moveY,
            aimX: aim.x,
            aimY: aim.y,
            fire: this.mouseDown,
            skills,
        };
    }

    dispose(): void {
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        window.removeEventListener("blur", this.onBlur);
        window.removeEventListener("pointermove", this.onPointerMove);
        window.removeEventListener("pointerdown", this.onPointerDown);
        window.removeEventListener("pointerup", this.onPointerUp);
        window.removeEventListener("contextmenu", this.onContextMenu);
    }
}

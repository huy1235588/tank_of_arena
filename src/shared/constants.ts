/** Tần số mô phỏng cố định (tick/giây). Logic luôn chạy với dt = STEP. */
export const TICK_RATE = 60;
export const STEP = 1 / TICK_RATE;

/** Bit của InputCmd.skills (Q, E, Space). */
export const SKILL_Q = 1 << 0;
export const SKILL_E = 1 << 1;
export const SKILL_SPACE = 1 << 2;

/** Thời gian chờ hồi sinh sau khi bị hạ (tick). */
export const RESPAWN_TICKS = 3 * TICK_RATE;
/** Thời gian bất tử ngay sau khi xuất hiện, chống bắn ngay tại điểm xuất phát (tick). */
export const SPAWN_PROTECTION_TICKS = Math.round(1.5 * TICK_RATE);

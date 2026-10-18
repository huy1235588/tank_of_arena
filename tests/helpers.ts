import { loadContent } from "../data";
import type { InputCmd } from "../src/shared/protocol";
import type { GameContent, MapDef } from "../src/shared/schema/types";
import { Simulation, type PlayerConfig } from "../src/sim/Simulation";

export const content: GameContent = loadContent();

/** Bản đồ rỗng có tường thép bao quanh; `inner` là các hàng bên trong (đã gồm 2 cột biên). */
export function makeMap(id: string, rows: string[]): MapDef {
    return { id, name: id, rows };
}

/** Khung trống cols x rows, viền thép, trong là đất. */
export function openRows(cols: number, rows: number): string[] {
    const out: string[] = [];
    for (let r = 0; r < rows; r++) {
        out.push(
            r === 0 || r === rows - 1
                ? "#".repeat(cols)
                : "#" + ".".repeat(cols - 2) + "#"
        );
    }
    return out;
}

export function contentWithMap(map: MapDef): GameContent {
    return { ...content, maps: { ...content.maps, [map.id]: map } };
}

export function makeSim(
    map: MapDef,
    players: PlayerConfig[],
    seed = 1
): Simulation {
    return new Simulation(
        { seed, mapId: map.id, players },
        contentWithMap(map)
    );
}

export const cmd = (over: Partial<InputCmd> = {}): InputCmd => ({
    tick: 0,
    playerId: 0,
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    fire: false,
    skills: 0,
    ...over,
});

import { loadContent } from "../../data";
import { Simulation } from "../sim/Simulation";
import { SoundEffects } from "./audio/SoundEffects";
import { GameLoop } from "./GameLoop";
import { InputController } from "./input/InputController";
import { GraphicsSpriteFactory } from "./render/GraphicsSpriteFactory";
import { Renderer } from "./render/Renderer";
import { DebugOverlay } from "./ui/DebugOverlay";
import { HudOverlay } from "./ui/HudOverlay";

const LOCAL_PLAYER = 0;
const RAD_TO_DEG = 180 / Math.PI;

async function boot(): Promise<void> {
  const host = document.getElementById("app");
  if (!host) throw new Error("Thiếu phần tử #app trong index.html");

  const content = loadContent();
  const sim = new Simulation(
    {
      seed: 1,
      mapId: "arena_01",
      // Vị trí lấy từ điểm xuất phát của đội trên bản đồ. M5 sẽ thay các xe đứng yên bằng bot.
      players: [
        { playerId: LOCAL_PLAYER, team: 1, defId: "striker" },
        { playerId: 1, team: 2, defId: "ghost" },
        { playerId: 2, team: 2, defId: "striker" },
      ],
    },
    content,
  );

  const audio = new SoundEffects();
  // Chế độ chơi cục bộ: renderer đọc bản đồ trực tiếp từ sim. Khi có mạng, client tự dựng TileMap từ dữ liệu.
  const renderer = await Renderer.create(
    host,
    new GraphicsSpriteFactory(),
    LOCAL_PLAYER,
    sim.map,
    content.projectiles,
    audio,
  );
  const input = new InputController(renderer.camera, LOCAL_PLAYER);
  const overlay = new DebugOverlay();
  const hud = new HudOverlay({ localPlayerId: LOCAL_PLAYER, content });
  let fps = 60;

  const loop = new GameLoop({
    update: () => {
      sim.step([input.buildCmd(sim.tick)]);
      const events = sim.drainEvents();
      if (events.length > 0) {
        renderer.handleEvents(events);
        hud.handleEvents(events, sim.getSnapshot().players);
      }
    },
    render: (alpha, frameSeconds) => {
      const snapshot = sim.getSnapshot();
      renderer.debug = overlay.visible;
      renderer.draw(snapshot, alpha, frameSeconds);
      hud.update(snapshot);

      if (frameSeconds > 0) fps += (1 / frameSeconds - fps) * 0.1;
      const me = snapshot.tanks.find((t) => t.playerId === LOCAL_PLAYER);
      const aim = input.aimWorld;
      overlay.update({
        fps,
        tick: snapshot.tick,
        mapName: sim.map.name,
        col: Math.floor(me?.x ?? 0),
        row: Math.floor(me?.y ?? 0),
        inBush: me?.inBush ?? false,
        hullDeg: (me?.hullAngle ?? 0) * RAD_TO_DEG,
        turretDeg: (me?.turretAngle ?? 0) * RAD_TO_DEG,
        aimX: aim.x,
        aimY: aim.y,
        tanks: snapshot.tanks.length,
        projectiles: snapshot.projectiles.length,
        hp: me?.hp,
        maxHp: me?.maxHp,
      });
    },
  });
  loop.start();
}

boot().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    "beforeend",
    `<pre style="color:#ff8a80;padding:16px">Lỗi khởi động: ${String(err instanceof Error ? err.message : err)}</pre>`,
  );
});

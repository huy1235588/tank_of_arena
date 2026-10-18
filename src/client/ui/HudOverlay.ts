import type { GameEvent, PlayerSnapshot, Snapshot } from "../../shared/protocol";
import type { GameContent } from "../../shared/schema/types";

export interface HudConfig {
  localPlayerId: number;
  content: GameContent;
}

interface KillFeedItem {
  id: number;
  text: string;
  time: number;
}

/**
 * Giao diện chiến đấu hiện đại (HUD):
 * - Thanh máu lớn, chỉ số nạp đạn của người chơi ở góc dưới trái.
 * - Tỉ số trận đấu (K/D, Điểm 2 đội) ở giữa trên.
 * - Bảng thông báo hạ gục (Kill Feed) ở góc trên phải.
 * - Màn hình đếm ngược hồi sinh khi bị tiêu diệt.
 */
export class HudOverlay {
  private readonly root: HTMLDivElement;
  private readonly hpFill: HTMLDivElement;
  private readonly hpText: HTMLDivElement;
  private readonly reloadFill: HTMLDivElement;
  private readonly reloadText: HTMLDivElement;
  private readonly scoreBoard: HTMLDivElement;
  private readonly killFeed: HTMLDivElement;
  private readonly respawnBanner: HTMLDivElement;
  private readonly respawnTimer: HTMLDivElement;

  private killFeedItems: KillFeedItem[] = [];
  private nextFeedId = 1;

  constructor(private readonly config: HudConfig) {
    this.root = document.createElement("div");
    this.root.id = "hud";
    this.root.innerHTML = `
      <style>
        #hud {
          position: fixed;
          inset: 0;
          pointer-events: none;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          user-select: none;
        }
        .hud-bottom-left {
          position: absolute;
          left: 20px;
          bottom: 20px;
          background: rgba(16, 20, 28, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 8px;
          padding: 12px 16px;
          width: 260px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .hud-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #90a4ae;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .hud-hp-bar {
          height: 14px;
          background: #263238;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
          margin-bottom: 10px;
        }
        .hud-hp-fill {
          height: 100%;
          width: 100%;
          background: linear-gradient(90deg, #43a047, #66bb6a);
          transition: width 0.15s ease-out, background 0.3s;
        }
        .hud-reload-bar {
          height: 6px;
          background: #1c252b;
          border-radius: 3px;
          overflow: hidden;
        }
        .hud-reload-fill {
          height: 100%;
          width: 100%;
          background: #ffd54f;
          transition: width 0.05s linear;
        }
        .hud-top-center {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(16, 20, 28, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 6px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          color: #eceff1;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .score-ally { color: #4fc3f7; }
        .score-enemy { color: #ef5350; }
        .hud-kill-feed {
          position: absolute;
          top: 16px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-end;
        }
        .feed-item {
          background: rgba(20, 24, 33, 0.9);
          border-left: 3px solid #ef5350;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          color: #eceff1;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          animation: slideIn 0.2s ease-out;
        }
        .feed-item.feed-self {
          border-left-color: #4fc3f7;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .hud-respawn-modal {
          position: absolute;
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(16, 20, 28, 0.92);
          border: 1px solid #ef5350;
          border-radius: 12px;
          padding: 24px 36px;
          text-align: center;
          display: none;
          box-shadow: 0 12px 32px rgba(239, 83, 80, 0.25);
        }
        .respawn-title {
          font-size: 20px;
          font-weight: 800;
          color: #ef5350;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
        .respawn-sub {
          font-size: 14px;
          color: #b0bec5;
        }
      </style>
      <div class="hud-top-center" id="scoreBoard">
        <span class="score-ally">ĐỘI 1: 0</span>
        <span style="opacity: 0.4;">|</span>
        <span id="playerKd" style="font-size: 12px; color: #cfd8dc;">K: 0  D: 0</span>
        <span style="opacity: 0.4;">|</span>
        <span class="score-enemy">ĐỘI 2: 0</span>
      </div>
      <div class="hud-kill-feed" id="killFeed"></div>
      <div class="hud-bottom-left">
        <div class="hud-label">
          <span id="tankName">XE TĂNG</span>
          <span id="hpText">120 / 120 HP</span>
        </div>
        <div class="hud-hp-bar">
          <div class="hud-hp-fill" id="hpFill"></div>
        </div>
        <div class="hud-label">
          <span>HỆ THỐNG NẠP ĐẠN</span>
          <span id="reloadText" style="color: #ffd54f;">SẴN SÀNG</span>
        </div>
        <div class="hud-reload-bar">
          <div class="hud-reload-fill" id="reloadFill"></div>
        </div>
      </div>
      <div class="hud-respawn-modal" id="respawnModal">
        <div class="respawn-title">XE ĐÃ BỊ PHÁ HỦY</div>
        <div class="respawn-sub" id="respawnTimer">Hồi sinh trong 3.0 giây...</div>
      </div>
    `;

    document.body.appendChild(this.root);

    this.hpFill = this.root.querySelector("#hpFill") as HTMLDivElement;
    this.hpText = this.root.querySelector("#hpText") as HTMLDivElement;
    this.reloadFill = this.root.querySelector("#reloadFill") as HTMLDivElement;
    this.reloadText = this.root.querySelector("#reloadText") as HTMLDivElement;
    this.scoreBoard = this.root.querySelector("#scoreBoard") as HTMLDivElement;
    this.killFeed = this.root.querySelector("#killFeed") as HTMLDivElement;
    this.respawnBanner = this.root.querySelector("#respawnModal") as HTMLDivElement;
    this.respawnTimer = this.root.querySelector("#respawnTimer") as HTMLDivElement;
  }

  handleEvents(events: readonly GameEvent[], players: readonly PlayerSnapshot[]): void {
    const now = performance.now();
    for (const e of events) {
      if (e.type === "TankDestroyed") {
        const victimPlayer = players.find((p) => p.playerId === e.playerId);
        const killerPlayer = players.find((p) => p.playerId === e.byPlayerId);

        const victimName = victimPlayer ? (victimPlayer.playerId === this.config.localPlayerId ? "Bạn" : `Người chơi ${victimPlayer.playerId}`) : "Xe";
        const killerName = killerPlayer ? (killerPlayer.playerId === this.config.localPlayerId ? "Bạn" : `Người chơi ${killerPlayer.playerId}`) : "Tự nổ";

        const isSelfInvolved = e.playerId === this.config.localPlayerId || e.byPlayerId === this.config.localPlayerId;
        this.addFeedItem(`${killerName} ⚔️ ${victimName}`, isSelfInvolved, now);
      }
    }
  }

  update(snapshot: Snapshot): void {
    const me = snapshot.tanks.find((t) => t.playerId === this.config.localPlayerId);
    const myPlayer = snapshot.players.find((p) => p.playerId === this.config.localPlayerId);

    // Máu và Nạp đạn
    if (me) {
      const ratio = Math.max(0, Math.min(1, me.hp / me.maxHp));
      this.hpFill.style.width = `${(ratio * 100).toFixed(1)}%`;
      this.hpFill.style.background = ratio > 0.5 ? "linear-gradient(90deg, #43a047, #66bb6a)" : ratio > 0.25 ? "linear-gradient(90deg, #fb8c00, #ffa726)" : "linear-gradient(90deg, #e53935, #ef5350)";
      this.hpText.textContent = `${Math.ceil(me.hp)} / ${me.maxHp} HP`;

      const rel = Math.max(0, Math.min(1, me.reload));
      this.reloadFill.style.width = `${(rel * 100).toFixed(1)}%`;
      this.reloadText.textContent = rel >= 1 ? "SẴN SÀNG" : "ĐANG NẠP...";
      this.reloadText.style.color = rel >= 1 ? "#ffd54f" : "#90a4ae";
    } else {
      this.hpFill.style.width = "0%";
      this.hpText.textContent = "0 HP";
    }

    // Hiển thị hồi sinh nếu đã hy sinh
    if (myPlayer && !myPlayer.alive && myPlayer.respawnTicks > 0) {
      this.respawnBanner.style.display = "block";
      const sec = (myPlayer.respawnTicks / 60).toFixed(1);
      this.respawnTimer.textContent = `Hồi sinh trong ${sec} giây...`;
    } else {
      this.respawnBanner.style.display = "none";
    }

    // Bảng điểm hai đội và K/D
    let team1Kills = 0;
    let team2Kills = 0;
    for (const p of snapshot.players) {
      if (p.team === 1) team1Kills += p.kills;
      else if (p.team === 2) team2Kills += p.kills;
    }

    const myKills = myPlayer?.kills ?? 0;
    const myDeaths = myPlayer?.deaths ?? 0;
    this.scoreBoard.innerHTML = `
      <span class="score-ally">ĐỘI 1: ${team1Kills}</span>
      <span style="opacity: 0.4;">|</span>
      <span style="font-size: 12px; color: #cfd8dc;">K: ${myKills} &nbsp; D: ${myDeaths}</span>
      <span style="opacity: 0.4;">|</span>
      <span class="score-enemy">ĐỘI 2: ${team2Kills}</span>
    `;

    // Cập nhật Kill Feed (tự xóa sau 4 giây)
    const now = performance.now();
    this.killFeedItems = this.killFeedItems.filter((item) => now - item.time < 4000);
    this.renderKillFeed();
  }

  private addFeedItem(text: string, isSelf: boolean, time: number): void {
    this.killFeedItems.push({ id: this.nextFeedId++, text: (isSelf ? "⭐ " : "") + text, time });
    if (this.killFeedItems.length > 5) this.killFeedItems.shift();
    this.renderKillFeed();
  }

  private renderKillFeed(): void {
    this.killFeed.innerHTML = this.killFeedItems
      .map((item) => `<div class="feed-item ${item.text.includes("Bạn") ? "feed-self" : ""}">${item.text}</div>`)
      .join("");
  }

  destroy(): void {
    this.root.remove();
  }
}

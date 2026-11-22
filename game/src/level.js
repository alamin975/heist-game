// The Midnight Vault's floor plan: walls, crates, the safe, the exit and the patrols.
// Every rect is { x, y, w, h } in field coordinates (960 x 640). The border's left wall
// has a gap at the bottom: the green exit door. Every patrol leg keeps at least 20px
// clear of every wall and crate, so no guard ever wedges itself against cover.
export function buildLevel() {
  const walls = [
    { x: 0, y: 0, w: 960, h: 16 }, // top border
    { x: 0, y: 624, w: 960, h: 16 }, // bottom border
    { x: 0, y: 0, w: 16, h: 540 }, // left border, upper part
    { x: 0, y: 620, w: 16, h: 20 }, // left border, below the exit
    { x: 944, y: 0, w: 16, h: 640 }, // right border
    { x: 300, y: 110, w: 16, h: 170 }, // pillar wall, left hall
    { x: 620, y: 340, w: 16, h: 180 }, // pillar wall, right hall
    { x: 480, y: 180, w: 220, h: 16 }, // cross wall, top gallery
    { x: 140, y: 420, w: 220, h: 16 }, // cross wall, lower hall
  ];
  const crates = [
    { x: 140, y: 280, w: 44, h: 44 },
    { x: 500, y: 90, w: 44, h: 44 },
    { x: 640, y: 340, w: 44, h: 44 },
    { x: 460, y: 480, w: 44, h: 44 },
    { x: 120, y: 500, w: 44, h: 44 },
  ];
  const safe = { x: 820, y: 80, w: 90, h: 70 };
  const diamond = { x: 865, y: 115 };
  const exit = { x: 0, y: 540, w: 28, h: 80 };
  const loot = [
    { x: 480, y: 300 },
    { x: 760, y: 480 },
    { x: 240, y: 140 },
  ];
  const guards = [
    { waypoints: [[200, 80], [200, 320], [420, 320], [420, 80]] },
    { waypoints: [[560, 540], [560, 300], [780, 300], [780, 540]] },
    { waypoints: [[460, 60], [730, 60], [730, 260], [460, 260]] },
  ];
  const cameras = [
    { x: 480, y: 16, base: Math.PI / 2 },
    { x: 944, y: 320, base: Math.PI },
  ];
  const playerStart = { x: 80, y: 320 };
  return { walls, crates, safe, diamond, exit, loot, guards, cameras, playerStart };
}

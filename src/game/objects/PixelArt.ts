import Phaser from 'phaser';
import type { ObstacleKind } from '../config/GameConfig';

type Painter = (p: (x: number, y: number, w: number, h: number, color: string) => void) => void;

function texture(scene: Phaser.Scene, key: string, width: number, height: number, painter: Painter): void {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, width, height);
  if (!canvas) return;
  const ctx = canvas.getContext();
  ctx.imageSmoothingEnabled = false;
  const p = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * 2, y * 2, w * 2, h * 2);
  };
  painter(p);
  canvas.refresh();
}

const ink = '#372536';
const yellow = '#ffcf4e';
const light = '#ffed8a';
const orange = '#ec8b30';
const denim = '#4389bb';

function chicken(scene: Phaser.Scene, pose: string, tick = 0): void {
  texture(scene, `chick-${pose}${pose === 'run' ? tick : ''}`, 64, 80, (p) => {
    const low = pose === 'duck';
    const hurt = pose === 'hit' || pose === 'over';
    const hop = pose === 'jump';
    const bob = pose === 'run' && tick === 1 ? 1 : 0;
    const bodyY = low ? 19 : 12 + bob;
    const bodyH = low ? 12 : 19;
    // Hair silhouette and jaunty middle part.
    p(8, bodyY - 4, 16, 7, ink);
    p(6, bodyY - 2, 6, 3, ink);
    p(11, bodyY - 5, 4, 3, ink);
    p(17, bodyY - 5, 5, 3, ink);
    p(15, bodyY - 2, 2, 5, yellow);
    p(5, bodyY + 1, 23, bodyH - 1, ink);
    p(7, bodyY + 2, 19, bodyH - 3, yellow);
    p(8, bodyY + 4, 12, 5, light);
    p(25, bodyY + 9, 5, 4, ink);
    p(26, bodyY + 10, 5, 2, orange);
    p(6, bodyY + bodyH - 3, 19, 3, ink);
    // Denim overall and straps.
    p(11, bodyY + bodyH - 10, 12, 9, denim);
    p(10, bodyY + bodyH - 12, 3, 6, ink);
    p(11, bodyY + bodyH - 12, 2, 6, denim);
    p(21, bodyY + bodyH - 12, 3, 6, ink);
    p(21, bodyY + bodyH - 12, 2, 6, denim);
    p(15, bodyY + bodyH - 8, 3, 3, '#a8d9ed');
    if (hurt) {
      p(20, bodyY + 5, 2, 2, ink); p(19, bodyY + 7, 2, 2, ink);
      p(11, bodyY + 7, 4, 2, ink);
    } else {
      p(20, bodyY + 5, 3, 4, ink);
      p(21, bodyY + 5, 1, 1, '#ffffff');
      p(11, bodyY + 8, 3, 2, '#e86b63');
    }
    // Wings shift by pose.
    const wingY = bodyY + (pose === 'celebrate' ? 1 : 12);
    p(2, wingY, 7, 5, ink); p(3, wingY + 1, 6, 3, yellow);
    if (pose === 'celebrate') { p(1, wingY - 5, 4, 6, yellow); p(25, wingY - 6, 4, 7, yellow); }
    if (low) {
      p(10, 32, 7, 3, ink); p(20, 32, 7, 3, ink);
      p(11, 33, 5, 2, orange); p(21, 33, 5, 2, orange);
    } else if (hop) {
      p(9, 31, 7, 4, ink); p(20, 29, 7, 4, ink);
      p(10, 32, 5, 2, orange); p(21, 30, 5, 2, orange);
    } else if (pose === 'over') {
      p(5, 33, 8, 3, ink); p(22, 35, 8, 3, ink);
    } else {
      const a = pose === 'run' && tick === 1 ? 3 : 0;
      p(10 - a, 30, 7, 7, ink); p(20 + a, 30, 7, 7, ink);
      p(11 - a, 31, 5, 5, orange); p(21 + a, 31, 5, 5, orange);
      p(8 - a, 36, 10, 2, ink); p(19 + a, 36, 10, 2, ink);
    }
    if (pose === 'basketball') { p(1, 27, 8, 8, ink); p(2, 28, 6, 6, orange); p(4, 28, 1, 6, ink); p(2, 30, 6, 1, ink); }
  });
}

function obstacle(scene: Phaser.Scene, kind: ObstacleKind): void {
  texture(scene, `ob-${kind}`, 72, 72, (p) => {
    switch (kind) {
      case 'crate':
        p(4, 12, 28, 24, ink); p(6, 14, 24, 20, '#bd7a44'); p(7, 15, 22, 3, '#e9ad69'); p(8, 18, 3, 15, '#8e5337'); p(26, 18, 3, 15, '#8e5337'); p(8, 29, 20, 3, '#8e5337'); p(13, 19, 4, 4, '#f7c67a'); p(18, 24, 4, 4, '#f7c67a');
        break;
      case 'rail':
        p(3, 8, 5, 28, ink); p(27, 8, 5, 28, ink); p(4, 9, 3, 26, '#ece1c5'); p(28, 9, 3, 26, '#ece1c5'); p(4, 13, 27, 7, ink); p(5, 14, 25, 5, '#f49943'); p(6, 15, 6, 3, '#fff7c0'); p(19, 15, 6, 3, '#fff7c0');
        break;
      case 'rock':
        p(4, 26, 28, 10, ink); p(7, 20, 22, 14, '#7b8292'); p(12, 17, 14, 14, '#aab0bd'); p(8, 27, 23, 6, '#606b7b'); p(12, 19, 11, 3, '#d4d7d7');
        break;
      case 'hay':
        p(3, 21, 29, 15, ink); p(5, 17, 25, 17, '#e6aa38'); p(9, 12, 17, 17, '#ffdc6b'); p(6, 25, 24, 3, '#ad7430'); p(10, 15, 3, 11, '#fff2a3'); p(22, 18, 3, 12, '#bd822e');
        break;
      case 'basketball':
        p(5, 15, 26, 21, ink); p(8, 10, 20, 26, orange); p(11, 7, 14, 29, '#f2a23c'); p(17, 8, 2, 27, ink); p(8, 20, 20, 2, ink); p(8, 13, 7, 3, ink); p(22, 28, 6, 3, ink);
        break;
      case 'bird':
        p(4, 15, 27, 11, ink); p(8, 17, 20, 8, '#7a64ad'); p(3, 12, 11, 6, '#a893d1'); p(19, 9, 10, 8, '#a893d1'); p(27, 18, 7, 4, orange); p(24, 18, 2, 2, '#ffffff'); p(6, 24, 5, 4, ink);
        break;
      case 'speaker':
        p(6, 8, 24, 28, ink); p(8, 10, 20, 24, '#5b526e'); p(10, 11, 16, 4, '#bb88df'); p(11, 17, 14, 14, ink); p(13, 19, 10, 10, '#bd84da'); p(16, 22, 4, 4, '#efcaff');
        break;
      case 'barricade':
        p(5, 9, 5, 27, ink); p(26, 9, 5, 27, ink); p(7, 11, 22, 4, '#fff2c4'); p(4, 15, 29, 13, ink); p(6, 17, 25, 9, '#f09b39'); p(7, 18, 7, 7, '#fff2c4'); p(20, 18, 7, 7, '#fff2c4');
        break;
    }
  });
}

export function createPixelArt(scene: Phaser.Scene): void {
  for (const pose of ['idle', 'jump', 'duck', 'hit', 'over', 'basketball', 'celebrate']) chicken(scene, pose);
  chicken(scene, 'run', 0); chicken(scene, 'run', 1);
  for (const kind of ['crate', 'rail', 'rock', 'hay', 'basketball', 'bird', 'speaker', 'barricade'] as ObstacleKind[]) obstacle(scene, kind);
  texture(scene, 'corn', 28, 42, (p) => {
    p(4, 2, 7, 15, ink); p(5, 2, 5, 14, '#ffce4e'); p(5, 4, 5, 2, '#fff49c'); p(5, 8, 5, 2, '#fff49c'); p(5, 12, 5, 2, '#fff49c'); p(1, 11, 4, 9, '#4d9b5d'); p(10, 10, 3, 10, '#397f54'); p(5, 17, 2, 3, '#397f54');
  });
  texture(scene, 'power', 40, 40, (p) => {
    p(3, 3, 14, 14, ink); p(5, 5, 10, 10, '#f6b249'); p(7, 2, 6, 4, '#ffe76d'); p(9, 6, 5, 5, '#fff8bd'); p(6, 12, 8, 2, '#e0795f');
  });
}

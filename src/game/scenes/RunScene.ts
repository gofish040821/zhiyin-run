import Phaser from 'phaser';
import { GameConfig, type ObstacleKind } from '../config/GameConfig';
import { createPixelArt } from '../objects/PixelArt';
import { audio } from '../systems/AudioSystem';
import { runEvents, type RunState } from '../systems/RunEvents';
import { getBest, setBest } from '../utils/storage';

type Obstacle = { sprite: Phaser.GameObjects.Image; kind: ObstacleKind; x: number; bottom: number; width: number; height: number; passed: boolean; minGap: number; phase: number };
type Pickup = { sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Text; kind: 'corn' | 'power' | 'skill'; skill?: string; x: number; y: number; phase: number };
type Spark = { graphic: Phaser.GameObjects.Rectangle; vx: number; vy: number; life: number };

const obstacleHeights: Record<ObstacleKind, number> = { crate: 48, rail: 53, rock: 38, hay: 44, basketball: 47, bird: 23, speaker: 56, barricade: 53 };
const skillItems = ['唱', '跳', 'RAP', '篮'];

export class RunScene extends Phaser.Scene {
  private state: RunState = 'title';
  private background!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Image;
  private basketball!: Phaser.GameObjects.Image;
  private obstacles: Obstacle[] = [];
  private pickups: Pickup[] = [];
  private sparks: Spark[] = [];
  private distance = 0;
  private score = 0;
  private cornScore = 0;
  private best = getBest();
  private speed: number = GameConfig.baseSpeed;
  private playerBottom: number = GameConfig.groundY;
  private verticalSpeed = 0;
  private ducking = false;
  private duckHeld = false;
  private duckUntil = 0;
  private nextObstacle = 1.5;
  private nextPickup = 0.6;
  private elapsed = 0;
  private worldOffset = 0;
  private combo = 0;
  private comboTime = 0;
  private powerTime = 0;
  private powerName = '';
  private skillSet = new Set<string>();
  private deathTime = 0;
  private lastHud = 0;
  private lastBounce = 0;

  constructor() { super('RunScene'); }

  create(): void {
    createPixelArt(this);
    this.setHeroImage('hero-chick', 'chick-basketball');
    this.setHeroImage('hero-ball', 'ob-basketball');
    this.background = this.add.graphics().setDepth(-10);
    this.player = this.add.image(GameConfig.playerX, GameConfig.groundY, 'chick-idle').setOrigin(0.5, 1).setScale(1.5).setDepth(10);
    this.basketball = this.add.image(GameConfig.playerX - 48, GameConfig.groundY, 'ob-basketball').setOrigin(0.5, 1).setScale(0.65).setDepth(9);
    this.drawBackground();
    this.emit();
  }

  private setHeroImage(id: string, key: string): void {
    const element = document.getElementById(id);
    const source = this.textures.get(key).getSourceImage();
    if (element instanceof HTMLImageElement && source instanceof HTMLCanvasElement) element.src = source.toDataURL();
  }

  private reset(): void {
    this.obstacles.forEach((item) => item.sprite.destroy());
    this.pickups.forEach((item) => item.sprite.destroy());
    this.sparks.forEach((item) => item.graphic.destroy());
    this.obstacles = []; this.pickups = []; this.sparks = [];
    this.distance = 0; this.score = 0; this.cornScore = 0; this.combo = 0; this.comboTime = 0;
    this.speed = GameConfig.baseSpeed; this.playerBottom = GameConfig.groundY; this.verticalSpeed = 0;
    this.ducking = false; this.duckHeld = false; this.duckUntil = 0; this.nextObstacle = 1.55; this.nextPickup = 0.9;
    this.elapsed = 0; this.worldOffset = 0; this.powerTime = 0; this.powerName = '';
    this.skillSet.clear(); this.deathTime = 0; this.lastHud = 0;
    this.player.setPosition(GameConfig.playerX, GameConfig.groundY).setAngle(0).setAlpha(1).setTexture('chick-run0');
    this.basketball.setPosition(GameConfig.playerX - 48, GameConfig.groundY).setAngle(0).setAlpha(1);
    this.state = 'playing';
    this.emit();
  }

  startRun(): void { this.reset(); }
  restart(): void { if (this.state === 'gameover') this.reset(); }
  togglePause(): void {
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
    this.emit();
  }
  jump(): void {
    if (this.state !== 'playing' || this.playerBottom < GameConfig.groundY - 1 || this.ducking) return;
    this.verticalSpeed = GameConfig.jumpVelocity;
    audio.jump();
  }
  setDuck(value: boolean): void {
    if (this.state !== 'playing') return;
    this.duckHeld = value;
    this.ducking = value && this.playerBottom >= GameConfig.groundY - 1;
  }
  swipeDuck(): void {
    if (this.state !== 'playing') return;
    this.duckUntil = this.elapsed + 0.7;
    this.ducking = this.playerBottom >= GameConfig.groundY - 1;
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.04);
    this.elapsed += dt;
    if (this.state === 'title') {
      this.worldOffset += dt * 35;
      this.drawBackground();
      this.player.setTexture(Math.floor(this.elapsed * 2) % 2 ? 'chick-basketball' : 'chick-idle');
      this.basketball.y = GameConfig.groundY - Math.abs(Math.sin(this.elapsed * 5)) * 20;
      return;
    }
    if (this.state === 'paused' || this.state === 'gameover') return;
    if (this.state === 'dying') {
      this.deathTime += dt;
      this.player.x += dt * 190;
      this.player.y += this.verticalSpeed * dt;
      this.verticalSpeed += GameConfig.gravity * dt;
      this.player.angle += dt * 260;
      this.basketball.x += dt * 260;
      this.basketball.angle += dt * 400;
      if (this.deathTime > 0.85) this.finishDeath();
      return;
    }
    this.worldOffset += this.speed * dt;
    this.distance += this.speed * dt / GameConfig.distanceDivisor;
    this.speed = Math.min(GameConfig.maxSpeed, GameConfig.baseSpeed + this.distance * GameConfig.speedGainPerMeter) * (this.powerTime > 0 ? 1.22 : 1);
    this.comboTime -= dt;
    if (this.comboTime <= 0 && this.combo) this.combo = 0;
    if (this.powerTime > 0) {
      this.powerTime = Math.max(0, this.powerTime - dt);
      if (this.powerTime === 0) this.powerName = '';
      if (Math.random() < dt * 30) this.spark(GameConfig.playerX + Phaser.Math.Between(-18, 20), this.playerBottom - Phaser.Math.Between(10, 58), '#ffe873', 0.4);
      if (Math.random() < dt * 2) this.cameras.main.shake(75, 0.002);
    }
    this.updatePlayer(dt);
    this.nextObstacle -= dt;
    if (this.nextObstacle <= 0) this.spawnObstacle();
    this.nextPickup -= dt;
    if (this.nextPickup <= 0) this.spawnPickup();
    this.updateObstacles(dt);
    this.updatePickups(dt);
    this.updateSparks(dt);
    this.drawBackground();
    if (this.elapsed - this.lastHud > 0.07) { this.emit(); this.lastHud = this.elapsed; }
  }

  private updatePlayer(dt: number): void {
    const wasAirborne = this.playerBottom < GameConfig.groundY - 1;
    if (this.verticalSpeed !== 0 || wasAirborne) {
      this.playerBottom += this.verticalSpeed * dt;
      this.verticalSpeed += GameConfig.gravity * dt;
      if (this.playerBottom >= GameConfig.groundY) {
        this.playerBottom = GameConfig.groundY; this.verticalSpeed = 0;
        audio.land(); this.spark(GameConfig.playerX - 15, GameConfig.groundY - 5, '#f7e3ae', 0.22);
      }
    }
    if (this.duckUntil <= this.elapsed) this.duckUntil = 0;
    this.ducking = (this.duckHeld || this.duckUntil > 0) && this.playerBottom >= GameConfig.groundY - 1;
    const pose = this.ducking ? 'duck' : this.playerBottom < GameConfig.groundY - 1 ? 'jump' : this.powerName === '全能练习生' ? 'celebrate' : `run${Math.floor(this.elapsed * 11) % 2}`;
    this.player.setTexture(`chick-${pose}`).setY(this.playerBottom + (pose.startsWith('run') ? Math.sin(this.elapsed * 22) * 2 : 0));
    this.player.setTint(this.powerTime > 0 ? (Math.floor(this.elapsed * 12) % 2 ? 0xffe77d : 0xffffff) : 0xffffff);
    this.basketball.setVisible(this.powerName === '全能练习生').setPosition(GameConfig.playerX - 48, GameConfig.groundY - Math.abs(Math.sin(this.elapsed * 11)) * 24);
    if (this.powerName === '全能练习生' && this.elapsed - this.lastBounce > 0.4) { audio.basketball(); this.lastBounce = this.elapsed; }
  }

  private chooseObstacle(): ObstacleKind {
    const entries = Object.entries(GameConfig.obstacleWeights) as [ObstacleKind, number][];
    const unlocked = entries.filter(([kind]) => kind !== 'bird' || this.distance > 200);
    const total = unlocked.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;
    for (const [kind, weight] of unlocked) { roll -= weight; if (roll <= 0) return kind; }
    return 'crate';
  }

  private spawnObstacle(): void {
    const kind = this.chooseObstacle();
    const bottom = kind === 'bird' ? 397 : GameConfig.groundY;
    const sprite = this.add.image(1010, kind === 'bird' ? 417 : bottom, `ob-${kind}`).setOrigin(0.5, 1).setDepth(8);
    this.obstacles.push({ sprite, kind, x: 1010, bottom, width: kind === 'bird' ? 53 : 52, height: obstacleHeights[kind], passed: false, minGap: Infinity, phase: Math.random() * 6 });
    const reduction = Math.min(0.32, this.distance * GameConfig.obstacleGapReduction);
    this.nextObstacle = Phaser.Math.FloatBetween(GameConfig.obstacleGapSeconds.min, GameConfig.obstacleGapSeconds.max) - reduction;
    // Even at maximum speed the next obstacle remains more than one jump arc away.
    this.nextObstacle = Math.max(this.nextObstacle, 1.1);
  }

  private spawnPickup(): void {
    const x = 1040;
    const roll = Math.random();
    let pickup: Pickup;
    if (this.distance > 280 && roll < 0.13) {
      const sprite = this.add.image(x, GameConfig.groundY - 90, 'power').setDepth(7).setScale(1.2);
      pickup = { sprite, kind: 'power', x, y: GameConfig.groundY - 90, phase: Math.random() * 6 };
    } else if (this.distance > 180 && roll < 0.36) {
      const skill = skillItems[Math.floor(Math.random() * skillItems.length)];
      const sprite = this.add.text(x, GameConfig.groundY - 96, skill, { fontFamily: 'monospace', fontSize: skill === 'RAP' ? '18px' : '25px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#9b62bd', padding: { x: 7, y: 6 } }).setOrigin(0.5).setDepth(7);
      pickup = { sprite, kind: 'skill', skill, x, y: GameConfig.groundY - 96, phase: Math.random() * 6 };
    } else {
      const y = Math.random() < 0.55 ? GameConfig.groundY - 65 : GameConfig.groundY - 115;
      const sprite = this.add.image(x, y, 'corn').setDepth(7).setScale(1.25);
      pickup = { sprite, kind: 'corn', x, y, phase: Math.random() * 6 };
    }
    this.pickups.push(pickup);
    this.nextPickup = Phaser.Math.FloatBetween(0.65, 1.3);
  }

  private playerBounds(): Phaser.Geom.Rectangle {
    const height = this.ducking ? 34 : 59;
    return new Phaser.Geom.Rectangle(GameConfig.playerX - 23, this.playerBottom - height, 47, height);
  }

  private updateObstacles(dt: number): void {
    const player = this.playerBounds();
    for (const item of this.obstacles) {
      item.x -= this.speed * dt;
      if (item.kind === 'basketball') item.sprite.y = GameConfig.groundY - Math.abs(Math.sin(this.elapsed * 7 + item.phase)) * 10;
      if (item.kind === 'bird') item.sprite.y = 417 + Math.sin(this.elapsed * 5 + item.phase) * 3;
      item.sprite.x = item.x;
      const bottom = item.kind === 'basketball' ? item.sprite.y : item.bottom;
      const bounds = new Phaser.Geom.Rectangle(item.x - item.width / 2, bottom - item.height, item.width, item.height);
      const horizontalOverlap = player.right > bounds.left && player.left < bounds.right;
      if (horizontalOverlap) {
        const gap = player.bottom < bounds.top ? bounds.top - player.bottom : player.top > bounds.bottom ? player.top - bounds.bottom : 0;
        item.minGap = Math.min(item.minGap, gap);
        if (Phaser.Geom.Intersects.RectangleToRectangle(player, bounds)) {
          if (this.powerTime > 0) {
            this.spark(item.x, item.bottom - 25, '#ffe769', 0.7, 12);
            item.sprite.destroy(); item.x = -200;
            this.score += 25;
          } else { this.hit(); return; }
        }
      }
      if (!item.passed && item.x + item.width / 2 < player.left) {
        item.passed = true;
        if (item.minGap <= 86 && this.powerTime <= 0) this.perfect();
      }
    }
    this.obstacles = this.obstacles.filter((item) => {
      if (item.x < -90) { if (item.sprite.active) item.sprite.destroy(); return false; }
      return true;
    });
  }

  private updatePickups(dt: number): void {
    const player = this.playerBounds();
    for (const item of this.pickups) {
      item.x -= this.speed * dt;
      item.sprite.setPosition(item.x, item.y + Math.sin(this.elapsed * 5 + item.phase) * 5);
      const bounds = new Phaser.Geom.Rectangle(item.x - 18, item.y - 20, 36, 40);
      if (Phaser.Geom.Intersects.RectangleToRectangle(player, bounds)) {
        this.collect(item);
        item.sprite.destroy(); item.x = -200;
      }
    }
    this.pickups = this.pickups.filter((item) => {
      if (item.x < -80) { if (item.sprite.active) item.sprite.destroy(); return false; }
      return true;
    });
  }

  private collect(item: Pickup): void {
    this.spark(item.x, item.y, item.kind === 'corn' ? '#ffce4e' : '#d895f9', 0.5, 9);
    if (item.kind === 'corn') {
      this.cornScore += GameConfig.cornValue * this.multiplier();
      audio.corn();
      this.floatText(`+${Math.floor(GameConfig.cornValue * this.multiplier())} 🌽`, item.x, item.y - 30, '#ffd15c');
    } else if (item.kind === 'power') {
      this.powerName = '2.5 秒模式'; this.powerTime = GameConfig.powerDuration;
      audio.power(); this.floatText('无敌 2.5 秒!', item.x, item.y - 30, '#ffed7a');
    } else if (item.skill) {
      this.skillSet.add(item.skill);
      audio.corn(); this.floatText(`${item.skill} ${this.skillSet.size}/4`, item.x, item.y - 30, '#dda8ff');
      if (this.skillSet.size === 4) {
        this.skillSet.clear(); this.powerName = '全能练习生'; this.powerTime = GameConfig.allRoundDuration;
        audio.power(); this.floatText('全能练习生!', GameConfig.playerX + 40, 215, '#fff38a');
      }
    }
  }

  private multiplier(): number { return 1 + this.combo * GameConfig.scoreMultiplierPerCombo + (this.powerName === '全能练习生' ? 1 : 0); }

  private perfect(): void {
    this.combo += 1; this.comboTime = GameConfig.comboTimeout;
    this.score += GameConfig.perfectValue * this.multiplier();
    audio.combo(this.combo);
    this.floatText(`PERFECT ×${this.combo}`, GameConfig.playerX + 64, 290, '#fff17a');
    this.spark(GameConfig.playerX + 12, this.playerBottom - 35, '#ffffff', 0.35, 5);
  }

  private hit(): void {
    this.state = 'dying'; this.deathTime = 0; this.verticalSpeed = -440;
    this.player.setTexture('chick-hit').setTint(0xffffff);
    this.cameras.main.shake(330, 0.012);
    this.spark(GameConfig.playerX + 20, this.playerBottom - 35, '#ff9a79', 0.8, 16);
    this.floatText('哎哟！', GameConfig.playerX + 45, this.playerBottom - 115, '#ffffff');
    this.basketball.setVisible(true).setPosition(GameConfig.playerX - 25, GameConfig.groundY);
    audio.hit();
    this.emit();
  }

  private finishDeath(): void {
    this.state = 'gameover';
    this.player.setTexture('chick-over');
    this.best = setBest(this.distance);
    audio.gameOver(); this.emit();
  }

  private floatText(message: string, x: number, y: number, color: string): void {
    const label = this.add.text(x, y, message, { fontFamily: 'monospace', fontSize: '21px', fontStyle: 'bold', color, stroke: '#35273d', strokeThickness: 5 }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: label, y: y - 58, alpha: 0, duration: 900, onComplete: () => label.destroy() });
  }

  private spark(x: number, y: number, color: string, life: number, count = 5): void {
    for (let i = 0; i < count; i++) {
      const graphic = this.add.rectangle(x, y, Phaser.Math.Between(4, 8), Phaser.Math.Between(4, 8), Phaser.Display.Color.HexStringToColor(color).color).setDepth(20);
      this.sparks.push({ graphic, vx: Phaser.Math.Between(-130, 130), vy: Phaser.Math.Between(-170, -20), life });
    }
  }

  private updateSparks(dt: number): void {
    for (const item of this.sparks) {
      item.life -= dt; item.graphic.x += item.vx * dt; item.graphic.y += item.vy * dt;
      item.vy += 420 * dt; item.graphic.alpha = Math.min(1, item.life * 2);
    }
    this.sparks = this.sparks.filter((item) => { if (item.life <= 0) { item.graphic.destroy(); return false; } return true; });
  }

  private drawBackground(): void {
    const g = this.background;
    g.clear();
    g.fillGradientStyle(0x83cce5, 0x83cce5, 0xd6eff0, 0xd6eff0).fillRect(0, 0, 960, 432);
    g.fillStyle(0xffe7a0).fillCircle(795, 95, 44);
    const cloudShift = this.worldOffset * 0.12;
    for (let i = -1; i < 5; i++) {
      const x = i * 270 + 75 - cloudShift % 270;
      g.fillStyle(0xf6fff3).fillRoundedRect(x, 80 + (i % 2) * 35, 100, 25, 10);
      g.fillCircle(x + 26, 81 + (i % 2) * 35, 21).fillCircle(x + 60, 77 + (i % 2) * 35, 27);
    }
    g.fillStyle(0xa4c89d).fillEllipse(210, 376, 540, 180).fillEllipse(760, 375, 640, 170);
    g.fillStyle(0x83b282).fillEllipse(360, 401, 570, 145).fillEllipse(940, 401, 620, 145);
    const farShift = this.worldOffset * 0.22;
    for (let i = -1; i < 6; i++) {
      const x = i * 250 + 60 - farShift % 250;
      g.fillStyle(0x77596b).fillTriangle(x + 30, 317, x + 90, 280, x + 150, 317);
      g.fillStyle(0xf9dca8).fillRect(x + 43, 317, 94, 76);
      g.fillStyle(0xb27871).fillRect(x + 82, 348, 19, 45);
      g.fillStyle(0x7ab8c6).fillRect(x + 51, 332, 15, 17);
    }
    g.fillStyle(0x8ec366).fillRect(0, 397, 960, 35);
    const fenceShift = this.worldOffset * 0.46;
    for (let i = -1; i < 20; i++) {
      const x = i * 66 - fenceShift % 66;
      g.fillStyle(0xf6dfb1).fillRect(x, 365, 7, 67).fillRect(x - 8, 382, 80, 6).fillRect(x - 8, 410, 80, 6);
      g.fillStyle(0xd3ad7e).fillRect(x + 5, 368, 2, 64);
    }
    g.fillStyle(0x557e5b).fillRect(0, 430, 960, 5);
    g.fillStyle(0xe6c999).fillRect(0, 435, 960, 105);
    g.fillStyle(0xd6b481).fillRect(0, 435, 960, 8);
    for (let i = -1; i < 20; i++) {
      const x = i * 74 - this.worldOffset % 74;
      g.fillStyle(0xc49d6a).fillRect(x + 20, 465, 25, 3).fillRect(x + 48, 503, 14, 3);
      g.fillStyle(0xf6e0b1).fillRect(x, 477, 14, 2);
    }
  }

  private emit(): void {
    runEvents.emit({ state: this.state, distance: Math.floor(this.distance), score: Math.floor(this.distance + this.cornScore + this.score), best: Math.max(this.best, Math.floor(this.distance)), combo: this.combo, power: this.powerName, powerRemaining: this.powerTime });
  }
}

import Phaser from 'phaser';
import { GameConfig } from './game/config/GameConfig';
import { RunScene } from './game/scenes/RunScene';
import { audio } from './game/systems/AudioSystem';
import { runEvents } from './game/systems/RunEvents';
import { getBest } from './game/utils/storage';
import './style.css';

const scene = new RunScene();
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GameConfig.width,
  height: GameConfig.height,
  backgroundColor: '#92cfe5',
  pixelArt: true,
  roundPixels: true,
  render: { antialias: false, powerPreference: 'high-performance' },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [scene]
});

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const start = $('start-screen');
const pause = $('pause-screen');
const gameover = $('gameover-screen');
const hud = $('hud');
const pauseButton = $('pause-button') as HTMLButtonElement;
const muteButton = $('mute-button') as HTMLButtonElement;
$('start-best').textContent = `${getBest()} m`;

runEvents.on((data) => {
  start.classList.toggle('hidden', data.state !== 'title');
  pause.classList.toggle('hidden', data.state !== 'paused');
  gameover.classList.toggle('hidden', data.state !== 'gameover');
  hud.classList.toggle('hidden', data.state === 'title');
  $('distance').innerHTML = `${data.distance} <small>m</small>`;
  $('best').innerHTML = `${data.best} <small>m</small>`;
  $('score').textContent = `得分 ${data.score}`;
  $('combo').textContent = data.combo ? `PERFECT ×${data.combo}` : '';
  $('combo').classList.toggle('hot', data.combo >= 5);
  const timer = $('power-timer');
  timer.textContent = data.power ? `${data.power} ${data.powerRemaining.toFixed(1)}s` : '';
  timer.classList.toggle('hidden', !data.power);
  if (data.state === 'gameover') {
    $('final-distance').textContent = `${data.distance} m`;
    $('final-score').textContent = String(data.score);
    $('final-best').textContent = `${data.best} m`;
    $('start-best').textContent = `${data.best} m`;
  }
  pauseButton.disabled = data.state === 'title' || data.state === 'gameover' || data.state === 'dying';
  pauseButton.textContent = data.state === 'paused' ? '▶' : 'Ⅱ';
});

$('start-button').addEventListener('click', () => scene.startRun());
$('restart-button').addEventListener('click', () => scene.restart());
$('resume-button').addEventListener('click', () => scene.togglePause());
pauseButton.addEventListener('click', () => scene.togglePause());
muteButton.addEventListener('click', () => {
  muteButton.textContent = audio.toggle() ? '♪̸' : '♫';
  muteButton.setAttribute('aria-label', audio.muted ? '开启声音' : '静音');
});

window.addEventListener('keydown', (event) => {
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
  if (event.repeat && event.code !== 'ArrowDown') return;
  if (event.code === 'Space' || event.code === 'ArrowUp') scene.jump();
  if (event.code === 'ArrowDown') scene.setDuck(true);
  if (event.code === 'KeyP' || event.code === 'Escape') scene.togglePause();
  if (event.code === 'KeyM') muteButton.click();
  if (event.code === 'KeyR') scene.restart();
});
window.addEventListener('keyup', (event) => { if (event.code === 'ArrowDown') scene.setDuck(false); });
window.addEventListener('blur', () => scene.setDuck(false));

let touchStart: { x: number; y: number } | undefined;
const game = $('game');
game.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch') { scene.jump(); return; }
  touchStart = { x: event.clientX, y: event.clientY };
});
game.addEventListener('pointerup', (event) => {
  if (event.pointerType !== 'touch' || !touchStart) return;
  if (event.clientY - touchStart.y > 35) scene.swipeDuck();
  else scene.jump();
  touchStart = undefined;
});
game.addEventListener('pointercancel', () => { touchStart = undefined; });

import { load } from './save.js';
import { initUI } from './ui.js';
import { initGame, startGame, pauseGame, resumeGame, quitToMenu } from './game.js';

load();
initUI({ play: startGame, pause: pauseGame, resume: resumeGame, quit: quitToMenu });
initGame(document.getElementById('c'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

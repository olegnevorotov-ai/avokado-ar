import './model-viewer.min.js';
import { stages } from './stages.js';

const viewer = document.querySelector('model-viewer');
const stageGroup = document.querySelector('.stages');
const day = document.querySelector('.day');
const note = document.querySelector('.text');
const status = document.querySelector('.status');
const place = document.querySelector('.place');
const unavailable = 'На этом устройстве доступен просмотр в 3D.';

function showStage(stage) {
  const src = `./models/${stage.key}.glb`;
  if (viewer.getAttribute('src') === src) return;
  status.textContent = '';
  day.textContent = `День ${stage.day}.`;
  note.textContent = stage.note;
  viewer.alt = `${stage.name} · день ${stage.day}`;
  for (const button of stageGroup.children) {
    button.setAttribute('aria-pressed', String(button.dataset.stage === stage.key));
  }
  viewer.setAttribute('src', src);
}

for (const stage of stages) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.stage = stage.key;
  button.textContent = stage.name;
  button.addEventListener('click', () => showStage(stage));
  stageGroup.append(button);
}

viewer.addEventListener('error', () => {
  status.textContent = 'Модель не загрузилась. Попробуй открыть страницу снова.';
});
viewer.addEventListener('ar-status', event => {
  if (event.detail.status === 'failed') status.textContent = unavailable;
});
place.addEventListener('click', async () => {
  if (!viewer.canActivateAR) {
    status.textContent = unavailable;
    return;
  }
  status.textContent = viewer.loaded ? '' : 'Загружаем модель…';
  try {
    await viewer.activateAR();
    if (viewer.canActivateAR) status.textContent = '';
  } catch {
    status.textContent = 'Камера не открылась. Модель можно крутить на странице.';
  }
});

showStage(stages.at(-1));

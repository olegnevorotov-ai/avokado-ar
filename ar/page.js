import { models } from './models.js';

const viewer = document.querySelector('model-viewer');
const poster = document.querySelector('.poster');
const hint = document.querySelector('.hint');
const picker = document.querySelector('.models');
const lead = document.querySelector('.lead');
const note = document.querySelector('.text');
const status = document.querySelector('.status');
const place = document.querySelector('.place');
const placeLabel = document.querySelector('.place-label');
const unavailable = 'На этом устройстве доступен просмотр в 3D.';
const noWebGL = 'На этом устройстве 3D не работает, вот как выглядит дерево';
let selectedKey;

function supportsWebGL() {
  const context = document.createElement('canvas').getContext('webgl2');
  context?.getExtension('WEBGL_lose_context')?.loseContext();
  return Boolean(context);
}

// Библиотека создаёт рендерер при подключении элемента, даже без модели.
const interactive = supportsWebGL();
if (interactive) await import('./model-viewer.min.js');
viewer.hidden = !interactive;
hint.hidden = !interactive;
poster.hidden = interactive;

function showModel(model) {
  if (selectedKey === model.key) return;
  selectedKey = model.key;
  status.textContent = '';
  lead.textContent = model.lead;
  note.textContent = model.note;
  placeLabel.textContent = model.place;
  viewer.setAttribute('alt', model.alt);
  viewer.setAttribute('poster', model.poster);
  for (const button of picker.children) {
    button.setAttribute('aria-pressed', String(button.dataset.model === model.key));
  }
  if (interactive) {
    viewer.setAttribute('src', `./models/${model.key}.glb`);
  } else {
    poster.alt = model.alt;
    poster.src = model.poster;
  }
}

for (const button of picker.children) {
  const model = models.find(model => model.key === button.dataset.model);
  button.addEventListener('click', () => showModel(model));
}

viewer.addEventListener('error', () => {
  status.textContent = 'Модель не загрузилась. Попробуй открыть страницу снова.';
});
viewer.addEventListener('ar-status', event => {
  if (event.detail.status === 'failed') status.textContent = unavailable;
});
place.addEventListener('click', async () => {
  if (!interactive) {
    status.textContent = noWebGL;
    return;
  }
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

picker.querySelector('[aria-pressed="true"]').click();

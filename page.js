'use strict';

const HEIGHT_FACTS = { student: '1,2 м', tree: '20 м' };
// Тёмная подсказка — только когда стебель уже заметен, как в макете (ref/itog.html, noteFor).
const DARK_NOTE_MIN_HEIGHT_CM = 0.5;
const CONDITION_NOTES = {
  dry: 'Вода не достаёт до косточки. Без воды она сохнет и не просыпается.',
  wet: 'Косточка почти вся под водой. Корням нечем дышать, и они загнивают.',
  dark: 'В темноте стебель вытягивается, ищет свет и становится бледным. Листья не раскрываются как на свету.',
};

// Если показано несколько этапов с одним днём, выбираем кадр последнего из них.
function frameForDay(entry, day) {
  const first = entry.days.findIndex(frameDay => frameDay >= day);
  const milestones = entry.stageFrames.filter(frame => frame !== null && entry.days[frame] === day);
  return Math.max(first, ...milestones);
}

/**
 * Подсказка условия опыта на этот день или null, если показывать обычный этап роста.
 * Гниение и вытягивание берутся из состояния модели (growth.py), а не с первого дня.
 */
function conditionNote(scenario, entry, day) {
  if (scenario === 'dry') return CONDITION_NOTES.dry;
  if (scenario === 'wet' && entry.rot[day]) return CONDITION_NOTES.wet;
  if (scenario === 'dark' && entry.height[day] >= DARK_NOTE_MIN_HEIGHT_CM) return CONDITION_NOTES.dark;
  return null;
}

function initPage() {
  const data = filmData;
  const byId = id => document.getElementById(id);
  const video = byId('sim-video');
  const frameBox = byId('sim-frame');
  const poster = byId('sim-poster');
  const range = byId('day');
  const play = byId('play');
  const captions = byId('part-layer');
  const options = byId('scns');
  const stages = byId('stages');
  let scenario = 'best';
  let frame = data.scenarios.best.days.length - 1;
  let pendingSeek = null;

  function preparePage() {
    document.querySelectorAll('[data-span]').forEach(node => {
      node.textContent = `${data.days} дней за ${data.heroSeconds} секунд`;
    });
    byId('cut-title').textContent = data.titles.cut;
    const sprout = `${data.bestHeight} см`;
    byId('sprout-height').textContent = sprout;
    byId('student-height').textContent = HEIGHT_FACTS.student;
    byId('tree-height').textContent = HEIGHT_FACTS.tree;
    byId('tree-height-title').textContent = `до ${HEIGHT_FACTS.tree}`;
    byId('height-comparison').setAttribute('aria-label',
      `Сравнение высоты: росток ${sprout}, ученица ${HEIGHT_FACTS.student}, дерево авокадо ${HEIGHT_FACTS.tree}`);
    document.querySelectorAll('.preview').forEach(preview => {
      const player = preview.querySelector('video');
      const start = preview.querySelector('button');
      start.addEventListener('click', () => {
        player.controls = true;
        start.hidden = true;
        player.focus();
        // При отказе автозапуска остаются доступными нативные кнопки плеера.
        player.play().catch(() => {});
      });
    });
    byId('board').innerHTML = data.storyboard.map(shot =>
      `<div class="shot"><img src="media/${shot.file}" alt="" loading="lazy">
        <time>${shot.time}</time><p>${shot.description}</p></div>`
    ).join('');
    range.max = data.days;
    options.innerHTML = Object.entries(data.scenarios).map(([key, entry]) =>
      `<button type="button" class="scn" data-scenario="${key}" aria-pressed="false">
        <b>${entry.name}</b><span>${entry.sub}</span></button>`
    ).join('');
    stages.innerHTML = [...data.parts.slice(0, 3), 'Росток', data.parts[4],
      'Деревце'].map(name => `<li><b>${name}</b><span></span></li>`).join('');
    captions.innerHTML = data.parts.map(part => `<span class="part">${part}</span>`).join('');
  }

  // Обе линии графика строятся из рассчитанных в growth.py значений.
  const graph = { x: 50, y: 184, width: 565, height: 158, max: 0 };
  const chartX = day => graph.x + day / data.days * graph.width;
  const chartY = height => graph.y - height / graph.max * graph.height;
  const line = (heights, until) => heights.slice(0, until + 1).map((height, day) =>
    `${day === 0 ? 'M' : 'L'}${chartX(day).toFixed(1)} ${chartY(height).toFixed(1)}`
  ).join('');

  function prepareChart() {
    const heightStep = 10;
    const dayStep = data.days / 5;
    const highest = Math.max(...Object.values(data.scenarios).flatMap(entry => entry.height));
    graph.max = Math.ceil(highest / heightStep) * heightStep;
    const guide = [];
    for (let height = 0; height <= graph.max; height += heightStep) {
      const y = chartY(height);
      guide.push(`<path d="M${graph.x} ${y}h${graph.width}" stroke="#e3e9d8"></path>
        <text x="${graph.x - 9}" y="${y + 4}" text-anchor="end">${height}</text>`);
    }
    for (let day = 0; day <= data.days; day += dayStep) {
      guide.push(`<text x="${chartX(day)}" y="204" text-anchor="middle">${day}</text>`);
    }
    guide.push('<text x="24" y="13">см</text><text x="614" y="223" text-anchor="end">дни</text>');
    byId('grid').innerHTML = guide.join('');
    byId('grid').setAttribute('font-size', '12');
    byId('grid').setAttribute('fill', '#56664a');
    const best = data.scenarios.best;
    byId('ideal-line').setAttribute('d', line(best.height, data.days));
    const legend = byId('ideal-label');
    const day = Math.round(data.days * 0.53);
    legend.setAttribute('x', chartX(day));
    legend.setAttribute('y', chartY(best.height[day]) - 16);
    legend.textContent = best.name.toLowerCase();
  }

  function updateStages(entry) {
    const reached = entry.stageFrames.findLastIndex(milestone => milestone !== null && milestone <= frame);
    Array.from(stages.children).forEach((node, index) => {
      const milestone = entry.stageFrames[index];
      node.classList.toggle('done', milestone !== null && milestone <= frame);
      node.classList.toggle('now', index === reached);
      node.lastElementChild.textContent = milestone === null ? 'не успеет' : `день ${entry.days[milestone]}`;
    });
    return reached;
  }

  function updateCaptions(entry) {
    Array.from(captions.children).forEach((node, index) => {
      const part = entry.parts[frame][index];
      node.hidden = part === null;
      if (part) {
        node.style.left = `${part[0] * 100}%`;
        node.style.top = `${part[1] * 100}%`;
      }
    });
  }

  function update() {
    const entry = data.scenarios[scenario];
    const day = entry.days[frame];
    range.value = day;
    byId('day-out').value = `День ${day}`;
    byId('height').textContent = `${Math.round(entry.height[day])} см`;
    byId('root').textContent = `${Math.round(entry.root[day])} см`;
    byId('leaves').textContent = entry.leaves[day];
    const reached = updateStages(entry);
    const cool = scenario === 'cool' && day > 0;
    byId('note').textContent = (conditionNote(scenario, entry, day) || data.notes[Math.max(0, reached)])
      + (cool ? ' Прохладно, поэтому всё идёт медленнее.' : '');
    byId('curve').setAttribute('d', line(entry.height, day));
    byId('point').setAttribute('cx', chartX(day));
    byId('point').setAttribute('cy', chartY(entry.height[day]));
    play.textContent = !video.paused ? 'Пауза' : day > 0 && day < data.days
      ? 'Дальше' : `Прожить ${data.days} дней`;
    updateCaptions(entry);
  }

  function seek(index) {
    frame = index;
    // Середина кадра исключает выбор предыдущего кадра при округлении времени.
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      video.currentTime = (index + 0.5) / data.fps;
    } else pendingSeek = index;
    update();
  }

  function playVideo() {
    const source = video.src;
    video.play().catch(error => {
      if (error.name === 'AbortError' || source !== video.src) return;
      byId('note').textContent = 'Нажми кнопку воспроизведения, чтобы запустить ролик со звуком.';
    });
  }

  function select(key, autoplay) {
    video.pause();
    scenario = key;
    const last = data.scenarios[key].days.length - 1;
    poster.src = `media/${key}-end.jpg`;
    frameBox.classList.remove('ready');
    pendingSeek = autoplay ? 0 : last;
    frame = pendingSeek;
    video.src = `media/${key}.mp4`;
    Array.from(options.children).forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.scenario === key));
    });
    update();
    if (autoplay) playVideo();
  }

  function followVideo(mediaTime) {
    const last = data.scenarios[scenario].days.length - 1;
    const frameNow = Math.min(last, Math.floor(mediaTime * data.fps + 0.001));
    if (frame !== frameNow) {
      frame = frameNow;
      update();
    }
  }

  video.addEventListener('loadedmetadata', () => {
    if (pendingSeek !== null) {
      seek(pendingSeek);
      pendingSeek = null;
    }
  });
  video.addEventListener('seeked', () => {
    frameBox.classList.add('ready');
    followVideo(video.currentTime);
  });
  for (const event of ['play', 'pause', 'ended']) video.addEventListener(event, update);
  if ('requestVideoFrameCallback' in video) {
    const onFrame = (_now, metadata) => {
      if (!video.seeking) followVideo(metadata.mediaTime);
      video.requestVideoFrameCallback(onFrame);
    };
    video.requestVideoFrameCallback(onFrame);
  } else video.addEventListener('timeupdate', () => followVideo(video.currentTime));
  play.addEventListener('click', () => {
    if (!video.paused) {
      video.pause();
      return;
    }
    if (frame === data.scenarios[scenario].days.length - 1) seek(0);
    playVideo();
  });
  range.addEventListener('input', () => {
    video.pause();
    seek(frameForDay(data.scenarios[scenario], Number(range.value)));
  });
  options.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button) select(button.dataset.scenario, true);
  });
  byId('labels').addEventListener('change', event => { captions.hidden = !event.target.checked; });
  preparePage();
  prepareChart();
  select('best', false);
}

if (typeof module !== 'undefined') module.exports = { frameForDay, conditionNote };
else initPage();

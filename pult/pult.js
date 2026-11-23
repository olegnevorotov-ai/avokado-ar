'use strict';

(() => {
  const pult = document.getElementById('pult');
  const projection = document.getElementById('projection');
  const stage = document.getElementById('stage');
  const slide = document.getElementById('slide');
  const hint = document.getElementById('hint');
  let screens = [];
  let current = 0;
  let idleTimer;
  let previousFocus;
  let fullscreen = false;

  function artwork(file, className = '') {
    const image = new Image();
    image.src = offlineMedia.url(`${file}`);
    image.className = className;
    image.alt = '';
    return image;
  }

  function text(tag, content, className = '') {
    const node = document.createElement(tag);
    node.textContent = content;
    node.className = className;
    return node;
  }

  function answer(label, icon) {
    const card = text('div', '', 'answer');
    const mark = text('i', icon);
    mark.setAttribute('aria-hidden', 'true');
    card.append(mark, label);
    return card;
  }

  function question(screen) {
    const scenario = filmData.scenarios[screen.scenario];
    const panel = text('div', '', 'question');
    panel.append(
      text('span', `ОПЫТ ${screen.number} ИЗ ${screen.total}`, 'experiment'),
      text('h2', scenario.name),
      text('p', screen.question),
    );
    if (screen.scenario === 'cool') panel.append(text('span', scenario.sub, 'badge'));
    const cards = text('div', '', 'answers');
    cards.append(answer('ВЫРАСТЕТ!', '✓'), answer('НЕ ВЫРАСТЕТ', '×'));
    panel.append(cards);
    slide.append(artwork(`${screen.scenario}-start.jpg`, 'question-bg'), panel);
  }

  function clip(name) {
    const video = document.createElement('video');
    video.src = offlineMedia.url(`${name}.mp4`);
    video.poster = offlineMedia.url(`${name}-start.jpg`);
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-label', filmData.titles[name]);
    const lastFrame = artwork(`${name}-end.jpg`);
    const retry = text('button', 'Запустить ролик со звуком', 'btn primary play-fallback');
    retry.type = 'button';
    retry.hidden = true;
    const play = () => video.play().then(() => {
      retry.hidden = true;
    }).catch(error => {
      if (!video.isConnected || error.name === 'AbortError') return;
      retry.hidden = false;
    });
    retry.addEventListener('click', event => {
      event.stopPropagation();
      play();
      stage.focus();
    });
    video.addEventListener('ended', () => {
      // Видеокадр остаётся видимым, пока локальный стоп-кадр декодируется.
      lastFrame.decode().then(() => {
        if (video.isConnected) video.replaceWith(lastFrame);
      }).catch(() => {});
    });
    slide.append(video, retry);
    play();
  }

  function render() {
    slide.querySelector('video')?.pause();
    slide.replaceChildren();
    const screen = screens[current];
    slide.dataset.screen = screen.id;
    if (screen.question) question(screen);
    else if (screen.clip) clip(screen.clip);
    else {
      slide.append(artwork(screen.image));
      if (screen.id === 'theme') {
        slide.append(text('h2', document.getElementById('theme').textContent, 'theme-card'));
      }
    }
    hint.textContent = screen.question ? 'Пробел — ролик · Esc — выход'
      : current === screens.length - 1 ? '← назад · Esc — выход'
      : 'Пробел — дальше · Esc — выход';
  }

  function move(offset) {
    const next = Math.min(screens.length - 1, Math.max(0, current + offset));
    if (next === current) return;
    current = next;
    render();
  }

  function close() {
    if (!pult.open) return;
    pult.close();
    slide.querySelector('video')?.pause();
    slide.replaceChildren();
    clearTimeout(idleTimer);
    if (document.fullscreenElement === projection) document.exitFullscreen().catch(() => {});
    document.body.style.overflow = '';
    previousFocus?.focus();
  }

  function start(short) {
    previousFocus = document.activeElement;
    document.querySelectorAll('main video').forEach(video => video.pause());
    screens = slidesFor(short);
    current = 0;
    fullscreen = false;
    pult.showModal();
    stage.tabIndex = -1;
    stage.focus();
    document.body.style.overflow = 'hidden';
    render();
    // Элемент dialog не поддерживает requestFullscreen, поэтому разворачиваем его содержимое.
    projection.requestFullscreen?.().catch(() => {
      // Диалог занимает окно, даже если браузер отклонил полноэкранный режим.
    });
  }

  document.getElementById('start-full').addEventListener('click', () => start(false));
  document.getElementById('start-short').addEventListener('click', () => start(true));
  pult.addEventListener('click', () => move(1));
  pult.addEventListener('keydown', event => {
    if (![' ', 'ArrowRight', 'ArrowLeft', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.repeat) return;
    if (event.key === 'Escape') close();
    else move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  pult.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement === projection) fullscreen = true;
    else if (fullscreen) close();
  });
  stage.addEventListener('pointermove', () => {
    stage.dataset.idle = 'false';
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { stage.dataset.idle = 'true'; }, 900);
  });
})();

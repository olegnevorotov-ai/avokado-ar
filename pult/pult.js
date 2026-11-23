'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const pult = byId('pult');
  const projection = byId('projection');
  const stage = byId('stage');
  const slide = byId('slide');
  const hint = byId('hint');
  const numbers = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  const stages = filmData.parts.map((part, index) => index === 3 ? 'Росток' : part);
  const leafStage = stages.indexOf('Листья');
  const votes = new Map();
  let screens = [];
  let current = 0;
  let previousFocus;
  let enteredFullscreen = false;

  function text(tag, content, style) {
    const node = document.createElement(tag);
    node.textContent = content;
    if (style) node.className = style;
    return node;
  }

  function artwork(file, style) {
    const image = new Image();
    image.alt = '';
    image.src = offlineMedia.url(file);
    image.className = style;
    return image;
  }

  function facts(content) {
    const { tree, student } = pultConfig.heightFacts;
    const sprout = `${filmData.bestHeight} см`;
    const diagram = content.querySelector('#height-comparison');
    diagram.setAttribute('aria-label', `Росток ${sprout}, ученица ${student}, дерево авокадо ${tree}`);
    content.querySelector('#tree-height-title').textContent = `до ${tree}`;
    content.querySelector('#sprout-height').textContent = sprout;
    content.querySelector('#student-height').textContent = student;
    content.querySelector('#tree-height').textContent = tree;
  }

  function intro(screen) {
    const content = byId(screen.template).content.cloneNode(true);
    if (screen.id === 'facts') facts(content);
    if (screen.image) slide.append(artwork(screen.image, 'cover'));
    slide.append(content);
  }

  function voting(screen) {
    const { name, sub } = filmData.scenarios[screen.scenario];
    const panel = text('div', '', 'question');
    panel.append(
      text('p', `ОПЫТ ${screen.number} ИЗ ${screen.total}`, 'eyebrow'),
      text('h2', name),
      text('p', screen.question, 'question-text'),
    );
    if (screen.scenario === 'cool') panel.append(text('p', sub, 'temperature'));
    const cards = text('div', '', 'answers');
    cards.setAttribute('role', 'group');
    cards.setAttribute('aria-label', 'Выбор зала');
    for (const option of voteOptions) {
      const card = text('button', '', `answer ${option.id}`);
      card.id = `vote-${option.id}`;
      card.type = 'button';
      card.dataset.vote = option.id;
      const marker = text('span', 'ЗАЛ ВЫБРАЛ', 'vote-marker');
      marker.setAttribute('aria-hidden', 'true');
      card.append(marker, `${option.mark} ${option.label}${option.punctuation ?? ''}`);
      card.addEventListener('click', event => {
        event.stopPropagation();
        if (votes.get(screen.scenario) === option.id) votes.delete(screen.scenario);
        else votes.set(screen.scenario, option.id);
        updateCards();
        if (event.detail) stage.focus();
      });
      cards.append(card);
    }

    function updateCards() {
      const selected = votes.get(screen.scenario);
      cards.classList.toggle('has-vote', Boolean(selected));
      for (const card of cards.children) card.ariaPressed = String(card.dataset.vote === selected);
    }

    updateCards();
    slide.append(artwork(screen.image, 'cover'), panel, cards);
  }

  function metric(label, value) {
    const tile = text('div', '', 'metric');
    tile.append(text('span', label), value);
    return tile;
  }

  function showSummary(screen) {
    const summary = screen.summary === 'research'
      ? researchConclusion(filmData) : miniConclusion(filmData, screen.summary);
    const panel = text('section', '', 'summary');
    panel.append(text('p', summary.eyebrow, 'eyebrow'), text('h2', summary.heading));
    if (summary.findings) {
      const findings = text('ul', '', 'findings');
      for (const { mark, body } of summary.findings) {
        const item = text('li', '', 'finding');
        const icon = text('span', mark, 'finding-mark');
        icon.dataset.mark = mark;
        item.append(icon, text('span', body));
        findings.append(item);
      }
      panel.append(findings);
    } else {
      panel.append(text('p', summary.body, 'summary-text'));
      if (summary.comparisons.length) {
        const cards = text('div', '', 'summary-comparisons');
        for (const { scenario, name, label } of summary.comparisons) {
          const card = metric(name, text('strong', label));
          card.dataset.scenario = scenario;
          cards.append(card);
        }
        panel.append(cards, text('p', summary.footer, 'summary-footer'));
      }
    }
    slide.append(artwork(screen.image, 'cover'), panel);
  }

  function growthPanel(clip) {
    const scenario = clip === 'hero' ? 'best' : clip;
    const entry = filmData.scenarios[scenario];
    const days = clip === 'hero' ? pultConfig.heroDays : entry.days;
    const milestones = (clip === 'hero' ? pultConfig.heroStages : entry.stageFrames).slice();
    // Метка в ролике учитывает и зачатки. Этап начинается с первого листа,
    // который виден на кадре и учитывается моделью.
    const firstLeafFrame = milestones[leafStage];
    if (firstLeafFrame !== null) {
      const visibleLeaf = days.findIndex((day, frame) =>
        frame >= firstLeafFrame && entry.leaves[day] > 0);
      milestones[leafStage] = visibleLeaf < 0 ? null : visibleLeaf;
    }
    const panel = text('aside', '', 'growth');
    panel.setAttribute('aria-label', 'Показатели роста');
    const counter = text('p', '', 'eyebrow day');
    const height = text('strong', '', 'height-value');
    const heightLine = text('p', '', 'height');
    heightLine.setAttribute('aria-label', 'Высота');
    heightLine.append(height, text('span', 'см'));
    const leaves = text('strong', '', 'leaf-value');
    const root = text('strong', '', 'root-value');
    const metrics = text('div', '', 'metrics');
    metrics.append(metric('Листьев', leaves), metric('Корень', root));
    const { chart, reveal } = pultCharts.growth(scenario);
    const stepList = text('ol', '', 'steps');
    const stepItems = stages.map(label => text('li', label));
    stepList.append(...stepItems);
    panel.append(counter, heightLine, metrics, chart, stepList);

    let previousDay;
    function update(seconds, ended = false) {
      // mediaTime соответствует показанному кадру. На ended фиксируем правую границу опыта.
      const frame = ended ? days.length - 1 : Math.min(days.length - 1, Math.floor(
        seconds * filmData.fps + 0.001,
      ));
      const day = days[frame];
      if (day !== previousDay) {
        panel.dataset.day = day;
        counter.textContent = `ДЕНЬ ${day} ИЗ ${filmData.days}`;
        height.textContent = numbers.format(entry.height[day]);
        leaves.textContent = entry.leaves[day];
        root.textContent = `${numbers.format(entry.root[day])} см`;
        reveal(day);
        previousDay = day;
      }
      const active = stepItems.map((_, index) => milestones[index] !== null && milestones[index] <= frame);
      const latest = active.lastIndexOf(true);
      stepItems.forEach((step, index) => {
        step.classList.toggle('reached', active[index]);
        if (index === latest) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
      });
    }

    update(0);
    return { panel, update };
  }

  function observeVideo(video, update) {
    if ('requestVideoFrameCallback' in video) {
      const frame = (_now, { mediaTime }) => {
        if (!video.isConnected || video.ended) return;
        update(mediaTime);
        video.requestVideoFrameCallback(frame);
      };
      video.requestVideoFrameCallback(frame);
    } else {
      video.addEventListener('timeupdate', () => update(video.currentTime));
    }
  }

  function showResult(frame, scenario) {
    const result = voteResult(scenario, votes.get(scenario));
    const banner = text('div', '', 'result');
    banner.dataset.tone = result.tone;
    banner.setAttribute('role', 'status');
    frame.append(banner);
    banner.append(text('h2', result.heading), text('p', result.explanation));
  }

  function clip(screen) {
    const { clip: name, files } = screen;
    const comparison = name === 'compare';
    const stats = name === 'hero' || Object.hasOwn(filmData.scenarios, name) ? growthPanel(name) : null;
    const layout = text('div', '', comparison ? 'clip compare' : stats ? 'clip with-growth' : 'clip');
    const frame = text('div', '', 'clip-frame');
    const video = document.createElement('video');
    video.src = offlineMedia.url(files.video);
    video.poster = offlineMedia.url(files.poster);
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-label', pultConfig.titles[name]);
    const retry = text('button', 'Запустить ролик со звуком', 'btn primary play-fallback');
    retry.type = 'button';
    retry.hidden = true;
    const play = () => video.play().then(() => {
      retry.hidden = true;
    }).catch(error => {
      if (video.isConnected && error.name !== 'AbortError') retry.hidden = false;
    });
    retry.addEventListener('click', event => {
      event.stopPropagation();
      play();
      stage.focus();
    });
    frame.append(video, retry);
    layout.append(frame);
    if (stats) layout.append(stats.panel);
    if (comparison) layout.append(pultCharts.comparison());
    slide.append(layout);

    if (stats) observeVideo(video, stats.update);
    video.addEventListener('ended', async () => {
      stats?.update(video.currentTime, true);
      if (Object.hasOwn(experimentResults, name)) showResult(frame, name);
      const still = artwork(files.still, 'clip-still');
      try {
        await still.decode();
        if (video.isConnected) video.replaceWith(still);
      } catch (error) {
        // При ошибке декодирования оставляем последний кадр видеоплеера.
        console.warn('Не удалось открыть стоп-кадр', error);
      }
    }, { once: true });
    play();
  }

  function render() {
    slide.querySelector('video')?.pause();
    slide.replaceChildren();
    const screen = screens[current];
    slide.dataset.screen = screen.id;
    if (screen.template) intro(screen);
    else if (screen.question) voting(screen);
    else if (screen.clip) clip(screen);
    else if (screen.summary) showSummary(screen);
    else slide.append(artwork(screen.image, 'cover'));
    hint.textContent = screen.question ? 'Щёлкните карточку · Пробел — ролик · Esc — выход'
      : current === screens.length - 1 ? '← назад · Esc — выход'
        : 'Пробел — дальше · Esc — выход';
    stage.focus();
  }

  function move(offset) {
    const next = Math.max(0, Math.min(screens.length - 1, current + offset));
    if (next === current) return;
    current = next;
    render();
  }

  function close() {
    if (!pult.open) return;
    enteredFullscreen = false;
    slide.querySelector('video')?.pause();
    slide.replaceChildren();
    delete slide.dataset.screen;
    pult.close();
    const restoreFocus = () => {
      if (!pult.open) previousFocus.focus();
    };
    if (document.fullscreenElement === projection) {
      document.exitFullscreen().then(restoreFocus, restoreFocus);
    } else restoreFocus();
  }

  function start(short, button) {
    previousFocus = button;
    screens = websiteSlides(short);
    current = 0;
    votes.clear();
    pult.showModal();
    render();
    // В случае отказа полноэкранного API диалог уже занимает окно.
    projection.requestFullscreen?.().catch(() => {});
  }

  byId('start-full').addEventListener('click', event => start(false, event.currentTarget));
  byId('start-short').addEventListener('click', event => start(true, event.currentTarget));
  stage.addEventListener('click', () => move(1));
  pult.addEventListener('keydown', event => {
    if (![' ', 'ArrowRight', 'ArrowLeft', 'Escape'].includes(event.key)) return;
    if (event.key === ' ' && event.target.matches('button')) return;
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
    if (document.fullscreenElement === projection && pult.open) enteredFullscreen = true;
    else if (enteredFullscreen) close();
  });
})();

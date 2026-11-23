'use strict';

// Порядок опытов и вопросы задаёт общий slides.js. Здесь только изменения для сайта.
const websiteBaseSlides = typeof module === 'undefined'
  ? slidesFor
  : require('../presentation/slides.js').slidesFor;

const websiteIntro = [
  { id: 'title', template: 'intro-title', image: 'hero-theme.jpg' },
  { id: 'goal', template: 'intro-goal', image: 'best-start.jpg' },
  { id: 'facts', template: 'intro-facts', fullOnly: true },
];

const voteOptions = [
  { id: 'grow', label: 'Вырастет', mark: '✓', punctuation: '!' },
  { id: 'no-growth', label: 'Не вырастет', mark: '×' },
];

const experimentResults = {
  cool: {
    correct: ['grow'],
    explanation: 'Росток появился, но совсем маленький. Косточке нужно тепло.',
  },
  dry: {
    correct: ['no-growth'],
    explanation: 'Ничего не выросло! Косточка засохла и даже не треснула.',
  },
  wet: {
    correct: ['no-growth'],
    explanation: 'Росток сначала рос, а потом загнил и завял. Много воды — тоже плохо!',
  },
  dark: {
    correct: ['grow', 'no-growth'],
    explanation: 'Правы все! Росток вытянулся, но он бледный, тонкий и без листьев.',
  },
};

const miniConclusions = {
  best: {
    heading: 'Как растёт косточка',
    body: ({ height, leaves }, days) =>
      'Сначала трещина, потом корень, потом росток и листья. '
      + `За ${days} дней — деревце ${height} см и ${leafCountLabel(leaves)}.`,
  },
  cool: {
    heading: 'Косточке нужно тепло',
    body: ({ height, leaves }) =>
      `Росток появился, но совсем маленький: ${height} см и ${leaves === 0
        ? 'ни одного листа' : leafCountLabel(leaves)}.`,
  },
  dry: {
    heading: 'Без воды ничего не будет',
    body: () => 'Косточка засохла и даже не треснула.',
  },
  wet: {
    heading: 'Воды — в меру',
    body: () => 'Когда косточка почти вся в воде, корню нечем дышать. '
      + 'Росток сначала растёт, а потом загнивает.',
  },
  dark: {
    heading: 'Выше — не значит здоровее',
    body: () => 'Без света росток тянется вверх, чтобы найти свет. '
      + 'Поэтому он вырос выше, но он тонкий, бледный и без листьев.',
    comparisons: ['dark', 'best'],
    footer: 'Косточке нужен свет.',
  },
};

/** Вернуть текст общего вывода с результатом лучшего опыта. */
function researchConclusion(data) {
  const { height } = finalMeasurements(data, 'best');
  return {
    eyebrow: 'ВЫВОД ИССЛЕДОВАНИЯ',
    heading: 'Что нужно косточке, чтобы выросло дерево?',
    findings: [
      { mark: '✓', body: 'Тепло, свет и вода — нужны все три.' },
      { mark: '✓', body: 'Воды — в меру: мало — засохнет, много — загниёт.' },
      { mark: '✓', body: 'Без света росток высокий, но слабый и без листьев.' },
      { mark: '✗', body: '„Чем больше воды, тем лучше“ — неверно. Гипотеза подтвердилась, но не вся.' },
      { mark: '⏳', body: `И нужно терпение: ${data.days} дней — деревце ${height} см.` },
    ],
  };
}

const giftSlide = {
  id: 'gift',
  image: 'hero-end.jpg',
  poster: 'gift.png',
  eyebrow: 'ПОДАРОК',
  heading: '🎁 Авокадо — вам домой!',
  instruction: 'Наведите камеру телефона на QR‑код — на экране или на карточке.',
  description: 'Деревце вырастет прямо у вас на столе, а дома — дерево с плодами.',
  address: url => url.replace(/^https:\/\/|\/$/g, ''),
  posterAlt: 'Дерево авокадо с плодами',
  footer: 'Спасибо за внимание!',
};

/** Вернуть округлённые показатели опыта на последний день исследования. */
function finalMeasurements(data, scenario) {
  const { height, leaves } = data.scenarios[scenario];
  return {
    height: Math.round(height[data.days]),
    leaves: Math.round(leaves[data.days]),
  };
}

/** Согласовать форму слова «лист» с целым числом листьев. */
function leafCountLabel(count) {
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} листьев`;
  if (lastDigit === 1) return `${count} лист`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} листа`;
  return `${count} листьев`;
}

/** Подписать высоту и число листьев для сравнения опытов. */
function measurementLabel({ height, leaves }) {
  return `${height} см · ${leafCountLabel(leaves)}`;
}

/** Подготовить текст мини-вывода и плашки сравнения для опыта. */
function miniConclusion(data, scenario) {
  const { heading, body, comparisons = [], footer } = miniConclusions[scenario];
  const name = data.scenarios[scenario].name;
  return {
    eyebrow: `МИНИ-ВЫВОД · ${name.toUpperCase()}`,
    heading,
    body: body(finalMeasurements(data, scenario), data.days),
    comparisons: comparisons.map(key => ({
      scenario: key,
      name: data.scenarios[key].name.toUpperCase(),
      label: measurementLabel(finalMeasurements(data, key)),
    })),
    footer,
  };
}

function clipFiles(clip) {
  return { video: `${clip}.mp4`, poster: `${clip}-start.jpg`, still: `${clip}-end.jpg` };
}

function websiteSlides(short) {
  return [
    ...websiteIntro.filter(screen => !short || !screen.fullOnly),
    ...websiteBaseSlides(short).filter(screen => screen.id !== 'theme'),
    giftSlide,
  ].flatMap(screen => {
    if (screen.question) return [{ ...screen, image: clipFiles(screen.scenario).poster }];
    if (screen.id === 'conclusion') return [{ ...screen, summary: 'research' }];
    if (!screen.clip) return [screen];

    const files = clipFiles(screen.clip);
    const clip = { ...screen, files };
    const scenario = screen.clip === 'hero' ? 'best' : screen.clip;
    if (!Object.hasOwn(miniConclusions, scenario)) return [clip];
    return [clip, { id: `mini-${screen.id}`, summary: scenario, image: files.still }];
  });
}

function websiteMedia() {
  return [...new Set(websiteSlides(false).flatMap(screen =>
    screen.files ? Object.values(screen.files) : [screen.image, screen.poster].filter(Boolean)))];
}

function voteResult(scenario, selection) {
  const { correct, explanation } = experimentResults[scenario];
  if (selection == null) {
    const answer = correct.length === voteOptions.length ? 'оба варианта'
      : voteOptions.find(option => option.id === correct[0]).label.toLowerCase();
    return { tone: 'answer', heading: `Правильный ответ: ${answer}`, explanation };
  }
  if (correct.includes(selection)) {
    return { tone: 'right', heading: '✓ Зал угадал!', explanation };
  }
  return { tone: 'wrong', heading: '× Зал не угадал!', explanation };
}

if (typeof module !== 'undefined') {
  module.exports = {
    websiteSlides, websiteMedia, voteResult,
    miniConclusion, researchConclusion, finalMeasurements, leafCountLabel,
  };
}

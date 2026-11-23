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

function clipFiles(clip) {
  return { video: `${clip}.mp4`, poster: `${clip}-start.jpg`, still: `${clip}-end.jpg` };
}

function websiteSlides(short) {
  return [
    ...websiteIntro.filter(screen => !short || !screen.fullOnly),
    ...websiteBaseSlides(short).filter(screen => screen.id !== 'theme'),
  ].map(screen => {
    if (screen.clip) return { ...screen, files: clipFiles(screen.clip) };
    if (screen.question) return { ...screen, image: clipFiles(screen.scenario).poster };
    return screen;
  });
}

function websiteMedia() {
  return [...new Set(websiteSlides(false).flatMap(screen =>
    screen.files ? Object.values(screen.files) : [screen.image].filter(Boolean)))];
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
  module.exports = { websiteSlides, websiteMedia, voteResult };
}

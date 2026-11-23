'use strict';

// Этот список задаёт порядок обоих выступлений и место каждого вопроса.
const presentationSlides = [
  { id: 'theme', image: 'hero-theme.jpg' },
  { id: 'hero', clip: 'hero' },
  { id: 'cut', clip: 'cut', fullOnly: true },
  { id: 'ask-cool', question: 'В комнате прохладно. Вырастет авокадо?', scenario: 'cool', fullOnly: true },
  { id: 'cool', clip: 'cool', fullOnly: true },
  { id: 'ask-dry', question: 'Вода не достаёт до косточки. Вырастет?', scenario: 'dry', fullOnly: true },
  { id: 'dry', clip: 'dry', fullOnly: true },
  { id: 'ask-wet', question: 'А если косточка почти вся в воде?', scenario: 'wet' },
  { id: 'wet', clip: 'wet' },
  { id: 'ask-dark', question: 'А если закрыть шторы?', scenario: 'dark' },
  { id: 'dark', clip: 'dark' },
  { id: 'compare', clip: 'compare' },
  { id: 'conclusion', image: 'hero-end.jpg' },
];

function slidesFor(short) {
  const visible = presentationSlides.filter(slide => !short || !slide.fullOnly);
  const total = visible.filter(slide => slide.question).length;
  let experiment = 0;
  return visible.map(slide => slide.question ? { ...slide, number: ++experiment, total } : slide);
}

if (typeof module !== 'undefined') module.exports = { slidesFor };

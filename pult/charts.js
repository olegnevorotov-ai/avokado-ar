'use strict';

const pultCharts = (() => {
  const colors = {
    best: '#a1d468',
    cool: '#75cffe',
    dry: '#f78d8d',
    wet: '#ffbd65',
    dark: '#c9b1ff',
  };
  const axisStep = 10;
  const maxHeight = Math.max(...Object.values(filmData.scenarios).flatMap(entry => entry.height));
  const ceiling = Math.ceil(maxHeight / axisStep) * axisStep || axisStep;

  function svgNode(tag, values, content) {
    const node = document.createElementNS('http:' + '//www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(values)) node.setAttribute(name, value);
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function axes(width, height, rightMargin, label) {
    const left = 31;
    const right = width - rightMargin;
    const top = 19;
    const bottom = height - 23;
    const x = day => left + day / filmData.days * (right - left);
    const y = value => bottom - value / ceiling * (bottom - top);
    const chart = svgNode('svg', {
      viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': label, class: 'height-chart',
    });
    const grid = svgNode('g', { class: 'chart-grid' });
    for (let value = 0; value <= ceiling; value += axisStep) {
      grid.append(
        svgNode('line', { x1: left, x2: right, y1: y(value), y2: y(value) }),
        svgNode('text', { x: left - 8, y: y(value) + 5, 'text-anchor': 'end' }, value),
      );
    }
    grid.append(
      svgNode('text', { x: 0, y: 12 }, 'см'),
      svgNode('text', { x: right, y: height - 3, 'text-anchor': 'end' }, 'дни →'),
    );
    chart.append(grid);
    return { chart, x, y };
  }

  function addSeries({ chart, x, y }, scenario) {
    const { height } = filmData.scenarios[scenario];
    const color = colors[scenario];
    const points = height.map((value, day) => `${x(day)},${y(value)}`);
    const curve = svgNode('polyline', { stroke: color, fill: 'none', class: 'height-line' });
    const point = svgNode('circle', { r: 5, fill: color });
    chart.append(curve, point);

    function reveal(day) {
      curve.setAttribute('points', points.slice(0, day + 1).join(' '));
      point.setAttribute('cx', x(day));
      point.setAttribute('cy', y(height[day]));
    }

    return reveal;
  }

  function growth(scenario) {
    const plot = axes(380, 226, 8, 'Высота авокадо по дням');
    return { chart: plot.chart, reveal: addSeries(plot, scenario) };
  }

  function comparison() {
    const plot = axes(1200, 235, 210, 'Сравнение высоты авокадо в пяти опытах');
    for (const [scenario, entry] of Object.entries(filmData.scenarios)) {
      addSeries(plot, scenario)(filmData.days);
      const final = entry.height[filmData.days];
      plot.chart.append(svgNode('text', {
        x: plot.x(filmData.days) + 13, y: plot.y(final) + 5,
        fill: colors[scenario], class: 'series-label',
      }, `${entry.name} · ${Math.round(final)} см`));
    }
    return plot.chart;
  }

  return { growth, comparison };
})();

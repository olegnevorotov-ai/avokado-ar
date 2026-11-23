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

  function addComparisonLabels(plot, series) {
    const endX = plot.x(filmData.days);
    const labelX = endX + 40;
    const rowSpacing = 42;
    const firstBaseline = 17;
    const lastBaseline = 209;
    let previousBaseline = firstBaseline - rowSpacing;

    // Раскладываем подписи сверху вниз, оставляя внизу место для близких значений.
    const sorted = series.sort((left, right) => right.endHeight - left.endHeight);
    sorted.forEach(({ scenario, entry, endHeight }, index) => {
      const pointY = plot.y(endHeight);
      const latest = lastBaseline - (sorted.length - index - 1) * rowSpacing;
      const baseline = Math.max(previousBaseline + rowSpacing, Math.min(pointY - 5, latest));
      previousBaseline = baseline;

      const color = colors[scenario];
      const label = svgNode('g', { class: 'series-label', 'data-scenario': scenario });
      const stats = svgNode('text', { x: labelX, y: baseline + 16, class: 'series-stats' },
        measurementLabel(finalMeasurements(filmData, scenario)));
      if (scenario === 'best') {
        stats.append(svgNode('tspan', { dx: 8, fill: color }, '★ здоровое деревце'));
      }
      label.append(
        svgNode('text', { x: labelX, y: baseline, fill: color, class: 'series-name' }, entry.name),
        stats,
      );
      // Линия указывает на свою подпись, даже когда она сдвинута от точки.
      plot.chart.append(svgNode('path', {
        d: `M ${endX + 6} ${pointY} H ${endX + 11} L ${labelX - 8} ${baseline + 4}`,
        stroke: color, fill: 'none', class: 'series-leader',
      }), label);
    });
  }

  function comparison() {
    const plot = axes(1200, 235, 325, 'Высота и листья авокадо в пяти опытах');
    const series = Object.entries(filmData.scenarios).map(([scenario, entry]) => ({
      scenario, entry, endHeight: entry.height[filmData.days],
    }));
    for (const { scenario } of series) {
      addSeries(plot, scenario)(filmData.days);
    }
    addComparisonLabels(plot, series);
    return plot.chart;
  }

  return { growth, comparison };
})();

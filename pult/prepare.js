'use strict';

// URL живут до закрытия страницы. Ролики и стоп-кадры открываются из памяти.
const offlineMedia = (() => {
  const urls = new Map();

  function url(file) {
    if (!urls.has(file)) throw new Error(`Файл не подготовлен: ${file}`);
    return urls.get(file);
  }

  function prepare() {
    const files = websiteMedia().map(file => [file, pultConfig.sizes[file]]);
    const title = document.getElementById('prepare-title');
    const progress = document.getElementById('prepare-progress');
    const count = document.getElementById('prepare-count');
    const counter = document.getElementById('prepare-downloaded');
    const message = document.getElementById('prepare-message');
    const retry = document.getElementById('prepare-retry');
    const panel = title.closest('section');
    const bytesPerMegabyte = 1_000_000;
    progress.max = files.reduce((sum, [, size]) => sum + size, 0);
    document.getElementById('prepare-total').textContent = Math.round(progress.max / bytesPerMegabyte);
    let downloaded = 0;

    function showProgress(change) {
      downloaded += change;
      progress.value = downloaded;
      const megabytes = String(Math.round(downloaded / bytesPerMegabyte));
      if (counter.textContent !== megabytes) counter.textContent = megabytes;
    }

    function showMessage(state, heading, text) {
      panel.dataset.state = state;
      title.textContent = heading;
      message.textContent = text;
      message.hidden = false;
      count.hidden = true;
      progress.hidden = state === 'ready';
    }

    async function download(file, size) {
      const response = await fetch(`../media/${file}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      let received = 0;
      const reader = response.body.getReader();
      const chunks = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          chunks.push(value);
          showProgress(value.byteLength);
        }
        if (received !== size) throw new Error('Размер файла отличается от указанного при сборке');
        const type = file.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
        urls.set(file, URL.createObjectURL(new Blob(chunks, { type })));
      } catch (error) {
        showProgress(-received);
        throw error;
      }
    }

    async function load() {
      retry.hidden = true;
      message.hidden = true;
      count.hidden = false;
      progress.hidden = false;
      title.textContent = 'Готовим выступление…';
      panel.dataset.state = 'loading';
      const missing = files.filter(([file]) => !urls.has(file));
      const results = await Promise.allSettled(missing.map(([file, size]) => download(file, size)));
      if (results.some(result => result.status === 'rejected')) {
        showMessage('error', 'Не удалось скачать всё',
          'Остались файлы для скачивания. Проверьте интернет и нажмите «Повторить».');
        retry.hidden = false;
        return;
      }

      await document.fonts.ready;
      showMessage('ready', '✓ Всё готово',
        'Все ролики уже в браузере. Интернет больше не нужен — только не перезагружайте страницу.');
      document.getElementById('start-full').disabled = false;
      document.getElementById('start-short').disabled = false;
    }

    retry.addEventListener('click', load);
    load();
  }

  return { url, prepare };
})();

offlineMedia.prepare();

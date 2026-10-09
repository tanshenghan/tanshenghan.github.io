(() => {
  const root = document.getElementById('top');
  const search = root.querySelector('#search'), paperYear = root.querySelector('#paper-year');
  const tagButtons = Array.from(root.querySelectorAll('.tag-filter-button'));
  const selectedTags = new Set();
  const resultSearch = root.querySelector('#result-search'), benchmark = root.querySelector('#benchmark'), boundary = root.querySelector('#boundary-filter');
  const cards = Array.from(root.querySelectorAll('article'));
  const toc = Array.from(root.querySelectorAll('.toc a'));
  const rows = Array.from(root.querySelectorAll('#result-table tbody tr'));
  const resultBody = root.querySelector('#result-table tbody');
  const metricHeaders = Array.from(root.querySelectorAll('#result-table thead th.metric'));
  let sortColumn = null, sortDirection = 'ascending';
  const metricValues = new Map(rows.map(row => [row, metricHeaders.map(header => {
    // Sort the reported mean, preserving the displayed uncertainty and missing values.
    const value = Number.parseFloat(row.cells[header.cellIndex].textContent.trim());
    return Number.isFinite(value) ? value : null;
  })]));
  function updateSortIndicators() {
    metricHeaders.forEach((header, index) => {
      const active = sortColumn === index;
      header.setAttribute('aria-sort', active ? sortDirection : 'none');
      const button = header.querySelector('button');
      button.querySelector('.sort-arrow').textContent = active ? (sortDirection === 'ascending' ? '↑' : '↓') : '↕';
      const next = active && sortDirection === 'ascending' ? '降序' : '升序';
      button.title = `${button.dataset.label}：点击按数值${next}排列（± 按均值；缺失值置底）`;
      button.setAttribute('aria-label', button.title);
    });
  }
  metricHeaders.forEach((header, index) => {
    const label = header.textContent.trim().replace(/\s*[↑↓]$/, '');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'metric-sort'; button.dataset.label = label;
    button.append(document.createTextNode(label + ' '));
    const arrow = document.createElement('span');
    arrow.className = 'sort-arrow'; arrow.setAttribute('aria-hidden', 'true');
    button.append(arrow); header.replaceChildren(button);
    button.addEventListener('click', () => {
      sortDirection = sortColumn === index && sortDirection === 'ascending' ? 'descending' : 'ascending';
      sortColumn = index;
      const ordered = rows.slice().sort((a, b) => {
        const left = metricValues.get(a)[index], right = metricValues.get(b)[index];
        if (left === null) return right === null ? 0 : 1;
        if (right === null) return -1;
        return (left - right) * (sortDirection === 'ascending' ? 1 : -1);
      });
      resultBody.append(...ordered);
      updateSortIndicators();
    });
  });
  updateSortIndicators();
  const resultFilterOrder = new Map();
  function populateResultFilter(select, values) {
    const selected = select.value;
    const available = new Set(values.filter(value => value && value !== '—'));
    const existing = Array.from(select.options).slice(1).map(option => option.value);
    const known = resultFilterOrder.get(select) || existing;
    const order = [...known, ...Array.from(available).filter(value => !known.includes(value))];
    resultFilterOrder.set(select, order);
    const ordered = order.filter(value => available.has(value));
    if (existing.length === ordered.length && existing.every((value, index) => value === ordered[index])) return;
    const placeholder = select.options[0].cloneNode(true);
    select.replaceChildren(placeholder, ...ordered.map(value => new Option(value, value)));
    if (available.has(selected)) select.value = selected;
  }
  populateResultFilter(benchmark, rows.map(row => row.dataset.family));
  populateResultFilter(boundary, rows.flatMap(row => row.dataset.tags.split('|')));
  const words = value => value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const normalizeTag = value => value.trim().toLocaleLowerCase()
    .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
    .replace(/^harness$/, 'harness framework').replace(/\btool\s*create\b/g, 'tool create')
    .replace(/^waypoint prediction$/, 'waypoint predict');
  const tagsByCard = new Map(cards.map(card => [card,
    Array.from(card.querySelectorAll('.paper-tag'), tag => normalizeTag(tag.textContent))
  ]));
  // The displayed article/row is the source of truth. Do not keep a second
  // JSON copy of its prose: manual edits would leave that search copy stale.
  const searchableText = element => [element.textContent,
    ...Array.from(element.querySelectorAll('[alt], [title], [aria-label]'), node =>
      [node.getAttribute('alt'), node.getAttribute('title'), node.getAttribute('aria-label')].filter(Boolean).join(' '))
  ].join(' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  const paperText = new Map(cards.map(card => [card, searchableText(card)]));
  const resultText = new Map(rows.map(row => [row,
    `${searchableText(row)} ${row.dataset.family} ${row.dataset.tags}`.toLocaleLowerCase()
  ]));
  const tocById = new Map(toc.map(link => [link.hash.slice(1), link]));
  function updatePapers() {
    const query = words(search.value);
    let n = 0;
    cards.forEach(card => {
      const tags = tagsByCard.get(card);
      const matchesTags = Array.from(selectedTags).every(tag => tags.includes(tag));
      const visible = matchesTags && (!paperYear.value || card.dataset.year === paperYear.value) &&
        query.every(word => paperText.get(card).includes(word));
      card.hidden = !visible;
      const link = tocById.get(card.id);
      if (link) link.hidden = !visible;
      if (visible) n++;
    });
    root.querySelector('#count').textContent = `显示 ${n} / ${cards.length} 篇`;
    root.querySelector('#empty').hidden = n !== 0;
  }
  function updateResults() {
    const query = words(resultSearch.value); let n = 0;
    const candidates = rows.filter(row =>
      (!benchmark.value || row.dataset.family === benchmark.value) &&
      query.every(word => resultText.get(row).includes(word)));
    // A boundary option must have a method under the current task/search.
    // Exclude the boundary itself here so users can switch between valid options.
    populateResultFilter(boundary, candidates.flatMap(row => row.dataset.tags.split('|')));
    const matchingRows = new Set(candidates);
    rows.forEach(row => {
      const visible = matchingRows.has(row) && (!boundary.value || row.dataset.tags.split('|').includes(boundary.value));
      row.hidden = !visible; if(visible) n++;
    });
    root.querySelector('#result-count').textContent = `显示 ${n} / ${rows.length} 条`;
    root.querySelector('#result-empty').hidden = n !== 0;
  }
  function resetPapers(){
    search.value='';paperYear.value='';selectedTags.clear();
    tagButtons.forEach(button => button.setAttribute('aria-pressed','false'));
    updatePapers();
  }
  function clearResultFilters(){
    resultSearch.value='';benchmark.value='';boundary.value='';
    updateResults();
  }
  function resetResults(){
    sortColumn=null;sortDirection='ascending';resultBody.append(...rows);updateSortIndicators();
    clearResultFilters();
  }
  search.addEventListener('input',updatePapers);paperYear.addEventListener('change',updatePapers);
  tagButtons.forEach(button => button.addEventListener('click',()=>{
    const tag = normalizeTag(button.dataset.tag);
    if (selectedTags.has(tag)) selectedTags.delete(tag); else selectedTags.add(tag);
    button.setAttribute('aria-pressed',String(selectedTags.has(tag)));
    updatePapers();
  }));
  resultSearch.addEventListener('input',updateResults);benchmark.addEventListener('change',updateResults);boundary.addEventListener('change',updateResults);
  root.querySelector('#reset-papers').addEventListener('click',resetPapers);root.querySelector('#reset-results').addEventListener('click',resetResults);
  root.querySelectorAll('figure img').forEach(img=>{
    const showFallback = () => {
      const fallback = img.closest('figure')?.querySelector('.image-fallback');
      if (fallback) fallback.hidden = false;
    };
    img.addEventListener('error', showFallback);
    if (img.complete && img.naturalWidth === 0) showFallback();
  });
  const directory = document.getElementById('side-directory');
  const directoryToggle = document.getElementById('directory-toggle');
  const directoryPanel = document.getElementById('directory-panel');
  const directorySearch = document.getElementById('directory-search');
  const directoryLinks = Array.from(directory.querySelectorAll('.side-paper-list a'));
  function showDirectory(open) {
    directory.classList.toggle('is-open',open);
    directoryToggle.setAttribute('aria-expanded',String(open));
    directoryPanel.inert = !open;
    directoryPanel.setAttribute('aria-hidden',String(!open));
  }
  directory.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')showDirectory(true);});
  directory.addEventListener('pointerleave',()=>{if(!directory.contains(document.activeElement))showDirectory(false);});
  directoryToggle.addEventListener('click',()=>showDirectory(!directory.classList.contains('is-open')));
  directory.addEventListener('focusout',event=>{if(!directory.contains(event.relatedTarget)&&!directory.matches(':hover'))showDirectory(false);});
  directory.addEventListener('keydown',event=>{if(event.key==='Escape'){showDirectory(false);directoryToggle.focus();event.preventDefault();}});
  document.addEventListener('pointerdown',event=>{if(!directory.contains(event.target))showDirectory(false);});
  const directoryText = new Map(directoryLinks.map(link => {
    const card = document.getElementById(link.hash.slice(1));
    return [link, [link.textContent, card?.querySelector('h2')?.textContent,
      card?.querySelector('.full-title')?.textContent].join(' ').toLocaleLowerCase()];
  }));
  function updateDirectory(){
    const query=words(directorySearch.value);let count=0;
    directoryLinks.forEach(link=>{
      link.hidden=!query.every(word=>directoryText.get(link).includes(word));
      if(!link.hidden)count++;
    });
    document.getElementById('directory-count').textContent=query.length?`${count} / ${directoryLinks.length} 篇论文`:`${directoryLinks.length} 篇论文`;
  }
  directorySearch.addEventListener('input',updateDirectory);

  function fragmentTarget(hash){
    try { return hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; }
    catch { return null; }
  }
  function revealTarget(target){
    if (!target) return;
    if (target.closest('article')?.hidden) resetPapers();
    if (target.closest('#result-table tbody tr')?.hidden) clearResultFilters();
  }
  // All in-page links share one handler, including future links added to prose.
  // Reveal before native scrolling, without discarding an existing result sort.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const target = fragmentTarget(link.hash);
    if (!target) return;
    revealTarget(target);
    if (target.id === 'results') clearResultFilters();
    if (directory.contains(link)) showDirectory(false);
  });
  function followFragment(){
    const target = fragmentTarget(window.location.hash);
    revealTarget(target);
    if (target) requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
  }
  window.addEventListener('hashchange', followFragment);
  window.addEventListener('pageshow', () => {
    // Browsers may restore form values on back/forward navigation.
    updatePapers();updateResults();updateDirectory();
    revealTarget(fragmentTarget(window.location.hash));
  });

  // Keep the existing download link; export the current table instead of stale
  // research metadata. A checked-in CSV is also available without JavaScript.
  const csvCell = cell => {
    const copy = cell.cloneNode(true);
    copy.querySelectorAll('small, details, summary, p, br').forEach(node => {
      node.before(document.createTextNode(' '));node.after(document.createTextNode(' '));
    });
    return copy.textContent.replace(/\s+/g,' ').trim();
  };
  const quoteCSV = value => `"${String(value).replace(/"/g,'""')}"`;
  const csvHeader = Array.from(root.querySelectorAll('#result-table thead th'), header =>
    header.querySelector('.metric-sort')?.dataset.label || header.textContent.trim());
  const download = root.querySelector('a.download[download]');
  download.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const content = [csvHeader.concat(['论文锚点','原表出处']), ...rows.map(row => [
      ...Array.from(row.cells, csvCell), row.querySelector('.paper-jump').getAttribute('href'),
      Array.from(row.querySelectorAll('td.notes a[href]'), link => link.getAttribute('href')).join(' | ')
    ])].map(row => row.map(quoteCSV).join(',')).join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob(['\ufeff',content], {type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href=url;link.download='vln-experiment-results.csv';
    event.preventDefault();document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  updatePapers();updateResults();updateDirectory();
  followFragment();

})();




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
  function populateResultFilter(select, values) {
    const available = new Set(values.filter(value => value && value !== '—'));
    const existing = Array.from(select.options).slice(1).map(option => option.value);
    const ordered = [...existing.filter(value => available.has(value)), ...Array.from(available).filter(value => !existing.includes(value))];
    const placeholder = select.options[0].cloneNode(true);
    select.replaceChildren(placeholder, ...ordered.map(value => new Option(value, value)));
  }
  populateResultFilter(benchmark, rows.map(row => row.dataset.family));
  populateResultFilter(boundary, rows.flatMap(row => row.dataset.tags.split('|')));
  const words = value => value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const normalizeTag = value => value.trim().toLocaleLowerCase()
    .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
    .replace(/^harness$/, 'harness framework').replace(/\btool\s*create\b/g, 'tool create');
  const tagsByCard = new Map(cards.map(card => [card,
    Array.from(card.querySelectorAll('.paper-tag'), tag => normalizeTag(tag.textContent))
  ]));
  const tocById = new Map(toc.map(link => [link.dataset.anchor, link]));
  function updatePapers() {
    const query = words(search.value);
    let n = 0;
    cards.forEach(card => {
      const tags = tagsByCard.get(card);
      const matchesTags = Array.from(selectedTags).every(tag => tags.includes(tag));
      const visible = matchesTags && (!paperYear.value || card.dataset.year === paperYear.value) &&
        query.every(word => card.dataset.search.toLocaleLowerCase().includes(word));
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
    rows.forEach(row => {
      const visible = (!benchmark.value || row.dataset.family === benchmark.value) && (!boundary.value || row.dataset.tags.split('|').includes(boundary.value)) && query.every(w => row.dataset.search.toLocaleLowerCase().includes(w));
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
  function resetResults(){
    resultSearch.value='';benchmark.value='';boundary.value='';
    sortColumn=null;sortDirection='ascending';resultBody.append(...rows);updateSortIndicators();
    updateResults();
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
  root.querySelectorAll('.paper-jump').forEach(a=>a.addEventListener('click',resetPapers));
  root.querySelectorAll('.result-jump').forEach(a=>a.addEventListener('click',resetResults));
  root.querySelectorAll('figure img').forEach(img=>img.addEventListener('error',()=>{img.closest('figure').querySelector('.image-fallback').hidden=false;}));
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
  directory.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{
    if(a.hash.startsWith('#paper-'))resetPapers();
    if(a.hash==='#results')resetResults();
    showDirectory(false);
  }));
  directorySearch.addEventListener('input',()=>{
    const query=words(directorySearch.value);let count=0;
    directoryLinks.forEach(a=>{a.hidden=!query.every(word=>a.dataset.title.toLocaleLowerCase().includes(word));if(!a.hidden)count++;});
    document.getElementById('directory-count').textContent=query.length?`${count} / ${directoryLinks.length} 篇论文`:`${directoryLinks.length} 篇论文`;
  });

})();

// Handle already-failed lazy images as well as future error events.
document.querySelectorAll("figure img").forEach((image) => { if (image.complete && !image.naturalWidth) { const fallback = image.closest("figure").querySelector(".image-fallback"); if (fallback) fallback.hidden = false; } });

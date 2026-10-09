(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');
  const papers = JSON.parse(document.getElementById('paper-data').textContent);
  const byId = new Map(papers.map(function (p) { return [p.id, p]; }));
  function searchable(value) { return String(value).toLocaleLowerCase().replace(/[-_\u2010-\u2015]/g, ''); }
  const searchIndex = new Map(papers.map(function (p) { return [p.id, searchable(JSON.stringify(p))]; }));
  const $ = function (id) { return document.getElementById(id); };
  const selectedTags = new Set();
  const articleRows = Array.from(document.querySelectorAll('article.paper'));
  const overviewRows = Array.from(document.querySelectorAll('#overview-table tbody tr'));
  const resultRows = Array.from(document.querySelectorAll('#result-table tbody tr'));
  const tocLinks = Array.from(document.querySelectorAll('.toc [data-paper]'));
  let visibleIds = new Set(papers.map(function (p) { return p.id; }));
  let sortField = null;
  let sortDirection = 'descending';
  function terms(value) { return searchable(value).trim().split(/\s+/).filter(Boolean); }
  function matches(p) {
    return (!$('year-filter').value || p.date.slice(0,4) === $('year-filter').value) &&
      (!$('architecture-filter').value || p.architecture === $('architecture-filter').value) &&
      (!$('code-filter').value || p.code_status === $('code-filter').value) &&
      Array.from(selectedTags).every(function (tag) { return p.tags.includes(tag); }) &&
      terms($('paper-search').value).every(function (term) { return searchIndex.get(p.id).includes(term); });
  }
  function updateResults() {
    let count = 0;
    const benchmark = $('benchmark-filter').value;
    const split = $('split-filter').value;
    const query = terms($('result-search').value);
    resultRows.forEach(function (row) {
      const show = visibleIds.has(row.dataset.paper) &&
        (!benchmark || row.dataset.benchmark === benchmark) &&
        (!split || row.dataset.split === split) &&
        query.every(function (term) { return searchable(row.textContent).includes(term); });
      row.hidden = !show;
      if (show) count++;
    });
    $('result-count').textContent = count + ' / ' + resultRows.length + ' 条记录';
    $('results-empty').hidden = count > 0;
  }
  function updatePapers() {
    visibleIds = new Set(papers.filter(matches).map(function (p) { return p.id; }));
    articleRows.concat(overviewRows).forEach(function (el) { el.hidden = !visibleIds.has(el.dataset.paper); });
    tocLinks.forEach(function (el) { el.hidden = !visibleIds.has(el.dataset.paper); });
    const count = visibleIds.size;
    $('paper-count').textContent = count + ' / ' + papers.length + ' 篇';
    $('article-count').textContent = count + ' 篇可见 · 按首次公开时间排列';
    $('papers-empty').hidden = count > 0;
    $('overview-empty').hidden = count > 0;
    updateResults();
  }
  function resetPapers() {
    ['paper-search','year-filter','architecture-filter','code-filter'].forEach(function (id) { $(id).value = ''; });
    selectedTags.clear();
    document.querySelectorAll('.tag-filter').forEach(function (el) { el.setAttribute('aria-pressed','false'); });
    updatePapers();
  }
  ['paper-search','year-filter','architecture-filter','code-filter'].forEach(function (id) {
    $(id).addEventListener(id === 'paper-search' ? 'input' : 'change', updatePapers);
  });
  document.querySelectorAll('.tag-filter').forEach(function (el) {
    el.addEventListener('click', function () {
      const tag = el.dataset.tag;
      if (selectedTags.has(tag)) selectedTags.delete(tag); else selectedTags.add(tag);
      el.setAttribute('aria-pressed', String(selectedTags.has(tag)));
      updatePapers();
    });
  });
  $('reset-papers').addEventListener('click', resetPapers);
  ['benchmark-filter','split-filter','result-search'].forEach(function (id) {
    $(id).addEventListener(id === 'result-search' ? 'input' : 'change', updateResults);
  });
  $('reset-results').addEventListener('click', function () {
    $('benchmark-filter').value = '';
    $('split-filter').value = '';
    $('result-search').value = '';
    sortField = null;
    resultRows.sort(function (a,b) { return Number(a.dataset.order) - Number(b.dataset.order); });
    resultRows.forEach(function (row) { $('result-body').appendChild(row); });
    document.querySelectorAll('th[data-metric]').forEach(function (th) {
      th.setAttribute('aria-sort','none'); th.querySelector('.sort-arrow').textContent = '↕';
    });
    updateResults();
  });
  document.querySelectorAll('.metric-sort').forEach(function (button) {
    button.addEventListener('click', function () {
      const field = button.dataset.metric;
      sortDirection = sortField === field && sortDirection === 'descending' ? 'ascending' : 'descending';
      if (sortField !== field && field === 'ne') sortDirection = 'ascending';
      sortField = field;
      resultRows.sort(function (a,b) {
        const av = a.dataset[field], bv = b.dataset[field];
        if (av === '' && bv === '') return Number(a.dataset.order)-Number(b.dataset.order);
        if (av === '') return 1;
        if (bv === '') return -1;
        const difference = Number(av)-Number(bv);
        return (sortDirection === 'ascending' ? difference : -difference) || Number(a.dataset.order)-Number(b.dataset.order);
      });
      resultRows.forEach(function (row) { $('result-body').appendChild(row); });
      document.querySelectorAll('th[data-metric]').forEach(function (th) {
        const active = th.dataset.metric === field;
        th.setAttribute('aria-sort',active ? sortDirection : 'none');
        th.querySelector('.sort-arrow').textContent = active ? (sortDirection === 'descending' ? '↓' : '↑') : '↕';
      });
    });
  });
  const drawer = $('directory');
  const directoryPanel = $('directory-panel');
  function setDirectory(open, focusSearch) {
    drawer.classList.toggle('is-open',open);
    $('directory-toggle').setAttribute('aria-expanded',String(open));
    directoryPanel.inert = !open;
    $('directory-shade').hidden = !open;
    if (open && focusSearch) $('directory-search').focus();
  }
  $('directory-toggle').addEventListener('click',function () { setDirectory(!drawer.classList.contains('is-open'),true); });
  $('directory-close').addEventListener('click',function () { setDirectory(false); $('directory-toggle').focus(); });
  $('directory-shade').addEventListener('click',function () { setDirectory(false); $('directory-toggle').focus(); });
  document.addEventListener('keydown',function (event) {
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
      setDirectory(false); $('directory-toggle').focus();
    }
  });
  $('directory-search').addEventListener('input',function () {
    const query = terms(this.value);
    let count = 0;
    document.querySelectorAll('.side-paper-list a').forEach(function (link) {
      link.hidden = !query.every(function (term) { return searchIndex.get(link.dataset.paper).includes(term); });
      if (!link.hidden) count++;
    });
    $('directory-count').textContent = count + ' / ' + papers.length + ' 篇 · 目录独立检索';
  });
  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); }
    catch (error) { return; }
    if (byId.has(id) && !visibleIds.has(id)) resetPapers();
  }
  document.addEventListener('click',function (event) {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    if (byId.has(id) && !visibleIds.has(id)) resetPapers();
    if (link.closest('#directory')) {
      setDirectory(false);
      const target = $(id);
      if (target) {
        target.setAttribute('tabindex','-1');
        target.focus({preventScroll:true});
      }
    }
  });
  window.addEventListener('hashchange',revealHash);
  document.querySelectorAll('figure img').forEach(function (img) {
    function failed() { img.hidden = true; img.parentElement.querySelector('.figure-fallback').hidden = false; }
    img.addEventListener('error',failed);
    if (img.complete && img.naturalWidth === 0) failed();
  });
  function download(text, type, filename) {
    const url = URL.createObjectURL(new Blob([text],{type:type}));
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); },1000);
  }
  $('download-json').addEventListener('click',function () {
    download(JSON.stringify({title:'e2e_vln_paper',verified:'2026-10-06',updated:'2026-10-09',papers:papers},null,2),'application/json','e2e_vln_paper.json');
  });
  $('download-csv').addEventListener('click',function () {
    const fields = ['model','date','benchmark','split','variant','sr','spl','osr','ndtw','ne','protocol','source_url'];
    const rows = [fields].concat(resultRows.filter(function (row) { return !row.hidden; }).map(function (row) {
      const p = byId.get(row.dataset.paper);
      const r = p.results[Number(row.dataset.resultIndex)];
      return [p.name,p.date].concat(fields.slice(2).map(function (field) { return r[field] == null ? '' : r[field]; }));
    }));
    const csv = rows.map(function (row) { return row.map(function (cell) {
      return '"' + String(cell).replace(/"/g,'""') + '"';
    }).join(','); }).join('\r\n');
    download('\uFEFF' + csv,'text/csv;charset=utf-8','e2e_vln_results_filtered.csv');
  });
  setDirectory(false);
  updatePapers();
  revealHash();
})();

// Handle already-failed lazy images as well as future error events.
document.querySelectorAll("figure img").forEach((image) => { if (image.complete && !image.naturalWidth) { const fallback = image.closest("figure").querySelector(".image-fallback"); if (fallback) fallback.hidden = false; } });

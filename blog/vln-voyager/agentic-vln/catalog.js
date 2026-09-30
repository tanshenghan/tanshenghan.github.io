
(() => {
  const root = document.getElementById('top');
  const search = root.querySelector('#search'), collection = root.querySelector('#collection');
  const resultSearch = root.querySelector('#result-search'), benchmark = root.querySelector('#benchmark'), boundary = root.querySelector('#boundary-filter');
  const cards = Array.from(root.querySelectorAll('article'));
  const toc = Array.from(root.querySelectorAll('.toc a'));
  const rows = Array.from(root.querySelectorAll('#result-table tbody tr'));
  const words = value => value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  function updatePapers() {
    const query = words(search.value); let n = 0;
    cards.forEach((card,i) => {
      const visible = (!collection.value || card.dataset.collection === collection.value) && query.every(w => card.dataset.search.toLocaleLowerCase().includes(w));
      card.hidden = !visible; toc[i].hidden = !visible; if (visible) n++;
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
  function resetPapers(){search.value='';collection.value='';updatePapers();}
  function resetResults(){resultSearch.value='';benchmark.value='';boundary.value='';updateResults();}
  search.addEventListener('input',updatePapers);collection.addEventListener('change',updatePapers);
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

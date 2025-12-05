// Minimal JS: set footer years and simple form handling
document.addEventListener('DOMContentLoaded', function(){
  var years = new Date().getFullYear();
  ['year','year-2','year-3','year-4'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.textContent = years;
  });

  var form = document.getElementById('contact-form');
  if(form){
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      // If a data-endpoint or action is provided, POST via fetch. Otherwise fallback to mailto.
      const endpoint = (form.dataset && form.dataset.endpoint) ? form.dataset.endpoint.trim() : (form.action || '').trim();
      const submitBtn = form.querySelector('button[type="submit"]');

      if(endpoint && endpoint !== '#' && !endpoint.startsWith('mailto:')){
        // Submit via fetch (Formspree and many form endpoints accept FormData)
        if(submitBtn) submitBtn.disabled = true;
        const fd = new FormData(form);
        try{
          const res = await fetch(endpoint, {
            method: 'POST',
            body: fd,
            headers: {
              'Accept': 'application/json'
            }
          });
          if(res.ok){
            // Some endpoints return JSON, others redirect; treat 2xx as success
            alert('Thanks — your message was sent. I will reply to the email you provided.');
            form.reset();
          } else {
            // Try to parse JSON error for more info
            let body = null;
            try{ body = await res.json(); }catch(e){}
            console.error('Form submit failed', res.status, body);
            alert('There was a problem sending your message. Please try again later or email johnuduka7@gmail.com directly.');
          }
        }catch(err){
          console.error('Form submit error', err);
          alert('Network error sending message. You can also email johnuduka7@gmail.com directly.');
        }finally{
          if(submitBtn) submitBtn.disabled = false;
        }
      } else {
        // No endpoint configured: fallback to opening user's mail client using mailto
        const name = (form.querySelector('[name="name"]')||{}).value || '';
        const email = (form.querySelector('[name="email"]')||{}).value || '';
        const message = (form.querySelector('[name="message"]')||{}).value || '';
        const subject = 'Portfolio contact from ' + (name || 'website visitor');
        const body = `From: ${name} (${email})\n\n${message}`;
        const mailto = `mailto:johnuduka7@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
      }
    });
  }
  // Mobile nav toggle (small, dependency-free)
  var navToggle = document.getElementById('nav-toggle');
  var nav = document.querySelector('.nav');
  if(navToggle && nav){
    navToggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('open');
    });
  }
  // Load projects from data/projects.json and render into #projects-grid
  loadProjects();
});

async function loadProjects(){
  const container = document.getElementById('projects-grid');
  if(!container) return;

  try{
    const res = await fetch('data/projects.json', {cache: 'no-store'});
    if(!res.ok) throw new Error('Could not load projects.json: ' + res.status);
    const projects = await res.json();
    if(!Array.isArray(projects) || projects.length === 0){
      container.innerHTML = '<p>No projects found. Add entries to <code>data/projects.json</code> and add images to <code>assets/</code>.</p>';
      return;
    }

    // render cards
    container.innerHTML = '';
    projects.forEach(p => {
      const article = document.createElement('article');
      article.className = 'project-card';

      const img = document.createElement('img');
      img.className = 'project-image';
      img.src = p.image || 'assets/project-sample.svg';
      img.alt = p.alt || (p.title + ' screenshot');
      img.loading = 'lazy';

      // If project has a url, wrap image in a link
      if(p.url){
        const aImg = document.createElement('a');
        aImg.href = p.url;
        aImg.target = '_blank';
        aImg.rel = 'noopener noreferrer';
        aImg.appendChild(img);
        article.appendChild(aImg);
      } else {
        article.appendChild(img);
      }

      const body = document.createElement('div');
      body.className = 'project-body';

      const h3 = document.createElement('h3');
      const titleText = p.title || 'Untitled project';
      // link title if url provided
      if(p.url){
        const a = document.createElement('a');
        a.href = p.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = titleText;
        h3.appendChild(a);
      } else {
        h3.textContent = titleText;
      }
      body.appendChild(h3);

      if(p.description){
        const pEl = document.createElement('p');
        pEl.textContent = p.description;
        body.appendChild(pEl);
      }

      if(Array.isArray(p.tech) && p.tech.length){
        const techList = document.createElement('div');
        techList.className = 'tech-list';
        p.tech.forEach(t => {
          const s = document.createElement('span');
          s.className = 'tech-tag';
          s.textContent = t;
          techList.appendChild(s);
        });
        body.appendChild(techList);
      }

      article.appendChild(body);
      container.appendChild(article);
    });

    // After rendering, set up client-side filtering controls
    try{
      setupProjectFilters();
    }catch(e){
      console.warn('Project filters unavailable', e);
    }

  // projects:rendered event removed

  }catch(err){
    console.error(err);
    container.innerHTML = '<p>Error loading projects. Check <code>data/projects.json</code> exists and is valid JSON.</p>';
  }
}

function setupProjectFilters(){
  const grid = document.getElementById('projects-grid');
  const search = document.getElementById('project-search');
  const techSel = document.getElementById('tech-filter');
  if(!grid || !search || !techSel) return;

  const resultsCountEl = document.getElementById('results-count');

  function collectTechs(){
    const tags = new Set();
    grid.querySelectorAll('.tech-tag').forEach(t => tags.add(t.textContent.trim()));
    // repopulate select
    const current = techSel.value;
    techSel.innerHTML = '<option value="">All technologies</option>' + Array.from(tags).sort().map(t=>`<option value="${t}">${t}</option>`).join('');
    techSel.value = current;
  }

  function applyFilter(){
    const q = (search.value||'').toLowerCase().trim();
    const tech = techSel.value;
    grid.querySelectorAll('.project-card').forEach(card => {
      const title = (card.querySelector('h3')?.textContent||'').toLowerCase();
      const text = (card.textContent||'').toLowerCase();
      const tags = Array.from(card.querySelectorAll('.tech-tag')).map(s=>s.textContent.trim());
      const matchesQ = !q || title.includes(q) || text.includes(q);
      const matchesTech = !tech || tags.includes(tech);
      card.style.display = (matchesQ && matchesTech) ? '' : 'none';
    });
    // update visible count
    if(resultsCountEl){
      const visible = Array.from(grid.querySelectorAll('.project-card')).filter(c => c.style.display !== 'none');
      const total = grid.querySelectorAll('.project-card').length;
      resultsCountEl.textContent = `${visible.length} of ${total} project${total===1? '':'s'} shown`;
    }
  }

  collectTechs();
  applyFilter();

  search.addEventListener('input', applyFilter);
  techSel.addEventListener('change', applyFilter);

  // update options if grid changes
  const mo = new MutationObserver(()=>{ collectTechs(); applyFilter(); });
  mo.observe(grid, { childList: true, subtree: true });
}

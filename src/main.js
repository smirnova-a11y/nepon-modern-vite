const BUILTIN = [{ id:'built-in-disney', name:'Герои Disney', description:'Классические герои и персонажи Disney для быстрой игры.', words:['Микки Маус','Минни Маус','Дональд Дак','Дейзи Дак','Гуфи','Плуто','Аладдин','Жасмин','Джинн','Джафар','Абу','Яго','Симба','Нала','Муфаса','Тимон','Пумба','Рафики','Шрам','Ариэль','Себастьян','Флаундер','Урсула','Король Тритон','Белль','Чудовище','Золушка','Белоснежка','Рапунцель','Мулан','Покахонтас','Моана','Мауи','Эльза','Анна','Олаф','Свен','Кристофф','Вуди','Базз Лайтер','Джесси','Рекс','Дори','Немо','Молния Маккуин','Мерида','Тиана','Винни-Пух','Пятачок','Тигра'], isCustom:false }];
    const KEYS = { custom:'nepon-custom-categories', deleted:'nepon-deleted-categories', overrides:'nepon-category-overrides-v2', recent:'nepon-recent-categories', time:'waitup-gameClock', sound:'waitup-hasSoundEffects', vibration:'nepon-vibration', tilt:'nepon-tilt', swipe:'nepon-swipe' };
    const TIMES = [30,60,120,180,240,300];
    const TIME_LABELS = {30:'30 сек.',60:'1 мин.',120:'2 мин.',180:'3 мин.',240:'4 мин.',300:'5 мин.'};
    const $ = sel => document.querySelector(sel);
    const $$ = sel => Array.from(document.querySelectorAll(sel));
    const safeParse = (key, fallback) => { try { const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch(e) { return fallback; } };
    const saveJson = (key, val) => localStorage.setItem(key, JSON.stringify(val));
    const splitWords = value => String(value||'').split(/[\n;,]+/).map(w=>w.trim()).filter(Boolean);
    const toStorage = cat => { return { id:cat.id, name:cat.name, description:cat.description||'', words:[...(cat.words||[])] }; };
    const shuffle = arr => { const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
    let state = { activeTab:'all', query:'', flippedId:null, editingId:null, categories:[], recent:[], roundTime:60, settings:{sound:false,vibration:true,tilt:true,swipe:false}, currentCategory:null, deck:[], currentWord:null, answers:[], score:0, timeLeft:60, timer:null, paused:false, blockRotation:false };

    const INSTALL_BANNER_KEY = 'nepon-install-banner-dismissed';
    const isTouchDevice = () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const isStandaloneMode = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const isiOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
    function updateInstallBanner() {
      const banner = $('#installBanner');
      if (!banner) return;
      const shouldShow = isiOS() && isTouchDevice() && !isStandaloneMode() && localStorage.getItem(INSTALL_BANNER_KEY) !== 'true';
      banner.classList.toggle('is-hidden', !shouldShow);
    }
    function dismissInstallBanner() {
      localStorage.setItem(INSTALL_BANNER_KEY, 'true');
      updateInstallBanner();
    }
    function shouldForceLandscape() {
      return isTouchDevice() && window.matchMedia('(max-width: 820px)').matches && window.innerHeight > window.innerWidth;
    }
    function updateForceLandscape() {
      document.body.classList.toggle('force-landscape', shouldForceLandscape());
    }


    function load() {
      const deleted = safeParse(KEYS.deleted, []);
      const overrides = safeParse(KEYS.overrides, {});
      const custom = safeParse(KEYS.custom, []);
      const built = BUILTIN.filter(c=>!deleted.includes(c.id)).map(c=>{ const o=overrides[c.id]; return o ? {...c, name:o.name||c.name, description:o.description||c.description, words:Array.isArray(o.words)?o.words:c.words, isEdited:true} : {...c}; });
      state.categories = [...built, ...custom.map(c=>({ id:c.id||`custom-${Date.now()}`, name:c.name, description:c.description||'Моя категория', words:Array.isArray(c.words)?c.words:[], isCustom:true }))];
      state.recent = safeParse(KEYS.recent, []);
      const t = parseInt(localStorage.getItem(KEYS.time),10); state.roundTime = Number.isFinite(t)&&t>0 ? t : 60;
      state.settings.sound = localStorage.getItem(KEYS.sound) === 'true';
      state.settings.vibration = localStorage.getItem(KEYS.vibration) !== 'false';
      state.settings.tilt = localStorage.getItem(KEYS.tilt) !== 'false';
      state.settings.swipe = localStorage.getItem(KEYS.swipe) === 'true';
    }
    function saveCustom() { saveJson(KEYS.custom, state.categories.filter(c=>c.isCustom).map(toStorage)); }
    function saveOverrides() { const o={}; state.categories.filter(c=>!c.isCustom&&c.isEdited).forEach(c=>{ o[c.id]=toStorage(c); }); saveJson(KEYS.overrides,o); }
    function saveRecent() { saveJson(KEYS.recent, state.recent); }
    function rememberRecent(cat) { state.recent = [cat.id, ...state.recent.filter(id=>id!==cat.id)].slice(0,8); saveRecent(); }
    function currentCategories() { let arr = state.categories; if(state.activeTab==='my') arr=arr.filter(c=>c.isCustom); if(state.activeTab==='recent') arr=state.recent.map(id=>state.categories.find(c=>c.id===id)).filter(Boolean); const q=state.query.trim().toLowerCase(); if(q) arr=arr.filter(c=>`${c.name} ${c.description||''}`.toLowerCase().includes(q)); return arr; }
    function show(screen) { ['#mainScreen','#formScreen','#gameScreen','#resultsScreen'].forEach(s=>$(s).classList.add('is-hidden')); $(screen).classList.remove('is-hidden'); updateForceLandscape(); window.scrollTo({top:0,behavior:'smooth'}); }
    function renderCards() { const grid=$('#cardsGrid'); grid.innerHTML=''; const cats=currentCategories(); let offset=0; if(state.activeTab==='my'){ offset=1; grid.appendChild(addCard()); } cats.forEach((cat,i)=>grid.appendChild(categoryCard(cat,i+offset))); if(!cats.length && state.activeTab!=='my') grid.innerHTML='<p class="empty-text">Категории не найдены</p>'; if(!cats.length && state.activeTab==='my') { const p=document.createElement('p'); p.className='empty-text'; p.textContent='Пока нет своих категорий'; grid.appendChild(p); } }
    function addCard() { const el=document.createElement('article'); el.className='category-card'; el.innerHTML=`<div class="card-inner"><div class="card-face"><span class="card-num">01</span><span class="add-plus"></span><span class="add-text">Добавить категорию</span></div></div>`; el.addEventListener('click',()=>openForm()); return el; }
    function categoryCard(cat,index) { const el=document.createElement('article'); el.className=`category-card ${state.flippedId===cat.id?'is-flipped':''}`; el.innerHTML=`<div class="card-inner"><div class="card-face"><span class="card-num">${String(index+1).padStart(2,'0')}</span><button class="card-icon delete" title="Удалить категорию" aria-label="Удалить категорию"><svg viewBox="0 0 24 24"><path d="M6 6L18 18"/><path d="M18 6L6 18"/></svg></button><button class="card-icon edit" title="Поменять: название, описание, слова" aria-label="Поменять: название, описание, слова"><svg viewBox="0 0 24 24"><path d="M4 20L8.5 19L18 9.5L14.5 6L5 15.5L4 20Z"/><path d="M13.5 7L17 10.5"/></svg></button><h3 class="card-title">${escapeHtml(cat.name)}</h3><p class="card-count">${cat.words.length} карточек</p></div><div class="card-face card-back"><span class="card-num">${String(index+1).padStart(2,'0')}</span><p class="card-desc">${escapeHtml(cat.description||'')}</p><button class="start-btn pill" type="button">${cat.words.length?'Старт':'Пусто'}</button></div></div>`;
      el.addEventListener('click',()=>{ const wasOpen=state.flippedId===cat.id; $$('.category-card.is-flipped').forEach(card=>card.classList.remove('is-flipped')); state.flippedId = wasOpen ? null : cat.id; if(!wasOpen) el.classList.add('is-flipped'); });
      el.querySelector('.delete').addEventListener('click',e=>{ e.stopPropagation(); deleteCategory(cat); });
      el.querySelector('.edit').addEventListener('click',e=>{ e.stopPropagation(); openForm(cat); });
      el.querySelector('.start-btn').addEventListener('click',e=>{ e.stopPropagation(); if(cat.words.length) startCategory(cat); });
      return el; }
    function escapeHtml(str) { return String(str).replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
    function deleteCategory(cat) { if(!confirm(`Удалить категорию «${cat.name}»?`)) return; state.categories=state.categories.filter(c=>c.id!==cat.id); state.recent=state.recent.filter(id=>id!==cat.id); if(!cat.isCustom){ const deleted=safeParse(KEYS.deleted,[]); saveJson(KEYS.deleted,[...new Set([...deleted,cat.id])]); } saveCustom(); saveOverrides(); saveRecent(); state.flippedId=null; renderCards(); }
    function openForm(cat=null) { state.editingId=cat?cat.id:null; $('#formTitle').textContent=cat?'Редактировать категорию':'Добавить категорию'; $('#catName').value=cat?cat.name:''; $('#catDescription').value=cat?cat.description||'':''; $('#catWords').value=cat?cat.words.join('\n'):''; show('#formScreen'); }
    function closeForm() { state.editingId=null; show('#mainScreen'); renderCards(); }
    function saveForm(e) { e.preventDefault(); const name=$('#catName').value.trim(); const description=$('#catDescription').value.trim(); const words=splitWords($('#catWords').value); if(!name||!words.length){ alert('Добавь название категории и хотя бы одно слово.'); return; } if(state.editingId){ state.categories=state.categories.map(c=>c.id===state.editingId?{...c,name,description,words,isEdited:!c.isCustom||c.isEdited}:c); saveCustom(); saveOverrides(); } else { state.categories.push({ id:`custom-${Date.now()}`, name, description:description||'Моя категория', words, isCustom:true }); saveCustom(); state.activeTab='my'; } state.editingId=null; show('#mainScreen'); renderTabs(); renderCards(); }
    function renderTabs() { $$('.tabs .pill').forEach(b=>b.classList.toggle('is-active', b.dataset.tab===state.activeTab)); }
    function renderTimeGrid() { const grid=$('#timeGrid'); grid.innerHTML=''; TIMES.forEach(t=>{ const b=document.createElement('button'); b.className=`pill mini-pill ${state.roundTime===t?'is-active':''}`; b.type='button'; b.textContent=TIME_LABELS[t]; b.setAttribute('aria-pressed',state.roundTime===t); b.addEventListener('click',()=>{ state.roundTime=t; localStorage.setItem(KEYS.time,String(t)); state.timeLeft=t; renderTimeGrid(); }); grid.appendChild(b); }); }
    function renderToggles() { $$('.toggle').forEach(btn=>{ const key=btn.dataset.setting; btn.classList.toggle('is-on', !!state.settings[key]); }); }
    function openDrawer(which) { $('#drawerOverlay').classList.add('is-active'); $('#helpDrawer').classList.toggle('is-active', which==='help'); $('#settingsDrawer').classList.toggle('is-active', which==='settings'); }
    function closeDrawers() { $('#drawerOverlay').classList.remove('is-active'); $('#helpDrawer').classList.remove('is-active'); $('#settingsDrawer').classList.remove('is-active'); }
    function startCategory(cat) { state.currentCategory={...cat, words:[...cat.words]}; rememberRecent(cat); state.deck=shuffle(cat.words); state.answers=[]; state.score=0; state.timeLeft=state.roundTime; state.currentWord=null; state.flippedId=null; runCountdown(()=>beginGame()); }
    function runCountdown(done) { $('#countdown').classList.remove('is-active'); void $('#countdown').offsetWidth; $('#countdown').classList.add('is-active'); setTimeout(()=>{ $('#countdown').classList.remove('is-active'); done(); },3100); }
    function beginGame() { state.paused=false; show('#gameScreen'); nextWord(); updateTimer(); clearInterval(state.timer); state.timer=setInterval(()=>{ if(state.paused) return; state.timeLeft-=1; updateTimer(); if(state.timeLeft<=0) finishRound(true); },1000); requestOrientationPermission(); }
    function nextWord() { if(!state.deck.length) return finishRound(false); state.currentWord=state.deck.shift(); $('#gameWord').textContent=state.currentWord; }
    function decide(status) { if($('#gameScreen').classList.contains('is-hidden')||state.paused||!state.currentWord) return; state.answers.push({name:state.currentWord,status}); if(status==='correct') state.score+=1; const g=$('#gameScreen'); g.classList.remove('correct','skip'); void g.offsetWidth; g.classList.add(status==='correct'?'correct':'skip'); if(state.settings.vibration && navigator.vibrate) navigator.vibrate(status==='correct'?35:25); setTimeout(()=>{ g.classList.remove('correct','skip'); nextWord(); },360); }
    function updateTimer() { const pct=Math.max(0,Math.min(100,(state.timeLeft/state.roundTime)*100)); $('#timerFill').style.width=pct+'%'; $('#timerText').textContent=`${state.timeLeft} сек.`; }
    function finishRound(includeCurrent) { clearInterval(state.timer); state.timer=null; if(includeCurrent && state.currentWord) { state.answers.push({name:state.currentWord,status:'skip'}); state.currentWord=null; } renderResults(); show('#resultsScreen'); }
    function renderResults() { const total=state.answers.length; const skipped=state.answers.filter(a=>a.status==='skip').length; $('#scoreMain').textContent=`${state.score}/${total}`; $('#scoreSub').textContent=`${state.score} угадано · ${skipped} пропущено`; const list=$('#resultsList'); list.innerHTML=''; state.answers.forEach(a=>{ const li=document.createElement('li'); li.className=`clean-word ${a.status==='skip'?'is-missed':''}`; li.textContent=a.name; list.appendChild(li); }); }
    function pauseGame() { if($('#gameScreen').classList.contains('is-hidden')) return; state.paused=true; $('#pauseOverlay').classList.add('is-active'); }
    function resumeGame() { state.paused=false; $('#pauseOverlay').classList.remove('is-active'); }
    function goHome() { clearInterval(state.timer); state.timer=null; state.paused=false; $('#pauseOverlay').classList.remove('is-active'); show('#mainScreen'); renderCards(); }
    function requestOrientationPermission() { if(!state.settings.tilt) return; const D=window.DeviceOrientationEvent; if(D && typeof D.requestPermission==='function') { D.requestPermission().catch(()=>{}); } }
    window.addEventListener('deviceorientation', e=>{ if(!state.settings.tilt || $('#gameScreen').classList.contains('is-hidden') || state.paused) return; const gamma=e.gamma||0; if(Math.abs(gamma)<=30 && !state.blockRotation){ state.blockRotation=true; decide(gamma>=0?'correct':'skip'); } if(Math.abs(gamma)>=70) state.blockRotation=false; });
    let touchStartX=0, touchStartY=0; window.addEventListener('touchstart',e=>{ const t=e.changedTouches[0]; touchStartX=t.clientX; touchStartY=t.clientY; },{passive:true}); window.addEventListener('touchend',e=>{ if(!state.settings.swipe || $('#gameScreen').classList.contains('is-hidden') || state.paused) return; const t=e.changedTouches[0]; const dx=t.clientX-touchStartX; const dy=t.clientY-touchStartY; if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)) decide(dx>0?'correct':'skip'); },{passive:true});
    window.addEventListener('keydown',e=>{ if($('#gameScreen').classList.contains('is-hidden')||state.paused) return; if(e.key==='ArrowRight') decide('correct'); if(e.key==='ArrowLeft') decide('skip'); });

    function bind() {
      $('#openHelp').onclick=()=>openDrawer('help'); $('#openSettings').onclick=()=>{ renderTimeGrid(); renderToggles(); openDrawer('settings'); }; $('#closeHelp').onclick=closeDrawers; $('#closeSettings').onclick=closeDrawers; $('#drawerOverlay').onclick=closeDrawers;
      $$('.tabs .pill').forEach(b=>b.onclick=()=>{ state.activeTab=b.dataset.tab; state.query=''; $('#searchInput').value=''; state.flippedId=null; renderTabs(); renderCards(); });
      $('#searchInput').oninput=e=>{ state.query=e.target.value; state.flippedId=null; renderCards(); };
      $('#randomBtn').onclick=()=>{ const btn=$('#randomBtn'); const cats=currentCategories().filter(c=>c.words.length); if(!cats.length || btn.classList.contains('is-dice-animating')) return; const cat=cats[Math.floor(Math.random()*cats.length)]; btn.classList.add('is-dice-animating'); setTimeout(()=>{ btn.classList.remove('is-dice-animating'); startCategory(cat); }, 320); };
      $('#closeForm').onclick=closeForm; $('#cancelForm').onclick=closeForm; $('#categoryForm').onsubmit=saveForm; $('#fileInput').onchange=e=>{ const file=e.target.files&&e.target.files[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{ const imported=splitWords(r.result).join('\n'); $('#catWords').value=[$('#catWords').value.trim(), imported].filter(Boolean).join('\n'); }; r.readAsText(file,'UTF-8'); };
      $$('.toggle').forEach(btn=>btn.onclick=()=>{ const key=btn.dataset.setting; state.settings[key]=!state.settings[key]; localStorage.setItem(KEYS[key], String(state.settings[key])); renderToggles(); });
      $('#pauseHitArea').onclick=pauseGame; $('#resumeBtn').onclick=resumeGame; $('#pauseHomeBtn').onclick=goHome; $('#resultsHome').onclick=goHome; $('#resultsRestart').onclick=()=>state.currentCategory&&startCategory(state.currentCategory); const installClose = $('#closeInstallBanner'); if (installClose) installClose.onclick=dismissInstallBanner;
    }
    window.addEventListener('resize', ()=>{ updateForceLandscape(); updateInstallBanner(); });
    window.addEventListener('orientationchange', ()=>{ updateForceLandscape(); updateInstallBanner(); });
    load(); bind(); renderTabs(); renderCards(); renderTimeGrid(); renderToggles(); updateForceLandscape(); updateInstallBanner();

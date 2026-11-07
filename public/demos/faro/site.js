(() => {
  'use strict';
  document.body.classList.add('js');
  const config = window.FARO_CONFIG;
  if (!config?.menu?.length || !config.sizes?.length) return;
  const $ = selector => document.querySelector(selector);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  const menu = new Map(config.menu.map(dish => [dish.id,dish]));
  const sizes = new Map(config.sizes.map(size => [size.id,size]));
  const defaultSize = config.sizes[0].id;
  const price = (dish,size) => Math.round(dish.price * sizes.get(size).multiplier / 10) * 10;
  const icon = plus => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16${plus?'M12 4v16':''}"/></svg>`;
  const cart = new Map(), storageKey = 'faro-demo-cart-v2';
  const dialog = $('#cart-dialog'), detail = $('#dish-dialog'), list = $('#cart-items');
  let opener, detailOpener, selected = null, detailSize = defaultSize, detailDish = config.menu[0].id, previewToken = 0;
  document.title = config.brand.title;
  $('meta[name="description"]').content = config.brand.description;
  $('meta[name="theme-color"]').content = config.colors.ink;
  for (const [key,value] of Object.entries(config.colors)) document.documentElement.style.setProperty('--'+key,value);
  document.querySelectorAll('.wordmark').forEach(mark => {mark.firstChild.textContent=config.brand.name; mark.querySelector('span').textContent=config.brand.tagline;});
  $('.loader-wordmark').textContent=config.brand.name;
  document.querySelectorAll('[data-brand]').forEach(node=>node.textContent=config.brand.name);
  $('.site-header .wordmark').setAttribute('aria-label',config.brand.name+' — в начало');
  $('.site-header a[href="#about"]').textContent='О '+config.brand.name;
  $('.scene-caption').textContent=config.menu[0].name+' · '+config.brand.name;
  function announce(text) { $('#cart-status').textContent=text; }
  function persist() { try {localStorage.setItem(storageKey,JSON.stringify([...cart]));}catch {} }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || localStorage.getItem('faro-demo-cart-v1') || '[]');
    if(Array.isArray(saved)) for(const entry of saved) {
      if(!Array.isArray(entry)||typeof entry[0]!=='string'||!Number.isInteger(entry[1])||entry[1]<1) continue;
      const [id,size=defaultSize]=entry[0].split(':');
      if(menu.has(id)&&sizes.has(size)) cart.set(id+':'+size,Math.min(99,entry[1]));
    }
  } catch {}
  function total() {let amount=0,quantity=0;for(const[key,q]of cart){const[id,size]=key.split(':');amount+=price(menu.get(id),size)*q;quantity+=q;}return{amount,quantity};}
  function renderCart() {
    list.replaceChildren();
    for(const[key,q]of cart){
      const[id,size]=key.split(':'),dish=menu.get(id),li=document.createElement('li');li.className='cart-item';li.dataset.item=key;
      // Only authored IDs/sizes enter attributes. User-editable copy is assigned as text.
      li.innerHTML=`<div class="cart-item-top"><div><h3></h3><span class="cart-item-size"></span></div><span class="cart-item-price"></span></div><div class="quantity"><button type="button" data-operation="minus">${icon(false)}</button><output></output><button type="button" data-operation="plus" ${q>=99?'disabled':''}>${icon(true)}</button><button class="cart-item-remove" type="button" data-operation="remove">Убрать</button></div>`;
      li.querySelector('h3').textContent=dish.name;li.querySelector('.cart-item-size').textContent=sizes.get(size).label;
      li.querySelector('.cart-item-price').textContent=money(price(dish,size)*q);
      const label=dish.name+', '+sizes.get(size).label;
      li.querySelector('[data-operation="minus"]').setAttribute('aria-label','Уменьшить количество: '+label);
      li.querySelector('[data-operation="plus"]').setAttribute('aria-label','Увеличить количество: '+label);
      li.querySelector('[data-operation="remove"]').setAttribute('aria-label','Удалить '+label);
      li.querySelector('output').textContent=q;li.querySelector('output').setAttribute('aria-label','Количество: '+label);list.append(li);
    }
    const sum=total();$('#cart-count').textContent=sum.quantity;$('#cart-total').textContent=money(sum.amount);
    dialog.dataset.total=sum.amount;dialog.dataset.count=sum.quantity;
    $('.cart-open').classList.toggle('has-items',sum.quantity>0);$('#cart-empty').hidden=sum.quantity>0;
    $('.cart-summary').hidden=sum.quantity===0;$('#order-feedback').textContent='Демозаказ: без оплаты и отправки в пиццерию.';
  }
  function add(id,size,button) {
    if(!menu.has(id)||!sizes.has(size)) return;
    const key=id+':'+size,q=cart.get(key)||0;
    if(q>=99){announce('В заказе уже 99 пицц этого вида и размера.');return;}
    cart.set(key,q+1);persist();renderCart();announce('Добавлена '+menu.get(id).name+', '+sizes.get(size).label+'. В заказе '+total().quantity+'.');
    if(button){button.classList.add('added');setTimeout(()=>button.classList.remove('added'),750);}
    if(window.gsap&&!reduced())gsap.fromTo($('#cart-count'),{scale:1.18},{scale:1,duration:.35,ease:'power3.out',overwrite:true});
  }
  list.addEventListener('click',event=>{
    const control=event.target.closest('[data-operation]');if(!control)return;
    const key=control.closest('[data-item]').dataset.item,op=control.dataset.operation;
    const q=op==='remove'?0:Math.min(99,(cart.get(key)||0)+(op==='plus'?1:-1));
    if(q<=0)cart.delete(key);else cart.set(key,q);persist();renderCart();
    const buttons=[...list.querySelectorAll('[data-item]')];
    const replacement=buttons.find(li=>li.dataset.item===key)?.querySelector('[data-operation="'+op+'"]');
    (replacement&&!replacement.disabled?replacement:list.querySelector('button')||$('#cart-to-menu')).focus({preventScroll:true});
    announce('Заказ обновлён. Итого '+money(total().amount)+'.');
  });
  $('.cart-open').addEventListener('click',event=>{opener=event.currentTarget;renderCart();dialog.showModal();document.body.classList.add('cart-visible');if(window.gsap&&!reduced())gsap.fromTo(dialog,{xPercent:100},{xPercent:0,duration:.45,ease:'power4.out'});});
  $('.cart-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog&&event.clientX<dialog.getBoundingClientRect().left)dialog.close();});
  dialog.addEventListener('close',()=>{document.body.classList.remove('cart-visible');opener?.focus({preventScroll:true});});
  $('#cart-to-menu').addEventListener('click',()=>dialog.close());
  $('#save-order').addEventListener('click',()=>{
    const lines=[config.brand.name+' — мой выбор','',...[...cart].map(([key,q])=>{const[id,size]=key.split(':');return menu.get(id).name+' / '+sizes.get(size).label+' × '+q+' — '+money(price(menu.get(id),size)*q);}), '', 'Итого: '+money(total().amount),'','Демонстрационное меню. Это не подтверждение реального заказа.'];
    const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\n')],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=config.brand.name+'-мой-выбор.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('#order-feedback').textContent='Ваш выбор сохранён в файле. Он не отправлен в пиццерию.';
  });

  // Only an explicit menu choice changes the photograph. Hover/focus/filter never do.
  async function preview(id) {
    const dish=menu.get(id);if(!dish)return;selected=id;
    const token=++previewToken,img=new Image();img.src=dish.image;
    try {await img.decode();}catch{return;}
    if(token!==previewToken)return;
    const target=$('#menu-preview');target.src=dish.image;target.alt='Иллюстрация пиццы '+dish.name;
    target.classList.remove('stock-photo');$('#preview-name').textContent=dish.name;$('#preview-note').textContent=dish.note;
    $('#preview-placeholder').hidden=true;$('#preview-open').hidden=false;$('#preview-caption').hidden=false;
    $('.signature-add').setAttribute('aria-label','Выбрать размер: '+dish.name);
    document.querySelectorAll('.dish').forEach(row=>{row.classList.toggle('previewed',row.dataset.dish===id);row.querySelector('.dish-view').setAttribute('aria-pressed',String(row.dataset.dish===id));});
    if(window.gsap&&!reduced())gsap.fromTo(target,{opacity:.65},{opacity:1,duration:.3,ease:'power2.out',overwrite:true,clearProps:'opacity'});
    if(matchMedia('(max-width:700px)').matches)$('.signature').scrollIntoView({block:'start',behavior:reduced()?'instant':'smooth'});
  }
  const rows=$('#menu-list');rows.replaceChildren();
  for(const dish of config.menu){
    const li=document.createElement('li');li.className='dish';li.dataset.dish=dish.id;li.dataset.category=dish.category;
    li.innerHTML='<div class="dish-copy"><h3><button class="dish-view" type="button" aria-pressed="false" aria-controls="menu-preview"></button></h3><p></p></div><span class="dish-price"></span><button class="dish-add" type="button">'+icon(true)+'</button>';
    const view=li.querySelector('.dish-view');view.textContent=dish.name;view.setAttribute('aria-label','Показать '+dish.name);
    li.querySelector('p').textContent=dish.ingredients;li.querySelector('.dish-price').textContent=money(dish.price);
    const plus=li.querySelector('.dish-add');plus.dataset.add=dish.id;plus.setAttribute('aria-label','Добавить '+dish.name+', '+sizes.get(defaultSize).label);
    view.addEventListener('click',()=>preview(dish.id));
    plus.addEventListener('click',()=>add(dish.id,defaultSize,plus));rows.append(li);
  }
  $('.signature-add').addEventListener('click',event=>openDish(selected,event.currentTarget));
  $('#preview-open').addEventListener('click',event=>openDish(selected,event.currentTarget));
  const sizeGroup=$('#dish-sizes');
  for(const size of config.sizes){const button=document.createElement('button');button.type='button';button.dataset.size=size.id;button.textContent=size.label;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>{detailSize=size.id;updateSize();});sizeGroup.append(button);}
  function updateSize(){sizeGroup.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.size===detailSize)));$('#dish-detail-price').textContent=money(price(menu.get(detailDish),detailSize));}
  function openDish(id,button){
    const dish=menu.get(id);detailDish=id;detailSize=defaultSize;detailOpener=button;
    $('#dish-detail-title').textContent=dish.name;$('#dish-detail-note').textContent=dish.note;$('#dish-detail-ingredients').textContent=dish.ingredients;
    const image=$('#dish-detail-image');image.src=dish.image;image.alt='Иллюстрация пиццы '+dish.name;image.classList.remove('stock-photo');
    $('#dish-added').textContent='';updateSize();detail.showModal();detail.querySelector('.dish-detail-scroll').scrollTop=0;document.body.classList.add('dish-visible');
    if(window.gsap&&!reduced())gsap.fromTo(detail,{y:18,opacity:.7},{y:0,opacity:1,duration:.35,ease:'power3.out',overwrite:true,clearProps:'transform,opacity'});
  }
  $('#dish-close').addEventListener('click',()=>detail.close());
  detail.addEventListener('click',event=>{if(event.target===detail){const r=detail.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)detail.close();}});
  detail.addEventListener('close',()=>{if(window.gsap){gsap.killTweensOf(detail);gsap.set(detail,{clearProps:'transform,opacity'});}document.body.classList.remove('dish-visible');detailOpener?.focus({preventScroll:true});});
  $('#dish-detail-add').addEventListener('click',event=>{add(detailDish,detailSize,event.currentTarget);$('#dish-added').textContent='Добавлена в заказ: '+sizes.get(detailSize).label+'.';});
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    const visible=[];document.querySelectorAll('[data-category]').forEach(row=>{row.hidden=button.dataset.filter!=='all'&&row.dataset.category!==button.dataset.filter;if(!row.hidden)visible.push(row);});
    announce(button.textContent+': '+visible.length+' '+(visible.length===3?'позиции':'позиций')+'.');
    if(window.gsap&&!reduced())gsap.fromTo(visible,{opacity:.45,y:8},{opacity:1,y:0,duration:.3,stagger:.03,ease:'power3.out',overwrite:true});
    if(window.ScrollTrigger)requestAnimationFrame(()=>ScrollTrigger.refresh());
  }));
  $('#menu-preview').addEventListener('error',event=>{event.currentTarget.src='media/pizza-studio.webp';});
  $('#dish-detail-image').addEventListener('error',event=>{if(!event.currentTarget.src.endsWith('pizza-studio.webp'))event.currentTarget.src='media/pizza-studio.webp';});

  // The preparation gallery cycles only while visible. Manual choices and Pause take priority.
  const preparation=$('.preparation'),steps=[...document.querySelectorAll('[data-prep]')],panels=[...document.querySelectorAll('[data-prep-panel]')],prepToggle=$('#prep-toggle');
  const prepMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let prepIndex=0,prepPaused=false,prepVisible=false,prepTimer,prepVersion=0;
  function syncPrep(){
    clearTimeout(prepTimer);prepToggle.disabled=prepMotion.matches;
    prepToggle.setAttribute('aria-pressed',String(prepPaused));
    prepToggle.setAttribute('aria-label',prepPaused?'Продолжить автоматическую смену фотографий':'Остановить автоматическую смену фотографий');
    prepToggle.querySelector('span').textContent=prepMotion.matches?'Без автосмены':prepPaused?'Продолжить':'Пауза';
    prepToggle.querySelector('path').setAttribute('d',prepPaused?'M8 5l11 7-11 7Z':'M8 5v14M16 5v14');
    if(prepVisible&&!prepPaused&&!prepMotion.matches&&!document.hidden)prepTimer=setTimeout(()=>selectPrep((prepIndex+1)%panels.length),5000);
  }
  async function selectPrep(index){
    const token=++prepVersion,next=panels[index],old=panels[prepIndex],image=next.querySelector('img');image.loading='eager';
    try{await image.decode();}catch{}
    if(token!==prepVersion)return;
    prepIndex=index;steps.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    if(window.gsap)gsap.killTweensOf(panels);
    panels.forEach(p=>{if(p!==next&&p!==old){p.hidden=true;p.setAttribute('aria-hidden','true');}});
    next.hidden=false;next.removeAttribute('aria-hidden');old.setAttribute('aria-hidden',String(old!==next));
    if(window.gsap&&!prepMotion.matches&&old!==next){
      gsap.set(next,{autoAlpha:0,zIndex:2});gsap.set(old,{autoAlpha:1,zIndex:1});
      gsap.to(next,{autoAlpha:1,duration:.8,ease:'power2.inOut',clearProps:'opacity,visibility,zIndex'});
      gsap.to(old,{autoAlpha:0,duration:.8,ease:'power2.inOut',onComplete:()=>{if(old!==panels[prepIndex])old.hidden=true;gsap.set(old,{clearProps:'opacity,visibility,zIndex'});}});
    }else {panels.forEach(p=>p.hidden=p!==next);if(window.gsap)gsap.set(panels,{clearProps:'opacity,visibility,zIndex'});}
    syncPrep();
  }
  steps.forEach((button,index)=>button.addEventListener('click',()=>{prepPaused=true;clearTimeout(prepTimer);selectPrep(index);syncPrep();}));
  prepToggle.addEventListener('click',()=>{prepPaused=!prepPaused;syncPrep();});
  new IntersectionObserver(entries=>{prepVisible=entries[0].isIntersecting;if(prepVisible)panels.forEach(p=>p.querySelector('img').loading='eager');syncPrep();},{threshold:.35}).observe($('.prep-images'));
  document.addEventListener('visibilitychange',syncPrep);prepMotion.addEventListener('change',syncPrep);syncPrep();
  window.addEventListener('pagehide',()=>{clearTimeout(prepTimer);if(window.gsap)gsap.killTweensOf(panels);});
  const header=$('.site-header');new IntersectionObserver(entries=>header.classList.toggle('solid',!entries[0].isIntersecting),{rootMargin:'-100px 0px 0px 0px'}).observe($('#journey'));
  if(window.gsap&&window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);const media=gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)',()=>{
      gsap.from('#menu-title .text-line>span',{yPercent:105,duration:.85,stagger:.1,ease:'power4.out',scrollTrigger:{trigger:'#menu',start:'top 76%',once:true}});
      gsap.from('.about-copy h2',{y:30,opacity:.6,duration:.9,ease:'power4.out',scrollTrigger:{trigger:'.about-copy',start:'top 82%',once:true}});
      gsap.from('.closing-link',{x:-20,opacity:.6,duration:.7,ease:'power4.out',scrollTrigger:{trigger:'.closing',start:'top 75%',once:true}});
    });document.fonts.ready.then(()=>ScrollTrigger.refresh());
  }
  renderCart();
})();

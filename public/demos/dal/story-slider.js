(()=>{
 const restart=document.querySelector('[data-story-restart]');
 const slider=document.querySelector('[data-story-slider]');
 const input=slider?.querySelector('input');
 const overlay=document.querySelector('.story-return');
 if(!restart||!slider||!input||!overlay)return;
 const prefersLessMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const heading=document.querySelector('#hero-title');
 const opening=document.querySelector('.hero');
 const status=restart.querySelector('[role="status"]');
 let pointerActive=false;
 let returning=false;
 let travel=0;
 restart.hidden=false;
 document.querySelector('[data-story-fallback]').hidden=true;

 function paint(value){
  const progress=Math.min(100,Math.max(0,Number(value)||0));
  slider.style.setProperty('--slide-progress',String(progress/100));
  slider.style.setProperty('--slide-offset',`${(travel*progress/100).toFixed(2)}px`);
  input.setAttribute('aria-valuetext',progress===100?'Возвращаемся к началу':`Вернуться к началу: ${Math.round(progress)} %`);
 }
 function measure(){travel=Math.max(0,slider.clientWidth-12-54);paint(input.value)}
 new ResizeObserver(measure).observe(slider);
 measure();

 function reset(){
  pointerActive=false;
  returning=false;
  slider.classList.remove('is-dragging','is-complete');
  slider.removeAttribute('aria-busy');
  input.disabled=false;
  input.value='0';
  paint(0);
 }
 function toBeginning(){
  const previousBehavior=document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior='auto';
  window.scrollTo({top:0,behavior:'instant'});
  document.documentElement.style.scrollBehavior=previousBehavior;
  if(location.hash)history.replaceState(null,'',location.pathname+location.search);
  document.dispatchEvent(new Event('dal:restart'));
  status.textContent='Ты в начале новой истории.';
 }
 function complete(){
  if(returning)return;
  returning=true;
  pointerActive=false;
  input.value='100';
  slider.classList.remove('is-dragging');
  slider.classList.add('is-complete');
  slider.setAttribute('aria-busy','true');
  paint(100);
  input.disabled=true;
  if(prefersLessMotion.matches){toBeginning();reset();heading?.focus({preventScroll:true});return;}
  overlay.classList.add('is-running');
  setTimeout(()=>overlay.classList.add('is-closing'),140);
  setTimeout(toBeginning,680);
  setTimeout(()=>{overlay.classList.remove('is-closing');opening?.classList.add('is-return-arrival')},840);
  setTimeout(()=>{overlay.classList.remove('is-running');opening?.classList.remove('is-return-arrival');reset();heading?.focus({preventScroll:true})},1720);
 }
 function release(){
  if(!pointerActive||returning)return;
  pointerActive=false;
  slider.classList.remove('is-dragging');
  if(Number(input.value)>=96)complete();else reset();
 }
 input.addEventListener('pointerdown',()=>{
  if(returning)return;
  pointerActive=true;
  slider.classList.add('is-dragging');
  status.textContent='';
  measure();
 });
 input.addEventListener('input',()=>paint(input.value));
 input.addEventListener('change',()=>{if(!pointerActive&&Number(input.value)>=100)complete()});
 window.addEventListener('pointerup',release);
 input.addEventListener('pointercancel',()=>{if(!returning)reset()});
 window.addEventListener('blur',()=>{if(pointerActive&&!returning)reset()});
 input.addEventListener('blur',()=>{if(!returning)reset()});
 input.addEventListener('keydown',event=>{
  if(['Enter',' '].includes(event.key)){event.preventDefault();complete()}
  if(event.key==='Escape'){event.preventDefault();if(!returning)reset()}
 });
})();

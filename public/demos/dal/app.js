const $ = (s,root=document) => root.querySelector(s);
const $$ = (s,root=document) => [...root.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const filmFrames=[
 {image:'hero',title:'Сначала — остановиться.',subtitle:'Оставить шум по ту сторону дороги.',alt:'Тихое озеро среди гор в золотом свете заката'},
 {image:'mountains',title:'Вдохнуть чуть глубже.',subtitle:'Понять, сколько мира помещается в одном мгновении.',alt:'Солнечные лучи над бескрайней горной долиной'},
 {image:'iceland',title:'Почувствовать настоящее.',subtitle:'Ветер. Вода. И удивительная простота быть здесь.',alt:'Водопад среди зелёных склонов Исландии'},
 {image:'night',title:'Забрать это с собой.',subtitle:'Самые важные места остаются внутри.',alt:'Звёздное небо над заснеженными горами'}
];
const places = [
 {name:'Япония',country:'Япония · искусство замечать',image:'japan',title:'Красота в деталях.',caption:'У каждого мгновения свой смысл.',description:'Проснуться раньше города. Пройти по тихой улице, заглянуть в маленькую чайную, заметить свет на старом дереве. Эта история о внимании к вещам, мимо которых обычно проходят.',details:[['Ритм','Прогулки, чайные и тихие сады'],['Настроение','Внимание к маленьким деталям'],['Идея пути','Киото → Нара → собственное открытие']]},
 {name:'Намибия',country:'Намибия · песчаная история',image:'desert',title:'Остаться наедине с миром.',caption:'Когда горизонт ничем не ограничен.',description:'У песка есть свой голос. На рассвете он становится розовым, днём — золотым, к вечеру — почти красным. Здесь можно долго смотреть вдаль и наконец услышать собственные мысли.',details:[['Ритм','Рассветы, дороги и длинные паузы'],['Настроение','Простор и полная тишина'],['Идея пути','Дюны Соссусфлей → побережье']]},
 {name:'Доломиты',country:'Италия · горная история',image:'dolomites',title:'Выше повседневности.',caption:'Некоторые вершины остаются внутри.',description:'Утром горы ещё прячутся в облаках. Потом солнце медленно касается вершин, и всё становится удивительно простым. Тропа, воздух, шаг. Путешествие, которое возвращает ощущение настоящего.',details:[['Ритм','Тропы, горные приюты и медленные утра'],['Настроение','Воздух и свобода'],['Идея пути','Альпийская долина → озеро → панорамная тропа']]},
 {name:'Исландия',country:'Исландия · история с края света',image:'iceland',title:'Мир начинается заново.',caption:'Вода помнит дорогу лучше нас.',description:'Чёрный берег, зелёный мох, ледяная вода. Здесь природа не просит внимания — она забирает его целиком. Четыре остановки, чтобы оставить привычный шум и вспомнить, как звучит мир.',details:[['День 1','Рейкьявик: гавань и тихие улицы'],['День 2','Сельяландсфосс и Рейнисфьяра'],['День 3','Ледниковая лагуна Йёкюльсаурлоун'],['День 4','Свободная остановка на обратном пути']]},
 {name:'Северные озёра',country:'У воды · история без спешки',image:'lake',title:'Научиться тишине.',caption:'Здесь можно никуда не торопиться.',description:'Вода зеркально отражает небо. Ветер меняет её цвет. День растягивается, когда перестаёшь считать минуты. Эта история не привязана к одной стране: твоё тихое озеро может оказаться ближе, чем кажется.',details:[['Ритм','Береговые прогулки и долгий взгляд'],['Настроение','Спокойствие и ясность'],['Идея пути','Найти своё озеро и остаться до заката']]}
];
const wheelSection = $('.wheel-section');
const wheelStage = $('.wheel-stage');
const cards = $$('.destination-card');
const angles = [-56,-28,0,28,56];
let selected = 2, currentRotation = 0, targetRotation = 0, wheelOffset = 0, scrollContribution = 0;
let ticking = false;
function updateCaption(index){
 if(index===selected && $('#place-name').textContent===places[index].name)return;
 selected=index;
 $('#place-country').textContent=places[index].country;
 $('#place-name').textContent=places[index].name;
 $('#place-count').textContent=`${String(index+1).padStart(2,'0')} / 05`;
 cards.forEach((card,i)=>card.classList.toggle('is-active',i===index));
}
function setDestination(index){
 const next=(index+places.length)%places.length;
 wheelOffset=-angles[next]-scrollContribution;
 targetRotation=-angles[next];
 updateCaption(next);
 startFrame();
}
$('[data-wheel-prev]').addEventListener('click',()=>setDestination(selected-1));
$('[data-wheel-next]').addEventListener('click',()=>setDestination(selected+1));
cards.forEach((card,index)=>card.addEventListener('click',()=>{setDestination(index);openStory(index)}));
const rail=$('.polaroid-rail');
function moveJournal(direction){rail.scrollBy({left:direction*(innerWidth<700?268:312),behavior:reducedMotion?'instant':'smooth'})}
$('[data-journal-prev]').addEventListener('click',()=>moveJournal(-1));
$('[data-journal-next]').addEventListener('click',()=>moveJournal(1));
rail.addEventListener('keydown',e=>{if(e.target!==rail)return;if(e.key==='ArrowRight'){e.preventDefault();moveJournal(1)}if(e.key==='ArrowLeft'){e.preventDefault();moveJournal(-1)}});
const revealTargets=new Map();
const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){(revealTargets.get(entry.target)||[entry.target]).forEach(el=>el.classList.add('is-visible'));revealObserver.unobserve(entry.target)}}),{threshold:.14});
if(!reducedMotion){
 document.documentElement.classList.add('motion-ready');
 $$('.reveal-text,.timeline-stop,.polaroid').forEach(el=>{
  // A fully clipped heading has no intersection area; observe its unclipped container.
  const target=el.matches('.reveal-text')?el.parentElement:el;
  revealTargets.set(target,[...(revealTargets.get(target)||[]),el]);
  revealObserver.observe(target);
 });
}
const route=$('.timeline');
const stops=$$('.timeline-stop');
const hero=$('.hero');
const heroScroll=$('.hero-scroll');
const heroImage=$('.hero-landscape');
const heroScenes=$$('.hero-scene');
let heroTargetProgress=0,heroCurrentProgress=0,heroInView=true,heroDescriptionIndex=0;
const interlude=$('.landscape-interlude');
const interludeImage=$('.landscape-interlude>img');
const readingProgress=$('.reading-progress');
function clamp(n,min=0,max=1){return Math.min(max,Math.max(min,n))}
function renderHero(){
 const position=heroCurrentProgress*(heroScenes.length-1);
 const from=Math.min(Math.floor(position),heroScenes.length-1);
 const to=Math.min(from+1,heroScenes.length-1);
 const fraction=clamp((position-from-.12)/.76);
 const mix=fraction*fraction*(3-2*fraction);
 heroScenes.forEach((image,index)=>{
  const isBase=index===from;
  const isIncoming=index===to&&to!==from;
  const ready=image.complete&&image.naturalWidth>0;
  // Keep an opaque base under the incoming frame: no dark flash during a dissolve.
  const opacity=isBase?1:isIncoming&&ready?mix:0;
  image.style.opacity=String(opacity);
  if(isBase||isIncoming){
   const scale=isBase?1.035+mix*.045:1.10-mix*.065;
   const shift=isBase?-mix*9:(1-mix)*12;
   image.style.transform=`translate3d(0,${shift.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
  }
  image.style.willChange=heroInView&&(isBase||isIncoming)?'transform, opacity':'auto';
 });
 const descriptionIndex=mix>=.5?to:from;
 if(descriptionIndex!==heroDescriptionIndex){
  heroDescriptionIndex=descriptionIndex;
  heroImage.setAttribute('aria-label',filmFrames[descriptionIndex].alt);
 }
}
function updateScroll(){
 const rect=wheelSection.getBoundingClientRect();
 const travel=wheelSection.offsetHeight-wheelStage.offsetHeight;
 const p=clamp(-rect.top/Math.max(1,travel));
 scrollContribution=reducedMotion?0:(p-.25)*72;
 targetRotation=clamp(scrollContribution+wheelOffset,-67,67);
 const timelineRect=route.getBoundingClientRect();
 const progress=clamp((innerHeight*.67-timelineRect.top)/Math.max(1,timelineRect.height-60));
 $('.timeline-fill').style.transform=`scaleY(${progress})`;
 stops.forEach(stop=>stop.classList.toggle('is-passed',stop.getBoundingClientRect().top<innerHeight*.67));
 readingProgress.style.transform=`scaleX(${clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight))})`;
 if(!reducedMotion){
  const openingRect=heroScroll.getBoundingClientRect();
  const heroRect=hero.getBoundingClientRect();
  const inset=parseFloat(getComputedStyle(hero).top)||0;
  const openingTravel=Math.max(1,heroScroll.offsetHeight-hero.offsetHeight-inset*2);
  heroTargetProgress=clamp(-openingRect.top/openingTravel);
  heroInView=heroRect.bottom>0&&heroRect.top<innerHeight;
  if(!heroInView)heroCurrentProgress=heroTargetProgress;
  const ir=interlude.getBoundingClientRect();
  if(ir.top<innerHeight&&ir.bottom>0)interludeImage.style.transform=`translateY(${(innerHeight*.5-ir.top-ir.height*.5)*.13}px)`;
 }
}
function frame(){
 if(document.hidden){ticking=false;return;}
 currentRotation=reducedMotion?targetRotation:currentRotation+(targetRotation-currentRotation)*.075;
 wheelStage.style.setProperty('--wheel-rotation',`${currentRotation.toFixed(3)}deg`);
 const closest=angles.reduce((best,angle,i)=>Math.abs(angle+currentRotation)<Math.abs(angles[best]+currentRotation)?i:best,0);
 updateCaption(closest);
 if(!reducedMotion){
  heroCurrentProgress+=(heroTargetProgress-heroCurrentProgress)*.1;
  if(Math.abs(heroCurrentProgress-heroTargetProgress)<.0001)heroCurrentProgress=heroTargetProgress;
  renderHero();
 }
 if(Math.abs(currentRotation-targetRotation)>.015||Math.abs(heroTargetProgress-heroCurrentProgress)>.0001){requestAnimationFrame(frame)}else{ticking=false}
}
function startFrame(){if(!ticking){ticking=true;requestAnimationFrame(frame)}}
let scrollQueued=false;
addEventListener('scroll',()=>{if(scrollQueued)return;scrollQueued=true;requestAnimationFrame(()=>{scrollQueued=false;updateScroll();startFrame()})},{passive:true});
addEventListener('resize',()=>{updateScroll();startFrame()});
updateScroll();startFrame();
if(!reducedMotion)heroScenes.forEach(image=>image.decode().then(()=>{updateScroll();startFrame()}).catch(()=>{}));

const storyDialog=$('#story-dialog');
let storyIndex=2, previousFocus;
function renderStory(index){
 storyIndex=index;const place=places[index];
 $('#story-title').textContent=place.title;
 $('#story-location').textContent=place.country;
 $('#story-description').textContent=place.description;
 $('#story-caption').textContent=place.caption;
 $('#story-image').src=`assets/${place.image}.jpg`;
 $('#story-image').alt=place.name;
 $('#story-details').replaceChildren(...place.details.map(([label,value])=>{const row=document.createElement('div');const strong=document.createElement('strong');const span=document.createElement('span');strong.textContent=label;span.textContent=value;row.append(strong,span);return row}));
}
function openStory(index){renderStory(index);if(!storyDialog.open){previousFocus=document.activeElement;storyDialog.showModal()}}
$$('[data-story]').forEach(button=>button.addEventListener('click',()=>openStory(Number(button.dataset.story))));
$('[data-story-next]').addEventListener('click',()=>renderStory((storyIndex+1)%places.length));
$('[data-close]').addEventListener('click',()=>storyDialog.close());
storyDialog.addEventListener('click',e=>{if(e.target===storyDialog){const r=storyDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)storyDialog.close()}});
storyDialog.addEventListener('close',()=>previousFocus?.focus({preventScroll:true}));

const filmDialog=$('#film-dialog');
let filmIndex=0,filmElapsed=0,filmPaused=false,filmLastTime=0,filmRaf=0,filmPreviousFocus;
function renderFilm(){const f=filmFrames[filmIndex];const image=$('#film-full-image');image.src=`assets/${f.image}.jpg`;image.alt=f.title;image.style.animation='none';void image.offsetWidth;image.style.animation='';$('#film-title').textContent=f.title;$('#film-subtitle').textContent=f.subtitle;$('#film-count').textContent=`${filmIndex+1} / 4`;$$('.film-bars i').forEach((bar,i)=>bar.style.transform=`scaleX(${i<filmIndex?1:0})`)}
function changeFilm(direction){filmIndex=(filmIndex+direction+filmFrames.length)%filmFrames.length;filmElapsed=0;renderFilm()}
function filmTick(time){if(!filmDialog.open)return;if(filmLastTime&&!filmPaused){filmElapsed+=Math.min(time-filmLastTime,100);if(filmElapsed>=6500){if(filmIndex===3){filmPaused=true;updatePause()}else changeFilm(1)}}filmLastTime=time;$$('.film-bars i')[filmIndex].style.transform=`scaleX(${clamp(filmElapsed/6500)})`;filmRaf=requestAnimationFrame(filmTick)}
function updatePause(){filmDialog.classList.toggle('is-paused',filmPaused);$('[data-film-pause]').textContent=filmPaused?'Продолжить':'Пауза';$('[data-film-pause]').setAttribute('aria-pressed',String(filmPaused))}
$('[data-film]').addEventListener('click',()=>{filmPreviousFocus=document.activeElement;filmIndex=0;filmElapsed=0;filmLastTime=0;filmPaused=reducedMotion;renderFilm();updatePause();filmDialog.showModal();filmRaf=requestAnimationFrame(filmTick)});
$('[data-film-close]').addEventListener('click',()=>filmDialog.close());
$('[data-film-prev]').addEventListener('click',()=>changeFilm(-1));
$('[data-film-next]').addEventListener('click',()=>changeFilm(1));
$('[data-film-pause]').addEventListener('click',()=>{filmPaused=!filmPaused;if(!filmPaused&&filmElapsed>=6500)changeFilm(1);updatePause()});
filmDialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();changeFilm(1)}if(e.key==='ArrowLeft'){e.preventDefault();changeFilm(-1)}if(e.key===' '&&e.target.tagName!=='BUTTON'){e.preventDefault();filmPaused=!filmPaused;updatePause()}});
filmDialog.addEventListener('close',()=>{cancelAnimationFrame(filmRaf);filmPreviousFocus?.focus({preventScroll:true})});
document.addEventListener('visibilitychange',()=>{filmLastTime=0;if(!document.hidden){updateScroll();startFrame()}});
document.addEventListener('dal:restart',()=>{
 heroCurrentProgress=heroTargetProgress=0;
 updateScroll();
 if(!reducedMotion)renderHero();
 startFrame();
});

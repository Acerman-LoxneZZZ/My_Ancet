const projects={
 timepiece:{number:'01',title:'Ход времени',subtitle:'Та же модель. Те же 47 деталей.',original:'timepiece-original.jpg',source:'http://127.0.0.1:4311/',accent:'#c5a370',note:'Сохранены циферблат, синёные стрелки, латунный корпус и исходная разборка. Новая постановка света и ракурс дополняют крупный экран сайта.',screen:'timepiece-original.jpg',detail:'timepiece-exploded.jpg',detailLabel:'Разборка в оригинале'},
 faro:{number:'02',title:'FARO',subtitle:'Пицца, характер и цвет настоящего сайта.',original:'faro-original.jpg',source:'http://127.0.0.1:4312/scene-3d/',accent:'#e66744',note:'Исходный скан пиццы, настоящее название, Literata и коралловое меню. Добавлены только керамика, предметный свет и пространственная композиция.',screen:'faro-original.jpg',detail:'faro-menu.jpg',detailLabel:'Настоящее меню'},
 egypt:{number:'03',title:'Египет',subtitle:'Знакомый портал открывает тот же мир.',original:'egypt-original.jpg',source:'http://127.0.0.1:4313/',accent:'#dcb878',note:'Сохранены резной портал, золотая панорама, Cormorant и навигация по семи главам. Свет и глубина обрамляют исходную композицию.',screen:'egypt-original.jpg',detail:'egypt-chapter.jpg',detailLabel:'Глава экспозиции'},
 wordflow:{number:'04',title:'Wordflow',subtitle:'Карточки, словари и прогресс — как в приложении.',original:'wordflow-original.jpg',source:'http://127.0.0.1:4314/',accent:'#b9a3f2',note:'Оригинальный интерфейс на двух предметных плоскостях: обучение и словарь. Сохранены цвета, кнопки и сетка; используются только учебные данные.',screen:'wordflow-original.jpg',detail:'wordflow-dictionary.jpg',detailLabel:'Настоящие словари'}
};
const params=new URLSearchParams(location.search);
const id=Object.hasOwn(projects,params.get('project'))?params.get('project'):'timepiece';
const project=projects[id];
const cover=params.get('view')==='cover';
document.body.dataset.project=id; document.body.dataset.view=cover?'cover':'compare';
document.body.dataset.sheet=params.get('sheet')==='1'?'true':'false';
document.documentElement.style.setProperty('--accent',project.accent);
const img=(file,alt,cls='')=>`<img class="${cls}" src="assets/${file}" alt="${alt}" draggable="false">`;
const detail=id==='faro'?`<div class="screen menu-screen">${img(project.detail,'Реальный экран меню FARO')}</div>`:'';
const object=id==='timepiece'||id==='faro'?`<div class="object-render" data-model="${id}" aria-label="Исходная модель проекта в новой постановке"></div>`:id==='egypt'?`<div class="portal-object">${img('egypt-gateway.png','Исходный резной портал')}</div>`:'';
const secondary=id==='wordflow'?`<div class="phone dictionary-phone">${img(project.detail,'Оригинальный экран словарей Wordflow')}</div>`:'';
document.querySelector('#review').innerHTML=`
 <section class="intro"><div><span class="eyebrow">${project.number} / ЧЕТЫРЕ МИРА</span><h1>${project.title}</h1></div><p>${project.subtitle}</p></section>
 <nav class="project-nav" aria-label="Выбрать проект">${Object.entries(projects).map(([key,p])=>`<a href="?project=${key}" ${key===id?'aria-current="page"':''}><span>${p.number}</span>${p.title}</a>`).join('')}</nav>
 <div class="comparison">
  <section class="source-panel"><div class="panel-label"><span>ИСХОДНЫЙ ЭКРАН</span><a href="assets/${project.original}" target="_blank">Открыть крупно ↗</a></div><div class="source-image">${img(project.original,'Настоящий экран проекта '+project.title)}</div><div class="source-caption"><span>Снят с работающей локальной версии</span><a href="${project.source}" target="_blank" rel="noopener">Открыть проект ↗</a></div><a class="detail-link" href="assets/${project.detail}" target="_blank">${project.detailLabel} ↗</a></section>
  <section class="presentation-panel"><div class="panel-label"><span>ПРЕДЛОЖЕННАЯ ПРЕЗЕНТАЦИЯ</span><a href="?project=${id}${cover?'':'&view=cover'}">${cover?'← К сравнению':'Увеличить ↗'}</a></div>
   <div class="stage" id="presentation"><div class="halo"></div><div class="horizon"></div><div class="floor"></div><div class="plinth"></div>${secondary}
    <div class="${id==='wordflow'?'phone main-phone':'screen main-screen'}">${img(project.screen,'Неизменённый экран '+project.title)}<div class="edge-glint"></div></div>
    ${detail}${object}<div class="object-shadow"></div><div class="stage-caption"><span>${project.number} / ${project.title}</span><span>${id==='wordflow'?'ОРИГИНАЛЬНЫЙ UI':id==='egypt'?'ИСХОДНЫЙ ПОРТАЛ':'ИСХОДНАЯ МОДЕЛЬ'} · НОВАЯ ПОДАЧА</span></div>
   </div>
  </section>
 </div>
 <footer class="review-note"><span class="note-index">СОХРАНЕНО</span><p>${project.note}</p>${id==='faro'?'<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">Pizza · Rigsters · CC BY 4.0</a>':'<span>Экраны и предметы не перерисованы ИИ</span>'}</footer>`;
try {
 if(id==='timepiece'||id==='faro'){
  const {mountObjects}=await import('./objects.js');
  await mountObjects();
 }
 document.body.dataset.ready='true';
} catch(error){document.body.dataset.ready='error';console.error(error);}

/* The single client-facing configuration. Illustrative menu, no real orders. */
window.FARO_CONFIG = {
  brand: { name: 'FARO', tagline: 'CUCINA DI FUOCO', title: 'FARO — пицца и планы на вечер',
    description: 'FARO — пицца, которую хочется разделить. Рассмотрите её со всех сторон и выберите свою из меню.' },
  colors: { ink: '#191b16', paper: '#f1ede2', tomato: '#e66744', muted: '#c5c2b5' },
  story: {
    introLines: ['Из огня.', 'К вашему', 'столу.'],
    introText: 'Пицца, вокруг которой вечер складывается сам.',
    handoffLines: ['Только осталось', 'выбрать.'],
    handoffNote: 'У каждого вечера — своя пицца.',
    closingLines: ['Хороший вечер', 'начинается здесь.'],
    preparation: [
      { id: 'dough', lines: ['Сначала —', 'руками.'], text: 'Мука на столе. Мягкое тесто, которое становится тонкой серединой и неровным, живым бортиком.' },
      { id: 'oven', lines: ['Потом —', 'огонь.'], text: 'Жар печи. Поджаристый край, тёмные пузырьки и моцарелла, которая ещё блестит.' },
      { id: 'table', lines: ['И наконец —', 'вместе.'], text: 'Пицца посередине. Возьмите разные, попробуйте друг у друга. Разговор может подождать ещё один кусочек.' },
    ],
  },
  sizes: [{ id: '30', label: '30 см', multiplier: 1 }, { id: '40', label: '40 см', multiplier: 1.35 }],
  menu: [
    { id: 'prosciutto', name: 'Прошутто', price: 890, category: 'meat', ingredients: 'Прошутто, руккола, моцарелла, шампиньоны, томатный соус', note: 'Солоноватое прошутто, руккола и поджаристый сыр.', image: 'media/menu-session/prosciutto.webp' },
    { id: 'pepperoni', name: 'Пепперони', price: 790, category: 'meat', ingredients: 'Пепперони, моцарелла, томатный соус, свежий базилик', note: 'Поджаренные ломтики пепперони с чуть загнутыми краями.', image: 'media/menu-session/pepperoni.webp' },
    { id: 'margherita', name: 'Маргарита', price: 690, category: 'vegetarian', ingredients: 'Моцарелла, томаты, свежий базилик, оливковое масло', note: 'Поджаристый сыр, томаты и мягкое тесто. Любимая классика.', image: 'media/menu-session/margherita.webp' },
    { id: 'four-cheese', name: 'Четыре сыра', price: 890, category: 'vegetarian', ingredients: 'Моцарелла, горгонзола, пармезан, сливочный сыр', note: 'Сливочная основа и четыре разных сырных характера.', image: 'media/menu-session/four-cheese.webp' },
    { id: 'mushroom', name: 'Грибы и трюфель', price: 850, category: 'vegetarian', ingredients: 'Шампиньоны, моцарелла, сливочный соус, трюфельное масло', note: 'Грибы на сливочной основе. Для тех, кто любит спокойные вкусы.', image: 'media/menu-session/mushroom.webp' },
    { id: 'salsiccia', name: 'Сальсичча', price: 890, category: 'meat', ingredients: 'Пряная колбаска, красный лук, моцарелла, томатный соус', note: 'Пряная колбаска и поджаренные лепестки красного лука.', image: 'media/menu-session/salsiccia.webp' },
  ],
};

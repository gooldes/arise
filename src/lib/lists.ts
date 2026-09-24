// Экран «Списки»: что собрать и куда положить. Группы — по месту, где лежит набор.
// Статьи без галочек сюда не попадают (проверка при отрисовке).

export interface ListRef {
  slug: string
  /** где держать / когда нужен */
  where: string
}

export interface ListGroup {
  title: string
  icon: string
  items: ListRef[]
}

export const LIST_GROUPS: ListGroup[] = [
  {
    title: 'Рюкзаки и наборы — у двери',
    icon: '🎒',
    items: [
      { slug: 'go-bag', where: 'У входной двери, по рюкзаку на взрослого' },
      { slug: 'family-kit', where: 'Рюкзаки на всю семью + домашний запас' },
      { slug: 'edc-kit', where: 'При себе каждый день: карманы, сумка' },
      { slug: 'evacuation-on-foot', where: 'Если уходить пешком' },
    ],
  },
  {
    title: 'Аптечки и лекарства',
    icon: '💊',
    items: [
      { slug: 'first-aid-kit', where: 'Дома, в рюкзаке и в машине' },
      { slug: 'autonomy-medkit', where: 'Дома — запас на месяцы без аптек' },
      { slug: 'essential-medicines', where: 'Какие лекарства и зачем' },
      { slug: 'vet-kit', where: 'Для скота и собак — в хозяйстве' },
    ],
  },
  {
    title: 'Машина',
    icon: '🚗',
    items: [
      { slug: 'car-kit', where: 'В багажнике постоянно' },
      { slug: 'evacuation-by-car', where: 'Если уезжать на машине' },
    ],
  },
  {
    title: 'Дом и запасы',
    icon: '🏠',
    items: [
      { slug: 'stockpile-list', where: 'Кладовая: еда, вода, быт' },
      { slug: 'long-term-reserves', where: 'Запас на год и дольше' },
      { slug: 'home-autonomy-equipment', where: 'Свет, тепло, вода, связь без сетей' },
      { slug: 'shelter-at-home', where: 'Пересидеть дома' },
      { slug: 'city-winter-blackout', where: 'Зима без света и отопления' },
      { slug: 'quarantine-home', where: 'Карантин и эпидемия' },
      { slug: 'child-safety-home', where: 'Безопасность детей дома' },
      { slug: 'pets', where: 'Для домашних животных' },
    ],
  },
  {
    title: 'Лес и поход',
    icon: '🌲',
    items: [
      { slug: 'forest-autonomy-kit', where: 'Полная автономия в лесу' },
      { slug: 'winter-gear', where: 'Зимой: одежда и снаряжение' },
      { slug: 'gear-repair-kit', where: 'Ремнабор — в рюкзаке' },
      { slug: 'gear-choice', where: 'Что купить и на что не тратиться' },
      { slug: 'forest-camp', where: 'Лагерь в лесу' },
      { slug: 'forest-summer', where: 'Лес летом' },
      { slug: 'forest-offseason', where: 'Лес осенью и весной' },
      { slug: 'forest-winter', where: 'Лес зимой' },
      { slug: 'mountains', where: 'Горы' },
    ],
  },
  {
    title: 'Семья и дети',
    icon: '👨‍👩‍👧‍👦',
    items: [
      { slug: 'family-with-kids', where: 'С маленькими детьми' },
      { slug: 'vulnerable-people', where: 'Пожилые, больные, инвалиды' },
    ],
  },
  {
    title: 'Хозяйство и инструмент',
    icon: '🛠️',
    items: [
      { slug: 'homestead-tools', where: 'Инструмент для хозяйства' },
      { slug: 'village-long-term', where: 'Надолго в деревню' },
      { slug: 'weapon-storage', where: 'Хранение оружия' },
      { slug: 'firearm-maintenance', where: 'Набор для чистки оружия' },
    ],
  },
  {
    title: 'Особые ситуации',
    icon: '⚠️',
    items: [
      { slug: 'first-hours', where: 'Первые часы ЧС' },
      { slug: 'city-long-crisis', where: 'Долгий кризис в городе' },
      { slug: 'nuclear-threat', where: 'Ядерная угроза' },
      { slug: 'shelling', where: 'Обстрелы' },
    ],
  },
]

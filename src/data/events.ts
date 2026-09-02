export type EventType =
  | '健走'
  | '太極'
  | '唱歌'
  | '聊天'
  | '球類'
  | '健康活動'
  | '舞蹈'
  | '園藝'
  | '棋藝'
  | '手作'
  | '攝影'
  | '閱讀'
  | '樂器'
  | '志工服務'
  | '寵物同樂'
  | '伸展'
  | '散步'
  | '讀書'
  | '植栽'
  | '其他'

export type Difficulty = '輕鬆' | '一般'
export type Cost = '免費' | '付費'
export type DateFilter = 'today' | 'tomorrow' | 'week' | 'custom'

export interface Park {
  id: string
  name: string
  district: string
  address: string
  meeting: string
  lat?: number
  lng?: number
}

export interface ActivityTypeDefinition {
  key: string
  name: EventType
  group: '動起來' | '交流同樂' | '創作學習' | '公園參與'
  featured: boolean
}

export const fullActivityTypes: ActivityTypeDefinition[] = [
  { key: 'walking', name: '健走', group: '動起來', featured: true },
  { key: 'tai-chi', name: '太極', group: '動起來', featured: true },
  { key: 'singing', name: '唱歌', group: '交流同樂', featured: true },
  { key: 'chatting', name: '聊天', group: '交流同樂', featured: true },
  { key: 'ball-games', name: '球類', group: '動起來', featured: true },
  { key: 'wellness', name: '健康活動', group: '動起來', featured: true },
  { key: 'dancing', name: '舞蹈', group: '動起來', featured: false },
  { key: 'gardening', name: '園藝', group: '創作學習', featured: false },
  { key: 'board-games', name: '棋藝', group: '交流同樂', featured: false },
  { key: 'crafts', name: '手作', group: '創作學習', featured: false },
  { key: 'photography', name: '攝影', group: '創作學習', featured: false },
  { key: 'reading', name: '閱讀', group: '創作學習', featured: false },
  { key: 'instruments', name: '樂器', group: '交流同樂', featured: false },
  { key: 'volunteering', name: '志工服務', group: '公園參與', featured: false },
  { key: 'pets', name: '寵物同樂', group: '公園參與', featured: false },
]

export const activityTypeGroups = ['動起來', '交流同樂', '創作學習', '公園參與'] as const

export interface EventItem {
  id: string
  title: string
  type: EventType
  difficulty: Difficulty
  dateKey: Exclude<DateFilter, 'custom'>
  isoDate: string
  dateLabel: string
  time: string
  park: Park
  spots: number
  maxSpots: number
  cost: Cost
  audience: string
  description: string
  items: string
  image: string
  imageAlt: string
  distanceKm?: number
  organizer: {
    name: string
    role: string
    rating: string
    organized: number
    verified: boolean
  }
}

export const parks: Park[] = [
  {
    id: 'daan-forest',
    name: '大安森林公園',
    district: '台北市大安區',
    address: '台北市大安區新生南路二段 1 號',
    meeting: '捷運大安森林公園站 2 號出口旁廣場',
    lat: 25.0331,
    lng: 121.5354,
  },
  {
    id: 'zhongzheng',
    name: '中正紀念堂園區',
    district: '台北市中正區',
    address: '台北市中正區中山南路 21 號',
    meeting: '大孝門前廣場・露天音樂台',
    lat: 25.0347,
    lng: 121.5218,
  },
  {
    id: 'peace-228',
    name: '二二八和平紀念公園',
    district: '台北市中正區',
    address: '台北市中正區凱達格蘭大道 3 號',
    meeting: '二二八公園・音樂台旁入口',
    lat: 25.0423,
    lng: 121.5152,
  },
  {
    id: 'xiangshan',
    name: '象山公園',
    district: '台北市信義區',
    address: '台北市信義區信義路五段 150 巷',
    meeting: '捷運象山站 2 號出口・公園入口廣場',
    lat: 25.0308,
    lng: 121.5701,
  },
]

export const activityTypes: EventType[] = [
  '健走',
  '太極',
  '唱歌',
  '聊天',
  '球類',
  '健康活動',
  '伸展',
  '散步',
  '手作',
  '舞蹈',
  '棋藝',
  '攝影',
  '讀書',
  '植栽',
  '其他',
]

const walkImage = 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=85'
const taiChiImage = 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=85'
const singImage = 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1200&q=85'
const parkImage = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85'
const friendsImage = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=85'
const movementImage = 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=85'

export const eventSeed: EventItem[] = [
  {
    id: 'morning-walk',
    title: '樂齡晨間健走',
    type: '健走',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '上午 9:00－10:00',
    park: parks[0],
    spots: 6,
    maxSpots: 12,
    cost: '免費',
    audience: '適合可自行步行 30 分鐘者',
    description: '一起用舒服的速度繞公園健走，途中會安排兩次休息。第一次參加也沒關係，發起人會在集合點等大家。',
    items: '飲用水、帽子、毛巾',
    image: walkImage,
    imageAlt: '綠意步道上的健走活動',
    distanceKm: 0.8,
    organizer: { name: '林淑芬', role: '銀髮體適能指導員', rating: '4.8', organized: 23, verified: true },
  },
  {
    id: 'shade-tai-chi',
    title: '樹蔭下舒展太極',
    type: '太極',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '上午 10:30－11:30',
    park: parks[0],
    spots: 3,
    maxSpots: 10,
    cost: '免費',
    audience: '初學者可參加',
    description: '在樹蔭下用簡單的動作舒展身體，初學者可以跟著示範慢慢做。',
    items: '飲用水、薄外套',
    image: taiChiImage,
    imageAlt: '戶外伸展與身體活動',
    distanceKm: 1.2,
    organizer: { name: '陳志明', role: '太極帶領人', rating: '4.7', organized: 12, verified: true },
  },
  {
    id: 'park-singing',
    title: '午後公園歡唱',
    type: '唱歌',
    difficulty: '一般',
    dateKey: 'tomorrow',
    isoDate: '2026-08-28',
    dateLabel: '明天',
    time: '下午 2:00－3:30',
    park: parks[1],
    spots: 8,
    maxSpots: 20,
    cost: '免費',
    audience: '喜歡唱歌、想認識新朋友',
    description: '選幾首熟悉的歌一起唱，不需要準備表演，想聽歌或一起聊天也很歡迎。',
    items: '飲用水、歌本（可選）',
    image: singImage,
    imageAlt: '在戶外一起唱歌的活動',
    distanceKm: 3.8,
    organizer: { name: '黃美玲', role: '社區志工', rating: '4.9', organized: 31, verified: true },
  },
  {
    id: 'leafy-stretch',
    title: '樹下樂活伸展',
    type: '伸展',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '上午 8:30－9:20',
    park: parks[0],
    spots: 5,
    maxSpots: 12,
    cost: '免費',
    audience: '可自行站立或坐姿參加',
    description: '在樹蔭下做溫和伸展，可依自己的體力改用坐姿完成。',
    items: '飲用水、毛巾',
    image: movementImage,
    imageAlt: '在自然環境中進行伸展活動',
    distanceKm: 1.4,
    organizer: { name: '張玉華', role: '樂齡運動志工', rating: '4.8', organized: 18, verified: true },
  },
  {
    id: 'health-breathing',
    title: '公園呼吸與放鬆',
    type: '健康活動',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '上午 11:00－11:45',
    park: parks[0],
    spots: 7,
    maxSpots: 15,
    cost: '免費',
    audience: '初次參加也可以',
    description: '用簡單的呼吸與肩頸活動，讓身體慢慢放鬆。',
    items: '飲用水',
    image: parkImage,
    imageAlt: '陽光灑落的公園綠地',
    distanceKm: 2.1,
    organizer: { name: '許秀蘭', role: '健康促進志工', rating: '4.6', organized: 9, verified: true },
  },
  {
    id: 'banyan-chat',
    title: '榕樹下認識新朋友',
    type: '聊天',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '下午 2:00－3:00',
    park: parks[0],
    spots: 9,
    maxSpots: 16,
    cost: '免費',
    audience: '想聊天、認識新朋友',
    description: '在公園長椅旁輕鬆聊天，沒有固定主題，想聽大家分享也很歡迎。',
    items: '飲用水',
    image: friendsImage,
    imageAlt: '朋友在戶外相聚聊天',
    distanceKm: 1.7,
    organizer: { name: '王麗美', role: '社區關懷志工', rating: '4.9', organized: 27, verified: true },
  },
  {
    id: 'gateball-beginner',
    title: '新手門球體驗',
    type: '球類',
    difficulty: '一般',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '下午 3:30－4:30',
    park: parks[0],
    spots: 4,
    maxSpots: 10,
    cost: '免費',
    audience: '可自行步行並揮桿者',
    description: '先認識門球器材與基本規則，再用輕鬆方式分組練習。',
    items: '飲用水、運動鞋',
    image: movementImage,
    imageAlt: '戶外運動活動',
    distanceKm: 2.8,
    organizer: { name: '李國榮', role: '門球社帶領人', rating: '4.7', organized: 16, verified: true },
  },
  {
    id: 'easy-stroll',
    title: '黃昏慢慢走',
    type: '散步',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '下午 5:00－5:50',
    park: parks[0],
    spots: 11,
    maxSpots: 18,
    cost: '免費',
    audience: '想用輕鬆速度散步',
    description: '沿平坦步道慢慢散步，途中會停下休息與欣賞公園景色。',
    items: '飲用水、帽子',
    image: walkImage,
    imageAlt: '公園中的平坦步道',
    distanceKm: 2.5,
    organizer: { name: '周美雲', role: '社區健走隊長', rating: '4.8', organized: 21, verified: true },
  },
  {
    id: 'peace-chess',
    title: '午後公園棋聚',
    type: '棋藝',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '下午 2:30－4:00',
    park: parks[2],
    spots: 6,
    maxSpots: 12,
    cost: '免費',
    audience: '會基本規則即可',
    description: '備有象棋與跳棋，可自由選擇對手，旁觀聊天也很歡迎。',
    items: '個人飲用水',
    image: parkImage,
    imageAlt: '公園樹蔭與休憩空間',
    distanceKm: 2.9,
    organizer: { name: '吳清泉', role: '社區棋藝同好', rating: '4.6', organized: 14, verified: true },
  },
  {
    id: 'park-dance',
    title: '明早公園律動',
    type: '舞蹈',
    difficulty: '一般',
    dateKey: 'tomorrow',
    isoDate: '2026-08-28',
    dateLabel: '明天',
    time: '上午 9:30－10:30',
    park: parks[0],
    spots: 8,
    maxSpots: 16,
    cost: '免費',
    audience: '喜歡跟著音樂活動',
    description: '使用熟悉的旋律帶領簡單律動，可依體力調整動作幅度。',
    items: '飲用水、運動鞋',
    image: movementImage,
    imageAlt: '跟著音樂進行團體律動',
    distanceKm: 1.3,
    organizer: { name: '蔡月娥', role: '樂齡律動帶領人', rating: '4.8', organized: 25, verified: true },
  },
  {
    id: 'peace-handcraft',
    title: '樹葉拓印小手作',
    type: '手作',
    difficulty: '輕鬆',
    dateKey: 'tomorrow',
    isoDate: '2026-08-28',
    dateLabel: '明天',
    time: '下午 2:00－3:00',
    park: parks[2],
    spots: 5,
    maxSpots: 10,
    cost: '付費',
    audience: '喜歡手作與自然素材',
    description: '利用公園落葉完成簡單拓印，材料由發起人統一準備。',
    items: '老花眼鏡（如需要）',
    image: friendsImage,
    imageAlt: '在戶外一起進行手作活動',
    distanceKm: 3.2,
    organizer: { name: '鄭雅惠', role: '手作課程帶領人', rating: '4.9', organized: 20, verified: true },
  },
  {
    id: 'plant-sharing',
    title: '公園植栽交換會',
    type: '植栽',
    difficulty: '輕鬆',
    dateKey: 'week',
    isoDate: '2026-08-30',
    dateLabel: '本週日',
    time: '上午 10:00－11:30',
    park: parks[1],
    spots: 12,
    maxSpots: 24,
    cost: '免費',
    audience: '喜歡植物與園藝交流',
    description: '帶一盆小植物或空手來都可以，一起交換種植經驗。',
    items: '可交換的小植物（選填）',
    image: parkImage,
    imageAlt: '公園裡的綠色植栽',
    distanceKm: 4.2,
    organizer: { name: '郭明珠', role: '都市園藝同好', rating: '4.7', organized: 11, verified: true },
  },
  {
    id: 'xiangshan-reading',
    title: '樹下讀書分享',
    type: '讀書',
    difficulty: '輕鬆',
    dateKey: 'week',
    isoDate: '2026-08-29',
    dateLabel: '本週六',
    time: '下午 3:00－4:00',
    park: parks[3],
    spots: 7,
    maxSpots: 12,
    cost: '免費',
    audience: '想分享最近讀到的內容',
    description: '每人用幾分鐘介紹一本書，也可以只來聽大家分享。',
    items: '想分享的書（選填）',
    image: friendsImage,
    imageAlt: '在公園裡一起閱讀交流',
    distanceKm: 5.8,
    organizer: { name: '何文雄', role: '社區讀書會成員', rating: '4.8', organized: 17, verified: true },
  },
]

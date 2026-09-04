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
  image?: string
  imageAlt?: string
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
    id: 'civic-square',
    name: '市民廣場（草悟道）',
    district: '台中市西區',
    address: '台中市西區公益路 163-1 號',
    meeting: '市民廣場大草坪・公益路側入口步道',
    lat: 24.1507,
    lng: 120.6632,
  },
  {
    id: 'ntmofa-park',
    name: '國美館戶外園區',
    district: '台中市西區',
    address: '台中市西區五權西路一段 2 號',
    meeting: '國美館大門前雕塑廣場・碑林步道口',
    lat: 24.1412,
    lng: 120.6625,
  },
  {
    id: 'art-parkway',
    name: '美術園道',
    district: '台中市西區',
    address: '台中市西區五權西三街與五權西四街綠園道',
    meeting: '美術園道中央木棧道景觀涼亭前',
    lat: 24.1378,
    lng: 120.6617,
  },
  {
    id: 'chonglun-park',
    name: '崇倫公園',
    district: '台中市西區',
    address: '台中市西區南屯路一段 132 號',
    meeting: '崇倫公園大涼亭與兒童遊戲區步道口',
    lat: 24.1336,
    lng: 120.6558,
  },
  {
    id: 'liuchuan-riverside',
    name: '柳川水岸步道公園',
    district: '台中市西區',
    address: '台中市西區柳川東路二段水岸步道',
    meeting: '柳川水岸親水步道・民權路景觀橋下',
    lat: 24.1419,
    lng: 120.6728,
  },
  {
    id: 'zhongxin-park',
    name: '忠信公園',
    district: '台中市西區',
    address: '台中市西區林森路 163 號',
    meeting: '忠信公園活動中心前木蔭廣場',
    lat: 24.1408,
    lng: 120.6681,
  },
  {
    id: 'calligraphy-greenway',
    name: '勤美草悟道綠園道',
    district: '台中市西區',
    address: '台中市西區中興街與館前路',
    meeting: '勤美誠品前水景綠地廣場',
    lat: 24.1512,
    lng: 120.6637,
  },
  {
    id: 'dongsheng-park',
    name: '東昇公園',
    district: '台中市西區',
    address: '台中市西區自治街 11 號',
    meeting: '東昇公園入口大榕樹下休憩區',
    lat: 24.1394,
    lng: 120.6698,
  },
  {
    id: 'wenxin-forest-park',
    name: '文心森林公園',
    district: '台中市南屯區',
    address: '台中市南屯區文心路一段 289 號',
    meeting: '圓滿戶外劇場正門前廣場',
    lat: 24.1472,
    lng: 120.6444,
  },
  {
    id: 'taichung-maple',
    name: '秋紅谷景觀生態公園',
    district: '台中市西屯區',
    address: '台中市西屯區朝富路 30 號',
    meeting: '景觀水池旁木棧道入口',
    lat: 24.1672,
    lng: 120.6389,
  },
  {
    id: 'taichung-park',
    name: '台中公園',
    district: '台中市北區',
    address: '台中市北區公園路 37 號',
    meeting: '湖心亭正前方廣場',
    lat: 24.1444,
    lng: 120.6850,
  },
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
    id: 'banqiao-wanping',
    name: '萬坪都會公園',
    district: '新北市板橋區',
    address: '新北市板橋區新府路 1 號',
    meeting: '捷運板橋站 1 號出口草坪廣場',
    lat: 25.0141,
    lng: 121.4638,
  },
  {
    id: 'kaohsiung-weiwuying',
    name: '衛武營都會公園',
    district: '高雄市鳳山區',
    address: '高雄市鳳山區輜汽路 281 號',
    meeting: '捷運衛武營站 6 號出口大草坪',
    lat: 22.6225,
    lng: 120.3411,
  },
  {
    id: 'kaohsiung-central',
    name: '中央公園',
    district: '高雄市前金區',
    address: '高雄市前金區中華三路 6 號',
    meeting: '捷運中央公園站 1 號出口水廣場',
    lat: 22.6247,
    lng: 120.3012,
  },
  {
    id: 'tainan-park',
    name: '台南公園',
    district: '台南市北區',
    address: '台南市北區公園路 356 號',
    meeting: '台南公園燕潭旁涼亭',
    lat: 23.0019,
    lng: 120.2131,
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
    id: 'civic-morning-walk',
    title: '草悟道晨光活力健走',
    type: '健走',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '上午 9:00－10:00',
    park: parks[0], // 市民廣場（草悟道）
    spots: 6,
    maxSpots: 12,
    cost: '免費',
    audience: '適合可自行步行 30 分鐘者',
    description: '繞行市民廣場大草坪與綠園道林蔭步道，速度溫和舒適，途中安排兩次補水休息。',
    items: '飲用水、遮陽帽、毛巾',
    image: walkImage,
    imageAlt: '市民廣場草悟道綠意步道上的健走活動',
    distanceKm: 0.5,
    organizer: { name: '林淑芬', role: '銀髮體適能指導員', rating: '4.8', organized: 23, verified: true },
  },
  {
    id: 'ntmofa-tai-chi',
    title: '國美館雕塑園區舒展太極',
    type: '太極',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '上午 10:30－11:30',
    park: parks[1], // 國美館戶外園區
    spots: 5,
    maxSpots: 12,
    cost: '免費',
    audience: '初學者與樂齡長輩皆宜',
    description: '在國美館碑林與大樹蔭下做基礎鬆身與八段錦，初學者可跟著示範慢慢練習。',
    items: '飲用水、薄外套、防蚊液',
    image: taiChiImage,
    imageAlt: '國美館園區樹蔭下的晨間太極伸展',
    distanceKm: 0.8,
    organizer: { name: '陳志明', role: '太極養生帶領人', rating: '4.7', organized: 12, verified: true },
  },
  {
    id: 'art-parkway-singing',
    title: '美術園道午後歡唱同樂',
    type: '唱歌',
    difficulty: '一般',
    dateKey: 'tomorrow',
    isoDate: '2026-08-28',
    dateLabel: '明天',
    time: '下午 2:00－3:30',
    park: parks[2], // 美術園道
    spots: 8,
    maxSpots: 20,
    cost: '免費',
    audience: '熱愛民歌經典與老歌同好',
    description: '在五權西三街綠園道木棧涼亭下哼唱熟悉旋律，想聽歌或聊天也很歡迎。',
    items: '個人隨身飲用水、歌本（選填）',
    image: singImage,
    imageAlt: '在美術園道戶外一起唱歌的活動',
    distanceKm: 1.1,
    organizer: { name: '黃美玲', role: '社區同樂志工', rating: '4.9', organized: 31, verified: true },
  },
  {
    id: 'chonglun-stretch',
    title: '崇倫公園樂活伸展操',
    type: '伸展',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '上午 8:30－9:20',
    park: parks[3], // 崇倫公園
    spots: 5,
    maxSpots: 12,
    cost: '免費',
    audience: '可自行站立或坐姿參加',
    description: '在崇倫公園涼亭旁進行溫和肩頸與四肢伸展，可依體力採坐姿進行。',
    items: '飲用水、運動毛巾',
    image: movementImage,
    imageAlt: '在崇倫公園進行戶外伸展活動',
    distanceKm: 1.4,
    organizer: { name: '張玉華', role: '樂齡健康運動志工', rating: '4.8', organized: 18, verified: true },
  },
  {
    id: 'liuchuan-breathing',
    title: '柳川水岸漫步與呼吸放鬆',
    type: '健康活動',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '上午 11:00－11:45',
    park: parks[4], // 柳川水岸步道公園
    spots: 7,
    maxSpots: 15,
    cost: '免費',
    audience: '想舒緩日常壓力者',
    description: '漫步在柳川親水步道旁，配合微風進行調節呼吸與肩頸放鬆練習。',
    items: '飲用水、輕便步鞋',
    image: parkImage,
    imageAlt: '柳川水岸步道親水綠地',
    distanceKm: 1.3,
    organizer: { name: '許秀蘭', role: '健康促進志工', rating: '4.6', organized: 9, verified: true },
  },
  {
    id: 'zhongxin-chat',
    title: '忠信公園大樹下話家常',
    type: '聊天',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '下午 2:00－3:00',
    park: parks[5], // 忠信公園
    spots: 9,
    maxSpots: 16,
    cost: '免費',
    audience: '想聊天、認識西區在地新朋友',
    description: '在忠信公園長椅大樹下輕鬆喝茶聊天，無特定主題，歡迎來聽大家分享。',
    items: '個人水壺、環保杯',
    image: friendsImage,
    imageAlt: '鄰居朋友在忠信公園相聚聊天',
    distanceKm: 0.9,
    organizer: { name: '王麗美', role: '西區社區關懷志工', rating: '4.9', organized: 27, verified: true },
  },
  {
    id: 'civic-gateball',
    title: '市民廣場草地門球新手體驗',
    type: '球類',
    difficulty: '一般',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '下午 3:30－4:30',
    park: parks[0], // 市民廣場
    spots: 4,
    maxSpots: 10,
    cost: '免費',
    audience: '想體驗門球運動的樂齡夥伴',
    description: '由教練介紹門球基本規則與推桿技巧，再進行輕鬆好玩的分組友誼練習。',
    items: '飲用水、平底運動鞋',
    image: movementImage,
    imageAlt: '草地上進行門球揮桿體驗',
    distanceKm: 0.5,
    organizer: { name: '李國榮', role: '台中門球同好會長', rating: '4.7', organized: 16, verified: true },
  },
  {
    id: 'greenway-stroll',
    title: '勤美綠園道黃昏慢慢走',
    type: '散步',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '下午 5:00－5:50',
    park: parks[6], // 勤美草悟道綠園道
    spots: 11,
    maxSpots: 18,
    cost: '免費',
    audience: '想用愜意步伐散步吹風者',
    description: '傍晚時分沿著草悟道平坦樹蔭步道散步，邊走邊欣賞街區藝文風景。',
    items: '飲用水、輕便衣物',
    image: walkImage,
    imageAlt: '勤美草悟道平坦舒適的林蔭步道',
    distanceKm: 0.6,
    organizer: { name: '周美雲', role: '草悟道健走隊長', rating: '4.8', organized: 21, verified: true },
  },
  {
    id: 'dongsheng-chess',
    title: '東昇公園榕樹下棋聚',
    type: '棋藝',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '下午 2:30－4:00',
    park: parks[7], // 東昇公園
    spots: 6,
    maxSpots: 12,
    cost: '免費',
    audience: '會基本象棋、跳棋或圍棋規則皆可',
    description: '備有象棋與五子棋，現場自由配對切磋，旁觀觀戰聊天也非常歡迎！',
    items: '個人飲用水、老花眼鏡',
    image: parkImage,
    imageAlt: '公園樹蔭下石桌下棋休憩空間',
    distanceKm: 1.0,
    organizer: { name: '吳清泉', role: '社區棋藝社幹事', rating: '4.6', organized: 14, verified: true },
  },
  {
    id: 'civic-dance',
    title: '市民廣場早晨元氣律動',
    type: '舞蹈',
    difficulty: '一般',
    dateKey: 'tomorrow',
    isoDate: '2026-08-28',
    dateLabel: '明天',
    time: '上午 9:30－10:30',
    park: parks[0], // 市民廣場
    spots: 8,
    maxSpots: 16,
    cost: '免費',
    audience: '喜歡輕快音樂與身體律動者',
    description: '播放經典熟悉的金曲旋律，帶領簡單輕快的排舞與律動，動作幅度隨心調整。',
    items: '飲用水、防滑運動鞋',
    image: movementImage,
    imageAlt: '市民廣場跟著音樂進行團體律動',
    distanceKm: 0.5,
    organizer: { name: '蔡月娥', role: '樂齡律動帶領人', rating: '4.8', organized: 25, verified: true },
  },
  {
    id: 'ntmofa-handcraft',
    title: '國美館綠地樹葉拓印手作',
    type: '手作',
    difficulty: '輕鬆',
    dateKey: 'tomorrow',
    isoDate: '2026-08-28',
    dateLabel: '明天',
    time: '下午 2:00－3:00',
    park: parks[1], // 國美館
    spots: 5,
    maxSpots: 10,
    cost: '付費',
    audience: '喜歡自然美學與文創手作者',
    description: '撿拾國美館草地上的落葉進行天然拓印創作，材料包由發起人統一準備。',
    items: '老花眼鏡（如需要）',
    image: friendsImage,
    imageAlt: '在戶外草地上一起進行植物拓印手作',
    distanceKm: 0.8,
    organizer: { name: '鄭雅惠', role: '美學手作指導員', rating: '4.9', organized: 20, verified: true },
  },
  {
    id: 'art-parkway-plant-sharing',
    title: '美術園道綠植盆栽交流會',
    type: '植栽',
    difficulty: '輕鬆',
    dateKey: 'week',
    isoDate: '2026-08-30',
    dateLabel: '本週日',
    time: '上午 10:00－11:30',
    park: parks[2], // 美術園道
    spots: 12,
    maxSpots: 24,
    cost: '免費',
    audience: '熱愛園藝種植與多肉植物夥伴',
    description: '帶一盆自己種的小植栽或空手前來都可以，互相交流西區陽台綠化心得。',
    items: '自備可交換的小植栽（選填）',
    image: parkImage,
    imageAlt: '美術園道綠蔭下的盆栽交流聚會',
    distanceKm: 1.1,
    organizer: { name: '郭明珠', role: '都市園藝同好會', rating: '4.7', organized: 11, verified: true },
  },
  {
    id: 'greenway-reading',
    title: '草悟道樹下讀書共讀會',
    type: '讀書',
    difficulty: '輕鬆',
    dateKey: 'week',
    isoDate: '2026-08-29',
    dateLabel: '本週六',
    time: '下午 3:00－4:00',
    park: parks[6], // 勤美草悟道
    spots: 7,
    maxSpots: 12,
    cost: '免費',
    audience: '喜愛閱讀與藝文生活者',
    description: '每人輪流用三到五分鐘分享最近讀到的一本好書，也可以純粹聆聽交流。',
    items: '推薦書目一本（選填）',
    image: friendsImage,
    imageAlt: '在草悟道大樹下一起閱讀交流',
    distanceKm: 0.6,
    organizer: { name: '何文雄', role: '台中人文讀書會', rating: '4.8', organized: 17, verified: true },
  },
  {
    id: 'wenxin-evening-walk',
    title: '文心森林公園黃昏環園健走',
    type: '健走',
    difficulty: '一般',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '下午 05:00－06:00',
    park: parks[8], // 文心森林公園
    spots: 10,
    maxSpots: 20,
    cost: '免費',
    audience: '鄰近南屯與西區生活圈夥伴',
    description: '環繞圓滿戶外劇場與文心森林公園大草坪快走兩圈，出汗舒暢！',
    items: '健走水壺、休閒運動鞋',
    image: walkImage,
    imageAlt: '文心森林公園夕陽下的健走步道',
    distanceKm: 2.2,
    organizer: { name: '陳建邦', role: '樂活健走團', rating: '4.9', organized: 30, verified: true },
  },
  {
    id: 'taichung-maple-taichi',
    title: '秋紅谷湖畔晨間養生太極',
    type: '太極',
    difficulty: '一般',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '上午 08:00－09:00',
    park: parks[9], // 秋紅谷
    spots: 8,
    maxSpots: 16,
    cost: '免費',
    audience: '對養生太極有興趣的初學者',
    description: '在秋紅谷景觀湖畔進行八段錦與基礎太極鬆身，舒展筋骨。',
    items: '寬鬆運動服裝、毛巾',
    image: movementImage,
    imageAlt: '秋紅谷景觀湖畔進行晨間太極伸展',
    distanceKm: 2.8,
    organizer: { name: '林志遠', role: '台中養生太極班長', rating: '4.9', organized: 42, verified: true },
  },
  {
    id: 'taichung-park-singing',
    title: '台中公園湖心亭金曲歡唱會',
    type: '唱歌',
    difficulty: '輕鬆',
    dateKey: 'today',
    isoDate: '2026-08-27',
    dateLabel: '今天',
    time: '下午 03:00－04:30',
    park: parks[10], // 台中公園
    spots: 12,
    maxSpots: 25,
    cost: '免費',
    audience: '熱愛經典民歌與台語老歌同好',
    description: '攜帶便攜音箱，在湖心亭前大樹下一同哼唱經典好歌交流！',
    items: '個人隨身水壺、摺疊小椅',
    image: friendsImage,
    imageAlt: '台中公園樹蔭下熱鬧的唱歌聚會',
    distanceKm: 2.1,
    organizer: { name: '高玉梅', role: '台中懷舊金曲社', rating: '4.8', organized: 19, verified: true },
  },
]

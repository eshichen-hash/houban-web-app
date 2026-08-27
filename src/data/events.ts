export type EventType =
  | '健走'
  | '太極'
  | '唱歌'
  | '聊天'
  | '球類'
  | '健康活動'
  | '伸展'
  | '散步'
  | '手作'
  | '舞蹈'
  | '棋藝'
  | '攝影'
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
}

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
    meeting: '公園入口',
  },
  {
    id: 'zhongzheng',
    name: '中正紀念堂園區',
    district: '台北市中正區',
    address: '台北市中正區中山南路 21 號',
    meeting: '露天音樂台右側草地',
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
    organizer: { name: '黃美玲', role: '社區志工', rating: '4.9', organized: 31, verified: true },
  },
]

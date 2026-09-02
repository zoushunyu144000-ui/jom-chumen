import type { CategoryId, CityId, Currency, EventRecord } from "@/lib/types";

export const CITIES: { id: CityId; name: string; nameEn: string }[] = [
  { id: "all", name: "全部城市", nameEn: "All" },
  { id: "penang", name: "槟城", nameEn: "Penang" },
  { id: "kl", name: "吉隆坡", nameEn: "Kuala Lumpur" },
  { id: "jb", name: "新山", nameEn: "Johor Bahru" },
  { id: "singapore", name: "新加坡", nameEn: "Singapore" },
  { id: "bangkok", name: "曼谷", nameEn: "Bangkok" },
];

export const CATEGORIES: {
  id: CategoryId;
  name: string;
}[] = [
  { id: "all", name: "全部" },
  { id: "frisbee", name: "飞盘" },
  { id: "photo", name: "摄影" },
  { id: "hike", name: "徒步" },
  { id: "reading", name: "读书" },
  { id: "citywalk", name: "Citywalk" },
  { id: "water", name: "浆板" },
  { id: "racket", name: "球类" },
  { id: "camp", name: "露营" },
  { id: "talk", name: "深聊" },
  { id: "yoga", name: "瑜伽" },
];

export function cityName(id: CityId) {
  return CITIES.find((c) => c.id === id)?.name ?? id;
}

export function categoryName(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

export const EVENT_CITIES = CITIES.filter((c) => c.id !== "all") as {
  id: Exclude<CityId, "all">;
  name: string;
  nameEn: string;
}[];

export function currencyForCity(city: CityId): Currency {
  if (city === "singapore") return "SGD";
  if (city === "bangkok") return "THB";
  return "MYR";
}

export const CLUB_SEED: {
  id: string;
  name: string;
  bio: string;
  city: Exclude<CityId, "all">;
  coverUrl: string;
  eventSlugs: string[];
}[] = [
  {
    id: "club-penang-disc",
    name: "槟城飞盘社",
    bio: "海边草地、零基础也能玩。每周至少一局。",
    city: "penang",
    coverUrl: "/covers/frisbee-penang.jpg",
    eventSlugs: ["frisbee-penang-sunset", "frisbee-penang-aug"],
  },
  {
    id: "club-georgetown-lens",
    name: "乔治城镜头",
    bio: "巷弄、壁画、晚市。手机和相机都欢迎。",
    city: "penang",
    coverUrl: "/covers/photo-georgetown.jpg",
    eventSlugs: ["photo-georgetown"],
  },
  {
    id: "club-hill-walk",
    name: "山海徒步",
    bio: "槟岛山和山脚露营，天亮之前出门。",
    city: "penang",
    coverUrl: "/covers/hike-penang.jpg",
    eventSlugs: ["hike-penang-hill", "camp-genting-foothill"],
  },
  {
    id: "club-zhou-read",
    name: "阿周读书会",
    bio: "哲学、心理、深聊。小局，认真听完再说话。",
    city: "penang",
    coverUrl: "/covers/reading-club.jpg",
    eventSlugs: ["reading-cwg", "talk-nanyang-home", "reading-aug"],
  },
  {
    id: "club-sea-day",
    name: "海边日课",
    bio: "瑜伽、桨板，把一天从海边开始。",
    city: "penang",
    coverUrl: "/covers/yoga-beach.jpg",
    eventSlugs: ["yoga-beach-sunrise", "sup-penang-dusk"],
  },
  {
    id: "club-kl-walk",
    name: "吉隆坡夜走",
    bio: "茨厂街到后巷，把城市走热。",
    city: "kl",
    coverUrl: "/covers/citywalk-kl.jpg",
    eventSlugs: ["citywalk-kl-petaling"],
  },
  {
    id: "club-jb-racket",
    name: "新山球局",
    bio: "周末羽毛球，约满就开。",
    city: "jb",
    coverUrl: "/covers/badminton.jpg",
    eventSlugs: ["badminton-jb-weekend"],
  },
  {
    id: "club-sg-disc",
    name: "East Coast 飞盘",
    bio: "东海岸公园固定局，英文/中文都行。",
    city: "singapore",
    coverUrl: "/covers/frisbee-sg.jpg",
    eventSlugs: ["frisbee-sg-eastcoast"],
  },
  {
    id: "club-bkk-night",
    name: "曼谷夜走",
    bio: "Yaowarat 一带，吃一路走到天亮。",
    city: "bangkok",
    coverUrl: "/covers/citywalk-bkk.jpg",
    eventSlugs: ["citywalk-bkk-night"],
  },
];


type Seed = Omit<
  EventRecord,
  | "booked"
  | "remaining"
  | "body"
  | "clubId"
  | "clubName"
  | "userId"
  | "open"
  | "whatsapp"
  | "wechatQr"
  | "alipayQr"
  | "tngQr"
  | "lat"
  | "lng"
>;

export const EVENT_SEED: Seed[] = [
  {
    id: "frisbee-penang-sunset",
    slug: "frisbee-penang-sunset",
    title: "白沙日落飞盘局",
    subtitle: "海边草地，零基础也能玩到天黑",
    category: "frisbee",
    city: "penang",
    venue: "Batu Ferringhi 海边草地",
    address: "Batu Ferringhi Beach, Penang",
    startsAt: "2026-09-06T16:30:00+08:00",
    endsAt: "2026-09-06T18:30:00+08:00",
    currency: "MYR",
    price: 45,
    capacity: 18,
    sold: 11,
    coverUrl: "/covers/frisbee-penang.jpg",
    description:
      "傍晚在白沙海滩的草地上开一局飞盘。先热身和规则，再分组打比赛，打完一起去旁边吃椰浆饭。风大时改短传局，不会硬上。",
    highlights: ["飞盘与基础教学", "分组比赛", "局后简餐AA另计", "请穿运动鞋，自备水杯"],
    hostName: "阿凯",
    hostNote: "第一次来的人跟我站一起，我带你入门。",
    level: "newbie",
  },
  {
    id: "frisbee-penang-aug",
    slug: "frisbee-penang-aug",
    title: "八月白沙飞盘回顾局",
    subtitle: "已经打完的周末局，留给俱乐部往期",
    category: "frisbee",
    city: "penang",
    venue: "Batu Ferringhi 海边草地",
    address: "Batu Ferringhi Beach, Penang",
    startsAt: "2026-08-16T16:30:00+08:00",
    endsAt: "2026-08-16T18:30:00+08:00",
    currency: "MYR",
    price: 45,
    capacity: 18,
    sold: 18,
    coverUrl: "/covers/frisbee-penang.jpg",
    description: "八月的一局，打完吃了椰浆饭。留给后来的人看往期。",
    highlights: ["飞盘", "局后简餐"],
    hostName: "阿凯",
    hostNote: "往期活动。",
    level: "newbie",
  },
  {
    id: "reading-aug",
    slug: "reading-aug",
    title: "八月读书会：知足这一章",
    subtitle: "已经结束的小局",
    category: "reading",
    city: "penang",
    venue: "USM 附近咖啡馆",
    address: "Gelugor, Penang",
    startsAt: "2026-08-23T19:30:00+08:00",
    endsAt: "2026-08-23T21:30:00+08:00",
    currency: "MYR",
    price: 0,
    capacity: 8,
    sold: 8,
    coverUrl: "/covers/reading-club.jpg",
    description: "一起读完「知足」相关章节，聊到打烊。",
    highlights: ["文本分享", "圆桌讨论"],
    hostName: "阿周",
    hostNote: "往期活动。",
    level: "all",
  },
  {
    id: "photo-georgetown",
    slug: "photo-georgetown",
    title: "乔治城黄金时段人文摄影",
    subtitle: "巷弄、壁画、晚市，走一条会出片的路",
    category: "photo",
    city: "penang",
    venue: "亚美尼亚街集合",
    address: "Armenian Street, George Town, Penang",
    startsAt: "2026-09-07T16:00:00+08:00",
    endsAt: "2026-09-07T19:00:00+08:00",
    currency: "MYR",
    price: 68,
    capacity: 12,
    sold: 8,
    coverUrl: "/covers/photo-georgetown.jpg",
    description:
      "从亚美尼亚街走到龙山堂，沿路拍壁画、店面和行人。讲解构图和自然光，不拼器材。手机和相机都欢迎。结束后在附近咖啡店互评三张照片。",
    highlights: ["路线带路", "自然光与构图讲解", "互评小会", "不强制器材"],
    hostName: "林予",
    hostNote: "我会给每人至少一次被拍的机会。",
    level: "all",
  },
  {
    id: "hike-penang-hill",
    slug: "hike-penang-hill",
    title: "槟岛山晨雾徒步",
    subtitle: "天还没热，把山走完",
    category: "hike",
    city: "penang",
    venue: "Moon Gate 入口",
    address: "Moon Gate, Jalan Stesen, Penang Hill",
    startsAt: "2026-09-13T07:00:00+08:00",
    endsAt: "2026-09-13T10:30:00+08:00",
    currency: "MYR",
    price: 35,
    capacity: 16,
    sold: 9,
    coverUrl: "/covers/hike-penang.jpg",
    description:
      "从 Moon Gate 走林道上山，节奏偏慢，适合想出汗但不想虐腿的人。山顶短暂停留看雾，原路或环形返回。雨天改期，行前一晚通知。",
    highlights: ["领队带路", "节奏友好", "雨天改期", "请自备水和防滑鞋"],
    hostName: "老周",
    hostNote: "不要穿新鞋。到了先等齐，不丢人。",
    level: "all",
  },
  {
    id: "reading-cwg",
    slug: "reading-cwg",
    title: "读书会：知足，和真正的够",
    subtitle: "《与神对话》遇见《道德经》",
    category: "reading",
    city: "penang",
    venue: "Gelugor 一间靠窗的店",
    address: "Jalan Sultan Azlan Shah, Gelugor, Penang",
    startsAt: "2026-09-14T15:00:00+08:00",
    endsAt: "2026-09-14T17:30:00+08:00",
    currency: "MYR",
    price: 20,
    capacity: 10,
    sold: 6,
    coverUrl: "/covers/reading-club.jpg",
    description:
      "不需要读完全书。围绕「够」和「关系里的道」聊两个小时。有人带段落，有人带生活里的事。手机静音，咖啡自理。",
    highlights: ["选段打印", "圆桌深聊", "不强制发言", "含座位，饮品自理"],
    hostName: "阿周",
    hostNote: "来的人不用准备漂亮答案，把真实的困惑带来就好。",
    level: "all",
  },
  {
    id: "yoga-beach-sunrise",
    slug: "yoga-beach-sunrise",
    title: "白沙日出瑜伽",
    subtitle: "太阳出来之前，把身体打开",
    category: "yoga",
    city: "penang",
    venue: "Batu Ferringhi 沙滩",
    address: "Batu Ferringhi Beach, Penang",
    startsAt: "2026-09-12T06:45:00+08:00",
    endsAt: "2026-09-12T08:00:00+08:00",
    currency: "MYR",
    price: 55,
    capacity: 14,
    sold: 10,
    coverUrl: "/covers/yoga-beach.jpg",
    description:
      "日出前在沙滩做一轮温和流瑜伽，适合久坐和睡眠不好的人。垫子可租，风大时改草地。结束后可自行去海边早餐。",
    highlights: ["垫子可租 RM10", "温和流程", "适合新手", "请提前到场 10 分钟"],
    hostName: "Siti",
    hostNote: "动作跟不上就躺着听海，也算来过。",
    level: "newbie",
  },
  {
    id: "talk-nanyang-home",
    slug: "talk-nanyang-home",
    title: "深聊局：在南洋安家",
    subtitle: "签证、房租、朋友，和为什么留下来",
    category: "talk",
    city: "penang",
    venue: "Georgetown 小阁楼",
    address: "Love Lane, George Town, Penang",
    startsAt: "2026-09-19T19:30:00+08:00",
    endsAt: "2026-09-19T21:30:00+08:00",
    currency: "MYR",
    price: 15,
    capacity: 12,
    sold: 4,
    coverUrl: "/covers/deep-talk.jpg",
    description:
      "给刚到马来西亚、或准备长留的人。不贩卖成功学。聊签证节奏、合租、孤独和怎么遇到同频的人。人少，才能说完。",
    highlights: ["圆桌深聊", "人数严格上限", "茶水", "可匿名听"],
    hostName: "阿周",
    hostNote: "这局不录音。你说的话只留在这张桌子上。",
    level: "all",
  },
  {
    id: "sup-penang-dusk",
    slug: "sup-penang-dusk",
    title: "海峡黄昏浆板",
    subtitle: "第一次站上板，也够看完日落",
    category: "water",
    city: "penang",
    venue: "海峡码头",
    address: "Straits Quay, Tanjung Tokong, Penang",
    startsAt: "2026-09-20T17:00:00+08:00",
    endsAt: "2026-09-20T18:45:00+08:00",
    currency: "MYR",
    price: 88,
    capacity: 10,
    sold: 7,
    coverUrl: "/covers/sup-sunset.jpg",
    description:
      "含板、桨、救生衣和岸上教学。风浪过大改期。会游泳更安心，不会也有人在旁边。拍日落请把手机放防水袋。",
    highlights: ["器材全包", "岸上教学", "救生衣", "风浪过大改期"],
    hostName: "Ben",
    hostNote: "掉水里很正常。笑一下，再爬上来。",
    level: "newbie",
  },
  {
    id: "citywalk-kl-petaling",
    slug: "citywalk-kl-petaling",
    title: "茨厂街夜走",
    subtitle: "免费。灯、烟火气、和一条老街",
    category: "citywalk",
    city: "kl",
    venue: "哥打拉沙马那地铁口",
    address: "Raja Chulan exit, towards Petaling Street, Kuala Lumpur",
    startsAt: "2026-09-11T19:00:00+08:00",
    endsAt: "2026-09-11T21:00:00+08:00",
    currency: "MYR",
    price: 0,
    capacity: 24,
    sold: 13,
    coverUrl: "/covers/citywalk-kl.jpg",
    description:
      "从地铁口走到茨厂街、中央市场一带。边走边讲这条街的层叠历史。吃喝自理，局后不强制聚餐。免费报名，占名额请来。",
    highlights: ["免费", "路线讲解", "步程约 4km", "饮食自理"],
    hostName: "小满",
    hostNote: "穿能走路的鞋。我们会等红灯，不会狂奔。",
    level: "all",
  },
  {
    id: "camp-genting-foothill",
    slug: "camp-genting-foothill",
    title: "云顶山脚周末露营",
    subtitle: "一晚帐篷，两顿火，周日下山",
    category: "camp",
    city: "kl",
    venue: "Gombak 营地",
    address: "Gombak, Selangor",
    startsAt: "2026-09-26T15:00:00+08:00",
    endsAt: "2026-09-27T11:00:00+08:00",
    currency: "MYR",
    price: 128,
    capacity: 16,
    sold: 12,
    coverUrl: "/covers/camping.jpg",
    description:
      "含营地、帐篷（可双人拼）、周六晚餐和周日早餐。自己带睡袋和洗漱。夜里有灯串和小范围聊天，不轰趴，尊重想睡觉的人。",
    highlights: ["帐篷与营地", "两顿餐", "可拼帐", "请自备睡袋"],
    hostName: "老周",
    hostNote: "人多也保持安静。星星比音箱重要。",
    level: "all",
  },
  {
    id: "badminton-jb-weekend",
    slug: "badminton-jb-weekend",
    title: "新山周末羽毛球新手局",
    subtitle: "半场教学，半场对打，不修罗场",
    category: "racket",
    city: "jb",
    venue: "Taman Molek 室内馆",
    address: "Taman Molek, Johor Bahru",
    startsAt: "2026-09-12T10:00:00+08:00",
    endsAt: "2026-09-12T12:00:00+08:00",
    currency: "MYR",
    price: 40,
    capacity: 12,
    sold: 5,
    coverUrl: "/covers/badminton.jpg",
    description:
      "场地和球都有。拍子可租。按水平分边，避免被扣杀劝退。打完可自行去附近吃肉骨茶。",
    highlights: ["场地与球", "拍子可租 RM8", "按水平分边", "两小时"],
    hostName: "Hui",
    hostNote: "不会打也来。我会把球喂到你拍子上。",
    level: "newbie",
  },
  {
    id: "frisbee-sg-eastcoast",
    slug: "frisbee-sg-eastcoast",
    title: "East Coast 周末飞盘",
    subtitle: "海边公园，风大就改短传",
    category: "frisbee",
    city: "singapore",
    venue: "East Coast Park Area C",
    address: "East Coast Park, Singapore",
    startsAt: "2026-09-13T16:00:00+08:00",
    endsAt: "2026-09-13T18:00:00+08:00",
    currency: "SGD",
    price: 18,
    capacity: 20,
    sold: 14,
    coverUrl: "/covers/frisbee-sg.jpg",
    description:
      "新加坡东海岸常规飞盘局。混合水平，强调安全与轮换。含飞盘，水请自备。暴雨取消。",
    highlights: ["飞盘提供", "混合水平", "暴雨取消", "地铁到 Marine Parade 再步行"],
    hostName: "Jie",
    hostNote: "新面孔先做自我介绍，再进场。",
    level: "all",
  },
  {
    id: "citywalk-bkk-night",
    slug: "citywalk-bkk-night",
    title: "曼谷夜市慢走",
    subtitle: "灯、tuk-tuk、和一条不必赶的路",
    category: "citywalk",
    city: "bangkok",
    venue: "Khao San 路口",
    address: "Khao San Road, Bangkok",
    startsAt: "2026-09-18T19:30:00+07:00",
    endsAt: "2026-09-18T21:30:00+07:00",
    currency: "THB",
    price: 350,
    capacity: 14,
    sold: 8,
    coverUrl: "/covers/citywalk-bkk.jpg",
    description:
      "避开最吵的一段，走河岸和侧巷。讲解怎么点单、怎么杀价、怎么不被拉进店。费用含向导，餐饮自理。",
    highlights: ["向导讲解", "安全路线", "餐饮自理", "请穿能走路的鞋"],
    hostName: "Ning",
    hostNote: "钱包放前面。想拍照随时喊停。",
    level: "all",
  },
];

import type { BodyBlock, EventRecord } from "@/lib/types";
import type { CityId } from "@/lib/types";

export function isDemoEvent(event: { id?: string; slug?: string } | null | undefined) {
  const key = event?.id || event?.slug || "";
  return key.startsWith("demo-");
}

const GALLERY = "__gallery__";
const DEMO_NOTE = "此活动为 JOM 平台演示内容，仅用于展示页面与报名流程。";


export type DemoEventSeed = Omit<
  EventRecord,
  | "booked"
  | "remaining"
  | "clubId"
  | "clubName"
  | "userId"
  | "open"
  | "whatsapp"
  | "wechatQr"
  | "alipayQr"
  | "tngQr"
  | "status"
  | "cancelReason"
> & {
  galleryCount: number;
};

function pics(extras: string[]): BodyBlock[] {
  return extras.map((src) => ({ type: "img" as const, src, caption: GALLERY }));
}

export const DEMO_CLUB_SEED: {
  id: string;
  name: string;
  bio: string;
  city: Exclude<CityId, "all">;
  coverUrl: string;
  eventSlugs: string[];
}[] = [
  {
    id: "club-demo-penang",
    name: "槟城出门社",
    bio: "乔治市走路、拍照、喝咖啡。演示俱乐部，用来把平台走一遍。",
    city: "penang",
    coverUrl: "/covers/demo-penang-night.jpg",
    eventSlugs: [
      "demo-penang-night-photo",
      "demo-penang-ai-coffee",
      "demo-penang-heritage-walk",
      "demo-penang-gurney-read",
    ],
  },
  {
    id: "club-demo-kl",
    name: "吉隆坡出门社",
    bio: "KLCC、茨厂街、中山楼附近的小局。演示用，报名流程可以走通。",
    city: "kl",
    coverUrl: "/covers/demo-kl-night.jpg",
    eventSlugs: [
      "demo-kl-ai-meetup",
      "demo-kl-creative-coffee",
      "demo-kl-urban-photo",
      "demo-kl-creators-night",
    ],
  },
];

export const DEMO_EVENT_SEED: DemoEventSeed[] = [
  {
    id: "demo-penang-night-photo",
    slug: "demo-penang-night-photo",
    title: "乔治城夜拍：巷灯和壁画",
    subtitle: "亚美尼亚街集合，把灯、墙和人慢慢拍完",
    category: "photo",
    city: "penang",
    venue: "亚美尼亚街 / Armenian Street",
    address: "Armenian Street, George Town, Penang, Malaysia",
    lat: 5.4146,
    lng: 100.3372,
    startsAt: "2026-09-26T19:00:00+08:00",
    endsAt: "2026-09-26T21:30:00+08:00",
    currency: "MYR",
    price: 20,
    capacity: 14,
    sold: 5,
    coverUrl: "/covers/demo-penang-night.jpg",
    galleryCount: 2,
    description:
      "晚上七点在亚美尼亚街口集合。先走 Weld Quay 一带的巷灯，再绕去 Hin Bus Depot 看仓库壁画。手机和相机都行，不拼器材。拍完在附近坐下来互评三张。含带路，饮品自理。\n\n" + DEMO_NOTE,
    highlights: [
      "演示活动，可走通报名，非真实商业场次",
      "集合：亚美尼亚街与 Beach Street 路口",
      "手机、无反都欢迎",
      "穿能走路的鞋，巷子地面不平",
    ],
    hostName: "槟城出门社",
    hostNote: "灯一亮就拍。走丢了回亚美尼亚街口等我。",
    level: "all",
    body: [
      { type: "h", text: "这次做什么" },
      {
        type: "p",
        text: "不是跟拍网红点打卡。我们走三条真正会出片的巷：Armenian Street 的壁画墙、Love Lane 的侧光，以及 Hin Bus Depot 的仓库灯。每人至少被拍一张，也至少拍别人一张。",
      },
      { type: "h", text: "适合谁" },
      {
        type: "ul",
        items: ["第一次来乔治市、想认识路的人", "只用手机也想练夜景的人", "不想跟大团、更想慢慢走的人"],
      },
      { type: "h", text: "流程" },
      {
        type: "ul",
        items: [
          "19:00 亚美尼亚街口集合、对表",
          "19:15–20:30 巷弄夜拍，分段停三次",
          "20:40 Hin Bus Depot 外墙与院落",
          "21:10 附近店里互评，21:30 散",
        ],
      },
      { type: "h", text: "来之前看一眼" },
      {
        type: "ul",
        items: ["暴雨改期，行前两小时 WhatsApp 通知", "费用含带路，不含吃喝", "不要挡居民门口拍"],
      },
      ...pics([
        "/covers/demo-penang-night-2.jpg",
        "/covers/demo-penang-night-3.jpg",
      ]),
      { type: "p", text: DEMO_NOTE },
    ],
  },
  {
    id: "demo-penang-ai-coffee",
    slug: "demo-penang-ai-coffee",
    title: "槟城咖啡局：AI × 自由职业",
    subtitle: "ChinaHouse 二楼，聊怎么用 AI 接活，不贩课",
    category: "talk",
    city: "penang",
    venue: "ChinaHouse",
    address: "153 & 155 Beach Street, George Town, Penang 10300, Malaysia",
    lat: 5.4163,
    lng: 100.3406,
    startsAt: "2026-09-30T20:00:00+08:00",
    endsAt: "2026-09-30T22:00:00+08:00",
    currency: "MYR",
    price: 15,
    capacity: 12,
    sold: 3,
    coverUrl: "/covers/demo-penang-coffee.jpg",
    galleryCount: 2,
    description:
      "周三晚上在 ChinaHouse 坐两小时。每人带一个自己正在用的 AI 工具，或一个接不到活的真实问题。不讲成功学，不卖课。座位费 RM15，饮品另计。\n\n" + DEMO_NOTE,
    highlights: [
      "演示活动，可走通报名，非真实商业场次",
      "名额 12，人少才能说完",
      "饮品自理，ChinaHouse 蛋糕很能拖时间",
      "电脑可带，不强制打开",
    ],
    hostName: "槟城出门社",
    hostNote: "你卡在哪一步，就把那一步带来。别准备演讲。",
    level: "all",
    body: [
      { type: "h", text: "这次做什么" },
      {
        type: "p",
        text: "围一桌聊：接单页面怎么写、客户要图怎么交、哪些活不该用 AI 硬上。有人做设计，有人做文案，有人还在试。听完你可以什么都不买，只带走两三个能今晚就试的做法。",
      },
      { type: "h", text: "适合谁" },
      {
        type: "ul",
        items: ["在用 ChatGPT / Claude / Grok，但单还不稳定的人", "想认识同在槟城接远程活的人", "不想听招商、只想听实话的人"],
      },
      { type: "h", text: "流程" },
      {
        type: "ul",
        items: [
          "20:00 到齐、自我介绍 30 秒",
          "20:20 每人抛一个正在卡住的问题",
          "21:00 互相拆，不录音",
          "21:40 自由聊到 22:00，店未打烊可续坐",
        ],
      },
      { type: "h", text: "来之前看一眼" },
      {
        type: "ul",
        items: ["从 Beach Street 正门进，问二楼座位", "迟到超过 20 分钟当次不候", "不要在局里发课程链接"],
      },
      ...pics([
        "/covers/demo-penang-coffee-2.jpg",
        "/covers/demo-penang-coffee-3.jpg",
      ]),
      { type: "p", text: DEMO_NOTE },
    ],
  },
  {
    id: "demo-penang-heritage-walk",
    slug: "demo-penang-heritage-walk",
    title: "老城漫游：乔治市 Heritage Walk",
    subtitle: "从大草场走到姓氏桥，边走边听巷子怎么叠起来",
    category: "citywalk",
    city: "penang",
    venue: "Padang Kota Lama / 大草场",
    address: "Esplanade, Padang Kota Lama, George Town, Penang, Malaysia",
    lat: 5.4202,
    lng: 100.3415,
    startsAt: "2026-09-27T16:00:00+08:00",
    endsAt: "2026-09-27T18:30:00+08:00",
    currency: "MYR",
    price: 0,
    capacity: 20,
    sold: 8,
    coverUrl: "/covers/demo-penang-walk.jpg",
    galleryCount: 2,
    description:
      "免费。周日下午从 Esplanade 大草场出发，经 Fort Cornwallis 外墙、Armenian Street、再往 Clan Jetties 姓氏桥走一段。步程不赶，红灯会等。吃喝自理。\n\n" + DEMO_NOTE,
    highlights: [
      "演示活动，可走通报名，非真实商业场次",
      "免费占名额，不来请取消",
      "步程约 4km，平路为主",
      "防晒帽和水分开带",
    ],
    hostName: "槟城出门社",
    hostNote: "我们会等红灯。想拍照随时喊停，不会狂奔。",
    level: "newbie",
    body: [
      { type: "h", text: "这次做什么" },
      {
        type: "p",
        text: "把乔治市走成一条能记住的线：殖民草坪、堡垒、壁画巷、再到水上木屋。讲解只讲你用得上的——哪条巷下午光线好、哪里容易被拉进店、姓氏桥哪座比较适合第一次去。",
      },
      { type: "h", text: "适合谁" },
      {
        type: "ul",
        items: ["刚到槟城、地图还没热的人", "想拍老城但不想跟购物团的人", "可以走两小时、不赶行程的人"],
      },
      { type: "h", text: "流程" },
      {
        type: "ul",
        items: [
          "16:00 大草场靠近钟楼一侧集合",
          "16:15 堡垒外墙与海唇",
          "17:00 Armenian Street / Love Lane",
          "17:45 姓氏桥木板路，18:30 散，不强制聚餐",
        ],
      },
      { type: "h", text: "来之前看一眼" },
      {
        type: "ul",
        items: ["暴雨取消", "木板路拖鞋不稳，运动鞋更好", "桥上居民住在里面，拍照先问"],
      },
      ...pics([
        "/covers/demo-penang-walk-2.jpg",
        "/covers/demo-penang-walk-3.jpg",
      ]),
      { type: "p", text: DEMO_NOTE },
    ],
  },
  {
    id: "demo-penang-gurney-read",
    slug: "demo-penang-gurney-read",
    title: "日落读书局 · 新关仔角",
    subtitle: "Gurney Bay 海边草地，带一本书，天黑前收",
    category: "reading",
    city: "penang",
    venue: "Gurney Bay",
    address: "Gurney Bay, Gurney Drive, George Town, Penang, Malaysia",
    lat: 5.438,
    lng: 100.3108,
    startsAt: "2026-10-03T17:30:00+08:00",
    endsAt: "2026-10-03T19:30:00+08:00",
    currency: "MYR",
    price: 10,
    capacity: 12,
    sold: 4,
    coverUrl: "/covers/demo-penang-read.jpg",
    galleryCount: 2,
    description:
      "周六傍晚在 Gurney Bay 草地。先各自读 40 分钟，再围一圈每人分享一段。书不限，哲学、小说、诗都行。座位费 RM10，自带垫子或租草地。天黑收场，不拖延到夜宵。\n\n" + DEMO_NOTE,
    highlights: [
      "演示活动，可走通报名，非真实商业场次",
      "自带书和垫子，没有指定书单",
      "风大时改到有遮蔽的步道座椅",
      "不强制发言，听完也可以",
    ],
    hostName: "槟城出门社",
    hostNote: "读不够的部分，用你这周真实发生的一件事代替。",
    level: "all",
    body: [
      { type: "h", text: "这次做什么" },
      {
        type: "p",
        text: "不是讲座。海边有风，太阳下去之前，大家把一页读完、把一句话讲清楚。有人带《道德经》，有人带小说，有人只带这一周想不通的事。",
      },
      { type: "h", text: "适合谁" },
      {
        type: "ul",
        items: ["想出门但不想吵的人", "读书会新手，怕准备不好的人", "刚好住在新关仔角 / 调光一带的人"],
      },
      { type: "h", text: "流程" },
      {
        type: "ul",
        items: [
          "17:30 草地靠近海边跑道一侧集合",
          "17:40–18:20 各自静读",
          "18:25 圆圈，每人最多 6 分钟",
          "19:15 收，19:30 前离开，不占灯",
        ],
      },
      { type: "h", text: "来之前看一眼" },
      {
        type: "ul",
        items: ["蚊虫多，喷一下", "海边风大，纸书用夹子", "费用只占名额，不含饮料"],
      },
      ...pics([
        "/covers/demo-penang-read-2.jpg",
        "/covers/demo-penang-read-3.jpg",
      ]),
      { type: "p", text: DEMO_NOTE },
    ],
  },
  {
    id: "demo-kl-ai-meetup",
    slug: "demo-kl-ai-meetup",
    title: "KL AI Builders 小聚",
    subtitle: "REXKL，带作品不带 PPT，互相看一眼在做啥",
    category: "talk",
    city: "kl",
    venue: "REXKL",
    address: "80 Jalan Sultan, City Centre, 50000 Kuala Lumpur, Malaysia",
    lat: 3.1454,
    lng: 101.6976,
    startsAt: "2026-10-07T20:00:00+08:00",
    endsAt: "2026-10-07T22:00:00+08:00",
    currency: "MYR",
    price: 25,
    capacity: 18,
    sold: 7,
    coverUrl: "/covers/demo-kl-ai.jpg",
    galleryCount: 2,
    description:
      "周三晚上在 REXKL。每人 5 分钟展示一个自己做的小工具、网站或工作流，剩下时间互相问。不是招聘会，也不是赞助商路演。RM25 含场，饮品自理。\n\n" + DEMO_NOTE,
    highlights: [
      "演示活动，可走通报名，非真实商业场次",
      "从 Pasar Seni 地铁步行约 8 分钟",
      "笔记本可带，投影轮着用",
      "没有作品也可以来听",
    ],
    hostName: "吉隆坡出门社",
    hostNote: "做了一半的东西最欢迎。做完的反而没那么好看。",
    level: "all",
    body: [
      { type: "h", text: "这次做什么" },
      {
        type: "p",
        text: "一间旧戏院改的仓库里，把笔记本打开。有人做活动页，有人做自动发帖，有人只是把 Prompt 整理成自己能复用的包。看完你知道吉隆坡这周有谁在动手。",
      },
      { type: "h", text: "适合谁" },
      {
        type: "ul",
        items: ["在做 AI 小产品、接单或自学的人", "想找人一起踩坑、不是找投资的人", "能听英文/中文混着讲的人"],
      },
      { type: "h", text: "流程" },
      {
        type: "ul",
        items: [
          "20:00 进场、领位置",
          "20:15 闪电展示，每人 5 分钟",
          "21:10 自由组桌，深聊到 22:00",
          "散场后自行去茨厂街，不官方聚餐",
        ],
      },
      { type: "h", text: "来之前看一眼" },
      {
        type: "ul",
        items: ["入口在 Jalan Sultan，看 REXKL 大招牌", "场内有时有别的演出，我们用侧厅", "不要当场发传单"],
      },
      ...pics(["/covers/demo-kl-ai-2.jpg", "/covers/demo-kl-ai-3.jpg"]),
      { type: "p", text: DEMO_NOTE },
    ],
  },
  {
    id: "demo-kl-creative-coffee",
    slug: "demo-kl-creative-coffee",
    title: "KL 创作人咖啡局",
    subtitle: "VCR Jalan Galloway，带作品或带卡住的一句",
    category: "talk",
    city: "kl",
    venue: "VCR Cafe, Jalan Galloway",
    address: "2 Jalan Galloway, 50150 Kuala Lumpur, Malaysia",
    lat: 3.1478,
    lng: 101.7055,
    startsAt: "2026-10-10T15:00:00+08:00",
    endsAt: "2026-10-10T17:00:00+08:00",
    currency: "MYR",
    price: 15,
    capacity: 14,
    sold: 6,
    coverUrl: "/covers/demo-kl-coffee.jpg",
    galleryCount: 2,
    description:
      "周六下午在 VCR。摄影、文字、设计、独立接单的人坐一桌。先各自点单，再轮流说这周做了什么、卡在哪。座位费 RM15，咖啡另计。\n\n" + DEMO_NOTE,
    highlights: [
      "演示活动，可走通报名，非真实商业场次",
      "Bukit Bintang / 麦加锡一带，Grab 好停",
      "店里周末人多，我们占长桌",
      "不强制展示作品",
    ],
    hostName: "吉隆坡出门社",
    hostNote: "你卡住的那句，往往比完成的那张图有用。",
    level: "all",
    body: [
      { type: "h", text: "这次做什么" },
      {
        type: "p",
        text: "VCR 的长桌靠窗。没有主题演讲。有人在做 zine，有人在修客户图，有人只是想找人一起吐槽报价。两小时，结束时你至少认识三个名字。",
      },
      { type: "h", text: "适合谁" },
      {
        type: "ul",
        items: ["独立接单、不想只在网上认识人的人", "学生、刚开始接案的人", "住在武吉免登 / Pudu 走路能到的人"],
      },
      { type: "h", text: "流程" },
      {
        type: "ul",
        items: [
          "15:00 到店、点单、对名字",
          "15:20 每人 3 分钟：本周做了什么",
          "16:00 自由换座深聊",
          "17:00 结束，想续坐自行跟店员说",
        ],
      },
      { type: "h", text: "来之前看一眼" },
      {
        type: "ul",
        items: ["周末车位少，地铁 Bukit Bintang 步行约 12 分钟", "插座有限，先问再充电", "不要把桌子变成拍摄棚"],
      },
      ...pics([
        "/covers/demo-kl-coffee-2.jpg",
        "/covers/demo-kl-coffee-3.jpg",
      ]),
      { type: "p", text: DEMO_NOTE },
    ],
  },
  {
    id: "demo-kl-urban-photo",
    slug: "demo-kl-urban-photo",
    title: "周末城市摄影走 · KLCC",
    subtitle: "从公园湖面走到武吉免登灯，练自然光和街拍",
    category: "photo",
    city: "kl",
    venue: "KLCC Park",
    address: "KLCC Park, Kuala Lumpur City Centre, 50088 Kuala Lumpur, Malaysia",
    lat: 3.1544,
    lng: 101.7134,
    startsAt: "2026-10-11T16:30:00+08:00",
    endsAt: "2026-10-11T19:00:00+08:00",
    currency: "MYR",
    price: 20,
    capacity: 16,
    sold: 9,
    coverUrl: "/covers/demo-kl-photo.jpg",
    galleryCount: 2,
    description:
      "周日下午从 KLCC Park 湖边出发。先拍倒影和行人，天擦黑再往 Bukit Bintang 走一段夜景。讲解停三次：曝光、等灯、不挡路。含带路，不含晚餐。\n\n" + DEMO_NOTE,
    highlights: [
      "演示活动，可走通报名，非真实商业场次",
      "集合：KLCC Park 靠近湖的南侧步道",
      "手机和相机都欢迎",
      "人多路滑，背包请斜背",
    ],
    hostName: "吉隆坡出门社",
    hostNote: "双子塔人人会拍。我更想看你拍到的人。",
    level: "all",
    body: [
      { type: "h", text: "这次做什么" },
      {
        type: "p",
        text: "公园、湖、行人、再进入武吉免登的灯。不是跟拍机位。我们练三件事：等光、等人、不挡路。拍完在路口互评两张，不打分。",
      },
      { type: "h", text: "适合谁" },
      {
        type: "ul",
        items: ["想拍 KL 但不想跟旅游团的人", "第一次夜拍、怕参数的人", "能走约 3km 的人"],
      },
      { type: "h", text: "流程" },
      {
        type: "ul",
        items: [
          "16:30 湖边南侧步道集合",
          "16:45–17:40 公园与倒影",
          "17:50 往 Bukit Bintang 方向走",
          "18:40 路口互评，19:00 散",
        ],
      },
      { type: "h", text: "来之前看一眼" },
      {
        type: "ul",
        items: ["KLCC 地铁 C 出口出园最快", "喷泉表演时段人挤，我们绕开", "不要用闪光灯对着行人脸"],
      },
      ...pics([
        "/covers/demo-kl-photo-2.jpg",
        "/covers/demo-kl-photo-3.jpg",
      ]),
      { type: "p", text: DEMO_NOTE },
    ],
  },
  {
    id: "demo-kl-creators-night",
    slug: "demo-kl-creators-night",
    title: "年轻创作者 Night @ 中山",
    subtitle: "Zhongshan Building，认识人，不交换名片夹",
    category: "talk",
    city: "kl",
    venue: "Zhongshan Building",
    address: "80 Jalan Rotan, Kampung Attap, 50460 Kuala Lumpur, Malaysia",
    lat: 3.1369,
    lng: 101.6964,
    startsAt: "2026-10-16T19:30:00+08:00",
    endsAt: "2026-10-16T21:30:00+08:00",
    currency: "MYR",
    price: 10,
    capacity: 20,
    sold: 2,
    coverUrl: "/covers/demo-kl-night.jpg",
    galleryCount: 2,
    description:
      "周五晚上在中山楼院子和一楼公共区。没有主题演讲。来的人多数在做图、做活动、做独立项目。RM10 占名额，场内吃喝自理。想认识人，不想听路演。\n\n" + DEMO_NOTE,
    highlights: [
      "演示活动，可走通报名，非真实商业场次",
      "Pasar Seni 地铁步行约 15 分钟",
      "院子蚊子多，喷一下",
      "不发传单、不强加微信群",
    ],
    hostName: "吉隆坡出门社",
    hostNote: "自我介绍只说你正在做的那一件事。头衔以后再说。",
    level: "newbie",
    body: [
      { type: "h", text: "这次做什么" },
      {
        type: "p",
        text: "中山楼周五晚上本来就有人。我们只是把想认识同类的人约到同一段时间。院子里站着聊，热了上楼找沙发。结束时你应该有两三个下次还能打招呼的人。",
      },
      { type: "h", text: "适合谁" },
      {
        type: "ul",
        items: ["18–30 岁，在做创作或活动的人", "刚到 KL、还没自己圈子的人", "不喜欢大型 networking 酒会的人"],
      },
      { type: "h", text: "流程" },
      {
        type: "ul",
        items: [
          "19:30 一楼院子集合、对名字",
          "19:45 一轮 20 秒介绍",
          "20:00 自由聊，可换桌",
          "21:20 收，21:30 散，不官方二摊",
        ],
      },
      { type: "h", text: "来之前看一眼" },
      {
        type: "ul",
        items: ["入口在 Jalan Rotan，别和旁边学校搞混", "周末停车难，建议地铁+步行", "尊重楼里其他店的客人"],
      },
      ...pics([
        "/covers/demo-kl-night-2.jpg",
        "/covers/demo-kl-night-3.jpg",
      ]),
      { type: "p", text: DEMO_NOTE },
    ],
  },
];

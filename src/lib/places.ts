import type { CityId } from "@/lib/types";

export type SelectedPlace = {
  cityId: CityId;
  world: boolean;
  cityName: string;
  stateName: string;
  countryName: string;
  countryCode: string;
};

export const DEFAULT_PLACE: SelectedPlace = {
  cityId: "all",
  world: false,
  cityName: "全部城市",
  stateName: "",
  countryName: "",
  countryCode: "",
};

export const HOT_COUNTRIES = [
  "MY",
  "SG",
  "TH",
  "CN",
  "ID",
  "VN",
  "JP",
  "KR",
  "TW",
  "HK",
  "PH",
  "KH",
  "LA",
  "MM",
  "IN",
  "AU",
  "US",
  "GB",
] as const;

const ZH_STATE: Record<string, string> = {
  "MY-01": "柔佛",
  "MY-02": "吉打",
  "MY-03": "吉兰丹",
  "MY-04": "马六甲",
  "MY-05": "森美兰",
  "MY-06": "彭亨",
  "MY-07": "槟城",
  "MY-08": "霹雳",
  "MY-09": "玻璃市",
  "MY-10": "雪兰蕾",
  "MY-11": "登嘉楼",
  "MY-12": "沙巴",
  "MY-13": "砂拉越",
  "MY-14": "吉隆坡",
  "MY-15": "纳闽",
  "MY-16": "布城",
  "TH-10": "曼谷",
  "CN-BJ": "北京",
  "CN-SH": "上海",
  "CN-GD": "广东",
  "CN-YN": "云南",
  "CN-SN": "陕西",
  "CN-SC": "四川",
  "CN-ZJ": "浙江",
  "CN-JS": "江苏",
  "CN-SD": "山东",
};

const ZH_CITY: Record<string, string> = {
  "George Town": "乔治城",
  Penang: "槟城",
  "Kuala Lumpur": "吉隆坡",
  "Johor Bahru": "新山",
  Singapore: "新加坡",
  Bangkok: "曼谷",
  "Petaling Jaya": "八打灵再也",
  "Shah Alam": "莎阿南",
  Ipoh: "怡保",
  Malacca: "马六甲",
  "Kota Kinabalu": "亚庇",
  Kuching: "古晋",
  "Chiang Mai": "清迈",
  "Ho Chi Minh City": "胡志明市",
  Hanoi: "河内",
  Jakarta: "雅加达",
  Bali: "巴厖岛",
  Taipei: "台北",
  "Hong Kong": "香港",
  Beijing: "北京",
  Shanghai: "上海",
  Guangzhou: "广州",
  Shenzhen: "深圳",
  Tokyo: "东京",
  Osaka: "大阪",
  Seoul: "首尔",
};

const ZH_COUNTRY: Record<string, string> = {
  MY: "马来西亚",
  SG: "新加坡",
  TH: "泰国",
  CN: "中国",
  ID: "印度尼西亚",
  VN: "越南",
  JP: "日本",
  KR: "韩国",
  TW: "台湾",
  HK: "香港",
  MO: "澳门",
  PH: "菲律宾",
  KH: "柬埔寨",
  LA: "老挝",
  MM: "缅甸",
  BN: "文莱",
  IN: "印度",
  AU: "澳大利亚",
  NZ: "新西兰",
  US: "美国",
  GB: "英国",
  CA: "加拿大",
  FR: "法国",
  DE: "德国",
  IT: "意大利",
  ES: "西班牙",
  NL: "荷兰",
  CH: "瑞士",
  SE: "瑞典",
  NO: "挪威",
  DK: "丹麦",
  FI: "芬兰",
  IE: "爱尔兰",
  PT: "葡萄牙",
  PL: "波兰",
  RU: "俄罗斯",
  UA: "乌克兰",
  TR: "土耳其",
  AE: "阿联酋",
  SA: "沙特阿拉伯",
  QA: "卡塔尔",
  BR: "巴西",
  MX: "墨西哥",
  AR: "阿根廷",
  ZA: "南非",
  EG: "埃及",
  NG: "尼日利亚",
  PK: "巴基斯坦",
  BD: "孟加拉",
  LK: "斯里兰卡",
  NP: "尼泊尔",
  MN: "蒙古",
  KZ: "哈萨克斯坦",
};

export function countryNameZh(code: string, fallback = ""): string {
  const key = code.trim().toUpperCase();
  return ZH_COUNTRY[key] || fallback || code;
}

export function stateNameZh(countryCode: string, isoCode: string, fallback: string) {
  return ZH_STATE[`${countryCode}-${isoCode}`] || fallback;
}

export function cityNameZh(name: string) {
  return ZH_CITY[name] || name;
}

export function placeChip(place: SelectedPlace) {
  if (place.cityName) return place.cityName;
  if (place.stateName) return place.stateName;
  if (place.countryName) return place.countryName;
  return "选择城市";
}

const CITY_ALIASES: { id: Exclude<CityId, "all">; tests: RegExp[] }[] = [
  { id: "penang", tests: [/penang/i, /pulau pinang/i, /george town/i, /georgetown/i, /槟城/, /乔治城/] },
  { id: "kl", tests: [/kuala lumpur/i, /吉隆坡/, /\bkl\b/i, /雪兰莪/, /selangor/i] },
  { id: "jb", tests: [/johor bahru/i, /johor/i, /新山/, /柔佛/] },
  { id: "singapore", tests: [/singapore/i, /新加坡/] },
  { id: "bangkok", tests: [/bangkok/i, /krung thep/i, /曼谷/] },
];

export const CITY_REGION: Record<
  Exclude<CityId, "all">,
  { country: string; stateKeys: string[] }
> = {
  penang: { country: "MY", stateKeys: ["penang", "pulau pinang", "槟城", "george town", "georgetown"] },
  kl: { country: "MY", stateKeys: ["kuala lumpur", "selangor", "吉隆坡", "雪兰莪", "petaling"] },
  jb: { country: "MY", stateKeys: ["johor", "柔佛", "新山", "johor bahru"] },
  singapore: { country: "SG", stateKeys: ["singapore", "新加坡"] },
  bangkok: { country: "TH", stateKeys: ["bangkok", "曼谷", "krung thep"] },
};

export function matchCatalogCity(
  cityName: string,
  stateName = "",
  countryCode = "",
): CityId {
  const hay = `${cityName} ${stateName} ${countryCode}`;
  for (const row of CITY_ALIASES) {
    if (row.tests.some((re) => re.test(hay))) return row.id;
  }
  return "all";
}

export function buildPlace(input: {
  cityName: string;
  stateName?: string;
  countryName?: string;
  countryCode?: string;
}): SelectedPlace {
  const cityId = matchCatalogCity(
    input.cityName,
    input.stateName,
    input.countryCode,
  );
  const world = cityId === "all";
  return {
    cityId: world ? "all" : cityId,
    world,
    cityName: cityNameZh(input.cityName) || input.cityName,
    stateName: input.stateName || "",
    countryName: input.countryName || "",
    countryCode: (input.countryCode || "").toUpperCase(),
  };
}

export function eventMatchesPlace(
  event: { city: string; venue?: string; address?: string },
  place: SelectedPlace,
): boolean {
  if ((!place.countryCode && place.cityId === "all" && !place.world) || (!place.cityName && place.cityId === "all" && !place.countryCode)) {
    return true;
  }
  const region = CITY_REGION[event.city as Exclude<CityId, "all">];
  const catalogId = matchCatalogCity(place.cityName, place.stateName, place.countryCode);
  if (catalogId !== "all" && catalogId === event.city) return true;
  if (place.cityId !== "all" && place.cityId === event.city) return true;

  if (place.countryCode) {
    if (!region || region.country !== place.countryCode.toUpperCase()) return false;
    if (place.stateName) {
      const state = place.stateName.toLowerCase();
      const hit = region.stateKeys.some((key) => state.includes(key) || key.includes(state));
      if (hit) return true;
      // unknown small city under a known country/state: still show the state's/country's events
      if (catalogId === "all") return true;
      return false;
    }
    return true;
  }

  if (place.world && place.cityName) {
    const hay = `${event.city} ${event.venue ?? ""} ${event.address ?? ""} ${place.cityName}`.toLowerCase();
    const q = place.cityName.toLowerCase();
    if (hay.includes(q)) return true;
    if (region && region.stateKeys.some((key) => q.includes(key) || key.includes(q))) return true;
    return false;
  }

  return place.cityId === "all";
}

export function clubMatchesPlace(club: { city: string; name?: string }, place: SelectedPlace) {
  return eventMatchesPlace({ city: club.city, venue: club.name, address: "" }, place);
}

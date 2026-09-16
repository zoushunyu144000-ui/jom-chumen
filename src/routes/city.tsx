import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, LocateFixed, Search } from "lucide-react";
import { City, Country, State } from "country-state-city";
import { toast } from "sonner";
import {
  DEFAULT_PLACE,
  HOT_COUNTRIES,
  buildPlace,
  cityNameZh,
  countryNameZh,
  stateNameZh,
} from "@/lib/places";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/city")({ component: CityPage });

type CountryRow = { isoCode: string; name: string };
type StateRow = { isoCode: string; name: string; countryCode: string };
type CityRow = { name: string; stateCode: string; countryCode: string };

function CityPage() {
  const navigate = useNavigate();
  const setPlace = useAppStore((s) => s.setPlace);
  const current = useAppStore((s) => s.place);
  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);
  const [country, setCountry] = useState<CountryRow | null>(null);
  const [state, setState] = useState<StateRow | null>(null);

  const allCountries = useMemo(() => Country.getAllCountries(), []);

  const countries = useMemo(() => {
    const rows = allCountries.map((c) => ({
      isoCode: c.isoCode,
      name: c.name,
      zh: countryNameZh(c.isoCode, c.name),
    }));
    const query = q.trim().toLowerCase();
    const filtered = query
      ? rows.filter(
          (c) =>
            c.zh.toLowerCase().includes(query) ||
            c.name.toLowerCase().includes(query) ||
            c.isoCode.toLowerCase() === query,
        )
      : rows;
    const hot = HOT_COUNTRIES.map((code) =>
      filtered.find((c) => c.isoCode === code),
    ).filter(Boolean) as typeof rows;
    const rest = filtered
      .filter((c) => !HOT_COUNTRIES.includes(c.isoCode as (typeof HOT_COUNTRIES)[number]))
      .sort((a, b) => a.zh.localeCompare(b.zh, "zh"));
    return { hot: query ? filtered.slice(0, 12) : hot, rest: query ? [] : rest };
  }, [allCountries, q]);

  const states = useMemo(() => {
    if (!country) return [];
    const query = q.trim().toLowerCase();
    return State.getStatesOfCountry(country.isoCode)
      .map((s) => ({
        isoCode: s.isoCode,
        name: s.name,
        countryCode: s.countryCode,
        zh: stateNameZh(s.countryCode, s.isoCode, s.name),
      }))
      .filter((s) =>
        !query
          ? true
          : s.zh.toLowerCase().includes(query) || s.name.toLowerCase().includes(query),
      );
  }, [country, q]);

  const cities = useMemo(() => {
    if (!country || !state) return [];
    const query = q.trim().toLowerCase();
    return City.getCitiesOfState(country.isoCode, state.isoCode)
      .map((c) => ({
        name: c.name,
        stateCode: c.stateCode,
        countryCode: c.countryCode,
        zh: cityNameZh(c.name),
      }))
      .filter((c) =>
        !query
          ? true
          : c.zh.toLowerCase().includes(query) || c.name.toLowerCase().includes(query),
      );
  }, [country, state, q]);

  const searchCities = useMemo(() => {
    if (country || state) return [];
    const query = q.trim();
    if (query.length < 2) return [];
    const lower = query.toLowerCase();
    const found: { name: string; state: string; country: string; countryCode: string }[] = [];
    for (const code of HOT_COUNTRIES) {
      const list = City.getCitiesOfCountry(code) ?? [];
      for (const c of list) {
        const zh = cityNameZh(c.name);
        if (
          c.name.toLowerCase().includes(lower) ||
          zh.toLowerCase().includes(lower)
        ) {
          found.push({
            name: c.name,
            state: c.stateCode,
            country: countryNameZh(c.countryCode, c.countryCode),
            countryCode: c.countryCode,
          });
        }
        if (found.length >= 30) return found;
      }
    }
    return found;
  }, [country, state, q]);

  function pickCity(row: CityRow, countryName: string, stateName: string) {
    const countryZh = countryNameZh(row.countryCode, countryName);
    const stateZh = stateNameZh(row.countryCode, row.stateCode, stateName);
    setPlace(
      buildPlace({
        cityName: row.name,
        stateName: stateZh,
        countryName: countryZh,
        countryCode: row.countryCode,
      }),
    );
    void navigate({ to: "/" });
  }

  function pickAll() {
    setPlace(DEFAULT_PLACE);
    void navigate({ to: "/" });
  }

  async function locate() {
    if (!navigator.geolocation) {
      toast.error("这台设备不能定位");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
          const res = await fetch(url, {
            headers: { "Accept-Language": "zh-CN,en" },
          });
          const data = (await res.json()) as {
            address?: {
              city?: string;
              town?: string;
              village?: string;
              state?: string;
              country?: string;
              country_code?: string;
            };
          };
          const addr = data.address ?? {};
          const cityName =
            addr.city || addr.town || addr.village || addr.state || "当前位置";
          setPlace(
            buildPlace({
              cityName,
              stateName: addr.state,
              countryName: addr.country,
              countryCode: (addr.country_code || "").toUpperCase(),
            }),
          );
          toast.success(`已定位到 ${cityNameZh(cityName)}`);
          void navigate({ to: "/" });
        } catch {
          toast.error("定位失败，请手动选城市");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast.error("没有拿到定位权限");
      },
      { enableHighAccuracy: false, timeout: 12000 },
    );
  }

  const title = state
    ? stateNameZh(state.countryCode, state.isoCode, state.name)
    : country
      ? countryNameZh(country.isoCode, country.name)
      : "选择城市";

  return (
    <main className="flex min-h-dvh flex-col bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-paper px-2 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex size-11 items-center justify-center"
            onClick={() => {
              if (state) setState(null);
              else if (country) setCountry(null);
              else void navigate({ to: "/" });
            }}
            aria-label="返回"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">{title}</h1>
        </div>
        <div className="relative mx-2 mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜国家、省份、城市"
            className="h-11 w-full rounded-full bg-surface pl-10 pr-4 text-sm shadow-card outline-none placeholder:text-muted"
          />
        </div>
      </header>

      <div className="flex-1 px-4 pb-10 pt-3">
        {!country && !state ? (
          <>
            <button
              type="button"
              onClick={() => void locate()}
              className="flex h-12 w-full items-center gap-2 rounded-lg bg-surface px-3 text-sm font-medium shadow-card"
            >
              <LocateFixed className="size-4" />
              {locating ? "正在定位…" : "使用当前位置"}
            </button>
            <button
              type="button"
              onClick={pickAll}
              className={cn(
                "mt-2 flex h-12 w-full items-center justify-between rounded-lg px-3 text-sm shadow-card",
                current.cityId === "all" && !current.world
                  ? "bg-lime font-medium"
                  : "bg-surface",
              )}
            >
              不限城市
              <span className="text-xs text-muted">看全部活动</span>
            </button>

            {searchCities.length > 0 ? (
              <section className="mt-6">
                <p className="mb-2 text-xs text-muted">城市</p>
                <ul className="space-y-1">
                  {searchCities.map((c) => (
                    <li key={`${c.countryCode}-${c.state}-${c.name}`}>
                      <button
                        type="button"
                        onClick={() =>
                          pickCity(
                            {
                              name: c.name,
                              stateCode: c.state,
                              countryCode: c.countryCode,
                            },
                            c.country,
                            c.state,
                          )
                        }
                        className="flex h-12 w-full items-center justify-between rounded-md bg-surface px-3 text-left text-sm"
                      >
                        <span>{cityNameZh(c.name)}</span>
                        <span className="text-xs text-muted">{c.country}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {countries.hot.length > 0 ? (
              <section className="mt-6">
                <p className="mb-2 text-xs text-muted">
                  {q.trim() ? "搜索结果" : "常用地区"}
                </p>
                <ul className="space-y-1">
                  {countries.hot.map((c) => (
                    <li key={c.isoCode}>
                      <Row
                        title={c.zh}
                        hint={c.name}
                        onClick={() => {
                          setCountry({ isoCode: c.isoCode, name: c.name });
                          setQ("");
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {countries.rest.length > 0 ? (
              <section className="mt-6">
                <p className="mb-2 text-xs text-muted">全部国家 / 地区</p>
                <ul className="space-y-1">
                  {countries.rest.map((c) => (
                    <li key={c.isoCode}>
                      <Row
                        title={c.zh}
                        hint={c.name}
                        onClick={() => {
                          setCountry({ isoCode: c.isoCode, name: c.name });
                          setQ("");
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}

        {country && !state ? (
          <ul className="space-y-1">
            {states.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">没有找到省份</p>
            ) : (
              states.map((s) => (
                <li key={s.isoCode}>
                  <Row
                    title={s.zh}
                    hint={s.name === s.zh ? "" : s.name}
                    onClick={() => {
                      setState(s);
                      setQ("");
                    }}
                  />
                </li>
              ))
            )}
          </ul>
        ) : null}

        {country && state ? (
          <ul className="space-y-1">
            {cities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">这一带没有列出城市</p>
            ) : (
              cities.map((c) => (
                <li key={`${c.stateCode}-${c.name}`}>
                  <button
                    type="button"
                    onClick={() => pickCity(c, country.name, state.name)}
                    className="flex h-12 w-full items-center justify-between rounded-md bg-surface px-3 text-left text-sm"
                  >
                    <span>{c.zh}</span>
                    {c.zh !== c.name ? (
                      <span className="text-xs text-muted">{c.name}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </main>
  );
}

function Row({
  title,
  hint,
  onClick,
}: {
  title: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-between rounded-md bg-surface px-3 text-left text-sm"
    >
      <span>
        {title}
        {hint ? <span className="ml-2 text-xs text-muted">{hint}</span> : null}
      </span>
      <ChevronRight className="size-4 text-muted" />
    </button>
  );
}

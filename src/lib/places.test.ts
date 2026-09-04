import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PLACE, buildPlace, eventMatchesPlace } from "./places.ts";

const penang = { city: "penang", venue: "Gurney Plaza", address: "Georgetown, Penang" };
const kl = { city: "kl", venue: "Petaling Street", address: "Kuala Lumpur" };
const sg = { city: "singapore", venue: "East Coast", address: "Singapore" };

test("all cities shows everything", () => {
  assert.equal(eventMatchesPlace(penang, DEFAULT_PLACE), true);
  assert.equal(eventMatchesPlace(sg, DEFAULT_PLACE), true);
});

test("country Malaysia includes Penang and KL but not Singapore", () => {
  const my = {
    cityId: "all" as const,
    world: false,
    cityName: "马来西亚",
    stateName: "",
    countryName: "马来西亚",
    countryCode: "MY",
  };
  assert.equal(eventMatchesPlace(penang, my), true);
  assert.equal(eventMatchesPlace(kl, my), true);
  assert.equal(eventMatchesPlace(sg, my), false);
});

test("Penang state or small city under Penang still shows Penang events", () => {
  const state = buildPlace({
    cityName: "Bayan Lepas",
    stateName: "槟城",
    countryName: "马来西亚",
    countryCode: "MY",
  });
  assert.equal(state.cityId, "penang");
  assert.equal(eventMatchesPlace(penang, state), true);
  assert.equal(eventMatchesPlace(kl, state), false);
});

test("pair-style catalog match for George Town", () => {
  const place = buildPlace({
    cityName: "George Town",
    stateName: "Penang",
    countryName: "Malaysia",
    countryCode: "MY",
  });
  assert.equal(place.cityId, "penang");
  assert.equal(eventMatchesPlace(penang, place), true);
});

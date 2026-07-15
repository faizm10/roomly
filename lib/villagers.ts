import type { WorldObject } from "./world";
import { clamp } from "./world";

/**
 * Tiny finite-state machine that drives villager behaviour.
 * Coordinates are percentages of the world viewport, matching WorldObject.
 * No AI here — just timers, targets and a bit of randomness.
 */

export type VillagerState =
  | "entering" // walking in from the edge of the world
  | "idle"
  | "walking"
  | "sipping" // standing outside the cafe with a coffee
  | "inside"; // invisible, "inside" a house

export type WalkPurpose = "wander" | "cafe" | "house";

export interface Villager {
  id: number;
  name: string;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: VillagerState;
  /** Timestamp (ms) when the current timed state should end. */
  stateUntil: number;
  purpose: WalkPurpose;
  speech: string | null;
  speechUntil: number;
  facing: 1 | -1;
  waving: boolean;
}

const SPEED = 7; // percent of world width per second
const VILLAGER_COLORS = ["#f2a65a", "#8fb8de", "#c39bd3", "#7cbf74", "#e8837a"];
const VILLAGER_NAMES = ["Momo", "Pip", "Suki", "Beans", "Nori"];

const IDLE_CHATTER = [
  "This town is nice.",
  "What a lovely day!",
  "I love it here 🌸",
  "Did you draw all this?",
];
const CAFE_CHATTER = ["I'm getting coffee ☕", "One latte, please!", "Coffee time!"];
const HOUSE_CHATTER = ["Time for work!", "Heading home 🏡", "Nap time..."];
const WAVE_CHATTER = ["Hello there! 👋", "Hi hi!"];

const rand = (n: number) => Math.random() * n;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand(arr.length))];

let villagerId = 0;

export function spawnVillager(index: number, now: number): Villager {
  const fromLeft = index % 2 === 0;
  const y = 55 + rand(30);
  return {
    id: villagerId++,
    name: VILLAGER_NAMES[index % VILLAGER_NAMES.length],
    color: VILLAGER_COLORS[index % VILLAGER_COLORS.length],
    x: fromLeft ? -6 : 106,
    y,
    targetX: 20 + rand(60),
    targetY: clamp(y + rand(10) - 5, 40, 90),
    state: "entering",
    stateUntil: now,
    purpose: "wander",
    speech: null,
    speechUntil: 0,
    facing: fromLeft ? 1 : -1,
    waving: false,
  };
}

/** Spawn a villager at a specific spot (used for sketched "person" objects). */
export function spawnVillagerAt(x: number, y: number, index: number, now: number): Villager {
  const v = spawnVillager(index, now);
  v.x = x;
  v.y = clamp(y, 48, 90);
  v.targetX = x;
  v.targetY = v.y;
  v.state = "idle";
  v.stateUntil = now + 800 + rand(1500);
  return v;
}

function say(v: Villager, lines: string[], now: number) {
  v.speech = pick(lines);
  v.speechUntil = now + 2600;
}

function walkTo(v: Villager, x: number, y: number, purpose: WalkPurpose) {
  v.targetX = clamp(x, 2, 98);
  v.targetY = clamp(y, 48, 92);
  v.purpose = purpose;
  v.state = "walking";
  v.facing = v.targetX >= v.x ? 1 : -1;
}

/** Pick the next destination. Villagers prefer strolling along roads. */
function decideNextMove(v: Villager, objects: WorldObject[], now: number) {
  const cafes = objects.filter((o) => o.type === "cafe");
  const houses = objects.filter((o) => o.type === "house");
  const roads = objects.filter((o) => o.type === "road");
  const roll = Math.random();

  if (cafes.length > 0 && roll < 0.3) {
    const cafe = pick(cafes);
    say(v, CAFE_CHATTER, now);
    walkTo(v, cafe.x + rand(8) - 4, cafe.y + 7, "cafe");
  } else if (houses.length > 0 && roll < 0.5) {
    const house = pick(houses);
    say(v, HOUSE_CHATTER, now);
    walkTo(v, house.x, house.y + 6, "house");
  } else if (roads.length > 0 && roll < 0.85) {
    // Stroll to a point along a road.
    const road = pick(roads);
    walkTo(v, road.x + rand(30) - 15, road.y + rand(6) - 3, "wander");
  } else {
    walkTo(v, 10 + rand(80), 40 + rand(50), "wander");
  }
}

/** Advance one villager by dt seconds. Mutates and returns the villager. */
function tickVillager(v: Villager, objects: WorldObject[], dt: number, now: number): Villager {
  if (v.speech && now > v.speechUntil) v.speech = null;

  switch (v.state) {
    case "entering":
    case "walking": {
      const dx = v.targetX - v.x;
      const dy = v.targetY - v.y;
      const dist = Math.hypot(dx, dy);
      const step = SPEED * dt;

      if (dist <= step) {
        v.x = v.targetX;
        v.y = v.targetY;
        if (v.purpose === "cafe") {
          v.state = "sipping";
          v.stateUntil = now + 2500 + rand(2000);
        } else if (v.purpose === "house") {
          v.state = "inside";
          v.stateUntil = now + 2500 + rand(2500);
        } else {
          v.state = "idle";
          v.stateUntil = now + 1200 + rand(2500);
          if (Math.random() < 0.25) {
            v.waving = true;
            say(v, WAVE_CHATTER, now);
          } else if (Math.random() < 0.3) {
            say(v, IDLE_CHATTER, now);
          }
        }
      } else {
        v.x += (dx / dist) * step;
        v.y += (dy / dist) * step;
        v.facing = dx >= 0 ? 1 : -1;
      }
      break;
    }

    case "idle":
      if (now >= v.stateUntil) {
        v.waving = false;
        decideNextMove(v, objects, now);
      }
      break;

    case "sipping":
      if (now >= v.stateUntil) {
        say(v, IDLE_CHATTER, now);
        decideNextMove(v, objects, now);
      }
      break;

    case "inside":
      if (now >= v.stateUntil) {
        say(v, pick([["Back outside!"], HOUSE_CHATTER]), now);
        decideNextMove(v, objects, now);
      }
      break;
  }

  return v;
}

/** Advance the whole population. Returns a new array so React re-renders. */
export function tickVillagers(
  villagers: Villager[],
  objects: WorldObject[],
  dt: number,
  now: number,
): Villager[] {
  return villagers.map((v) => tickVillager({ ...v }, objects, dt, now));
}

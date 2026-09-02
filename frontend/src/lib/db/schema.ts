import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const memberRole = pgEnum("member_role", ["owner", "editor"]);

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    destination: text("destination").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("trips_owner_idx").on(table.ownerId)],
);

export const tripMembers = pgTable(
  "trip_members",
  {
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: memberRole("role").notNull().default("editor"),
    displayName: text("display_name").notNull().default("Traveller"),
    image: text("image"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("trip_members_unique").on(table.tripId, table.userId),
    index("trip_members_user_idx").on(table.userId),
  ],
);

export const tripInvitations = pgTable(
  "trip_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: text("invited_by").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("trip_invitations_trip_idx").on(table.tripId)],
);

export const tripCities = pgTable(
  "trip_cities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    country: text("country").notNull().default(""),
    startDate: date("start_date"),
    endDate: date("end_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("trip_cities_trip_sort_unique").on(table.tripId, table.sortOrder),
  ],
);

export const tripPlaces = pgTable(
  "trip_places",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    cityId: uuid("city_id").references(() => tripCities.id, { onDelete: "set null" }),
    fsqPlaceId: text("fsq_place_id").notNull(),
    name: text("name").notNull().default("Saved place"),
    address: text("address").notNull().default(""),
    neighborhood: text("neighborhood").notNull().default(""),
    longitude: doublePrecision("longitude").notNull().default(0),
    latitude: doublePrecision("latitude").notNull().default(0),
    category: text("category").notNull(),
    note: text("note").notNull().default(""),
    sourceUrl: text("source_url"),
    saved: boolean("saved").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    plannedDate: date("planned_date"),
    daySortOrder: integer("day_sort_order").notNull().default(0),
    addedBy: text("added_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("trip_places_provider_unique").on(table.tripId, table.fsqPlaceId),
    index("trip_places_trip_sort_idx").on(table.tripId, table.sortOrder),
    index("trip_places_day_idx").on(table.tripId, table.plannedDate, table.daySortOrder),
    index("trip_places_city_idx").on(table.cityId),
  ],
);

export const tripDayNotes = pgTable(
  "trip_day_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    cityId: uuid("city_id").references(() => tripCities.id, { onDelete: "set null" }),
    plannedDate: date("planned_date").notNull(),
    note: text("note").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    addedBy: text("added_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("trip_day_notes_day_idx").on(table.tripId, table.plannedDate, table.sortOrder),
    index("trip_day_notes_city_idx").on(table.cityId),
  ],
);

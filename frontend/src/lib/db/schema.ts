import {
  date,
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

export const tripPlaces = pgTable(
  "trip_places",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    fsqPlaceId: text("fsq_place_id").notNull(),
    category: text("category").notNull(),
    note: text("note").notNull().default(""),
    sourceUrl: text("source_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    addedBy: text("added_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("trip_places_provider_unique").on(table.tripId, table.fsqPlaceId),
    index("trip_places_trip_sort_idx").on(table.tripId, table.sortOrder),
  ],
);

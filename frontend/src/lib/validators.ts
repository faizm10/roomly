import { z } from "zod";
import { PLACE_CATEGORIES } from "@/lib/types";

const tripDetailsFields = {
  title: z.string().trim().min(2).max(80),
  destination: z.string().trim().min(2).max(100),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
};

function withReturnAfterStart<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).refine(
    (data) => {
      const dates = data as { startDate: string; endDate: string };
      return dates.endDate >= dates.startDate;
    },
    {
      message: "The return date must be after the start date.",
      path: ["endDate"],
    },
  );
}

export const createTripSchema = withReturnAfterStart(tripDetailsFields);

export const updateTripSchema = withReturnAfterStart({
  tripId: z.string().uuid(),
  ...tripDetailsFields,
});

export const addPlaceSchema = z.object({
  tripId: z.string().uuid(),
  cityId: z.string().uuid().optional().or(z.literal("")),
  fsqPlaceId: z.string().min(1).max(255),
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(300).default(""),
  neighborhood: z.string().trim().max(120).default(""),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  category: z.enum(PLACE_CATEGORIES),
  note: z.string().trim().max(500).default(""),
  sourceUrl: z.url().optional().or(z.literal("")),
  saved: z.boolean().default(true),
});

const optionalIsoDate = z.iso.date().optional().or(z.literal(""));

function withOptionalReturnAfterStart<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).refine(
    (data) => {
      const dates = data as { startDate?: string; endDate?: string };
      if (!dates.startDate || !dates.endDate) return true;
      return dates.endDate >= dates.startDate;
    },
    {
      message: "The end date must be after the start date.",
      path: ["endDate"],
    },
  );
}

export const addTripCitySchema = withOptionalReturnAfterStart({
  tripId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  country: z.string().trim().max(100).default(""),
  startDate: optionalIsoDate,
  endDate: optionalIsoDate,
});

export const updateTripCitySchema = withOptionalReturnAfterStart({
  tripId: z.string().uuid(),
  cityId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  country: z.string().trim().max(100).default(""),
  startDate: optionalIsoDate,
  endDate: optionalIsoDate,
});

export const removeTripCitySchema = z.object({
  tripId: z.string().uuid(),
  cityId: z.string().uuid(),
});

export const updatePlaceSchema = z.object({
  tripId: z.string().uuid(),
  placeId: z.string().uuid(),
  saved: z.boolean(),
});

export const updatePlacePlanningSchema = z.object({
  tripId: z.string().uuid(),
  placeId: z.string().uuid(),
  cityId: z.string().uuid().optional().or(z.literal("")),
  plannedDate: z.iso.date().optional().or(z.literal("")),
  daySortOrder: z.number().int().min(0).optional(),
});

export const removePlaceSchema = z.object({
  tripId: z.string().uuid(),
  placeId: z.string().uuid(),
});

export const addDayNoteSchema = z.object({
  tripId: z.string().uuid(),
  cityId: z.string().uuid().optional().or(z.literal("")),
  plannedDate: z.iso.date(),
  note: z.string().trim().min(1).max(500),
});

export const updateDayNoteSchema = z.object({
  tripId: z.string().uuid(),
  noteId: z.string().uuid(),
  cityId: z.string().uuid().optional().or(z.literal("")),
  plannedDate: z.iso.date(),
  note: z.string().trim().min(1).max(500),
});

export const removeDayNoteSchema = z.object({
  tripId: z.string().uuid(),
  noteId: z.string().uuid(),
});

export const directionsSchema = z.object({
  coordinates: z
    .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
    .min(2)
    .max(12),
  mode: z.enum(["walking", "cycling", "driving"]),
});

export const inviteSchema = z.object({
  tripId: z.string().uuid(),
  email: z.email().toLowerCase(),
});

export const signInSchema = z.object({
  email: z.email("Enter a valid email.").toLowerCase(),
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(80),
    email: z.email("Enter a valid email.").toLowerCase(),
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const accountNameSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
});

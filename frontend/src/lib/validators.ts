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
  tripId: z.string().min(1),
  fsqPlaceId: z.string().min(1).max(255),
  category: z.enum(PLACE_CATEGORIES),
  note: z.string().trim().max(500).default(""),
  sourceUrl: z.url().optional().or(z.literal("")),
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

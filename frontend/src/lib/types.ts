export const PLACE_CATEGORIES = [
  "Eat",
  "Drink",
  "See",
  "Shop",
  "Stay",
  "Other",
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export function categoryClass(category: PlaceCategory | "All") {
  return `category-${category.toLowerCase()}`;
}

export function isPersistedTripId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
export type TravelMode = "walking" | "cycling" | "driving";

export type PlacePhoto = {
  url: string;
  width: number;
  height: number;
  alt: string;
  credit: string;
};

export type Place = {
  id: string;
  fsqPlaceId: string;
  cityId?: string | null;
  name: string;
  address: string;
  neighborhood: string;
  category: PlaceCategory;
  note: string;
  sourceUrl?: string;
  coordinates: [longitude: number, latitude: number];
  saved: boolean;
  plannedDate?: string | null;
  daySortOrder?: number;
  addedBy: string;
};

export type CityStop = {
  id: string;
  name: string;
  country: string;
  startDate?: string | null;
  endDate?: string | null;
  sortOrder: number;
};

export type DayNote = {
  id: string;
  cityId?: string | null;
  plannedDate: string;
  note: string;
  sortOrder: number;
  addedBy: string;
};

export type Collaborator = {
  id?: string;
  name: string;
  image?: string | null;
};

export type Trip = {
  id: string;
  title: string;
  destination: string;
  country: string;
  dateLabel: string;
  startDate: string;
  endDate: string;
  cities: CityStop[];
  dayNotes: DayNote[];
  places: Place[];
  collaborators: Collaborator[];
};

export type TripViewer = {
  id: string;
  name: string;
  image?: string | null;
};

export type PlaceSearchResult = Pick<
  Place,
  "fsqPlaceId" | "name" | "address" | "neighborhood" | "coordinates" | "category"
>;

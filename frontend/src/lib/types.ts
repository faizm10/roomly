export const PLACE_CATEGORIES = [
  "Eat",
  "Drink",
  "See",
  "Shop",
  "Stay",
  "Other",
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];
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
  name: string;
  address: string;
  neighborhood: string;
  category: PlaceCategory;
  note: string;
  sourceUrl?: string;
  coordinates: [longitude: number, latitude: number];
  saved: boolean;
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

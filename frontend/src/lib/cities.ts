export type CitySuggestion = {
  id: string;
  name: string;
  label: string;
  region?: string;
  country?: string;
};

export const demoCities: CitySuggestion[] = [
  { id: "lisbon", name: "Lisbon", country: "Portugal", label: "Lisbon, Portugal" },
  { id: "kyoto", name: "Kyoto", country: "Japan", label: "Kyoto, Japan" },
  { id: "montreal", name: "Montréal", country: "Canada", region: "Quebec", label: "Montréal, Canada" },
  { id: "mexico-city", name: "Mexico City", country: "Mexico", label: "Mexico City, Mexico" },
  { id: "marrakesh", name: "Marrakesh", country: "Morocco", label: "Marrakesh, Morocco" },
  { id: "oslo", name: "Oslo", country: "Norway", label: "Oslo, Norway" },
];

export function formatCityLabel(city: { name: string; region?: string; country?: string }) {
  if (city.country && city.country !== city.name) return `${city.name}, ${city.country}`;
  if (city.region && city.region !== city.name) return `${city.name}, ${city.region}`;
  return city.name;
}

export function filterDemoCities(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return demoCities.slice(0, 6);
  return demoCities.filter((city) => city.label.toLowerCase().includes(needle)).slice(0, 6);
}

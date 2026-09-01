const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function formatDateLabel(startDate: string, endDate: string) {
  const monthName = (iso: string) => months[Number(iso.slice(5, 7)) - 1] ?? "";
  const day = (iso: string) => String(Number(iso.slice(8, 10)));
  if (startDate.slice(0, 7) === endDate.slice(0, 7)) {
    return `${monthName(startDate)} ${day(startDate)}—${day(endDate)}`;
  }
  return `${monthName(startDate)} ${day(startDate)}—${monthName(endDate)} ${day(endDate)}`;
}

export function countryFromDestination(destination: string) {
  const parts = destination.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) || destination;
}

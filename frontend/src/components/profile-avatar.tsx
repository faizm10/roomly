type AvatarSize = "sm" | "lg";

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export function ProfileAvatar({
  name,
  image,
  size = "sm",
}: {
  name: string;
  image?: string | null;
  size?: AvatarSize;
}) {
  const className = size === "lg" ? "profile-avatar profile-avatar-lg" : "profile-chip";
  if (image) {
    return (
      <span className={className}>
        <img alt="" referrerPolicy="no-referrer" src={image} />
      </span>
    );
  }
  return <span className={className}>{initialsFromName(name)}</span>;
}

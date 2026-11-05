export type PublicationState = {
  status: "draft" | "scheduled" | "published";
  publishAt: Date | null;
  deletedAt: Date | null;
};

export function isPublic(item: PublicationState, now: Date): boolean {
  if (item.deletedAt !== null) {
    return false;
  }

  if (item.status === "published") {
    return true;
  }

  if (item.status === "scheduled") {
    return item.publishAt !== null && item.publishAt.getTime() <= now.getTime();
  }

  return false;
}

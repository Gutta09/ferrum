import "server-only";
import { collections, ensureIndexes, newId } from "@/lib/mongo";

export interface PhotoOut {
  id: string;
  userId: string;
  date: string;
  url: string;
  workoutId?: string;
}

export async function listPhotos(userId: string): Promise<PhotoOut[]> {
  await ensureIndexes();
  const { photos } = await collections();
  const rows = await photos.find({ userId }).sort({ date: 1 }).toArray();
  return rows.map((p) => ({
    id: p._id,
    userId: p.userId,
    date: p.date,
    url: p.dataUrl,
    workoutId: p.workoutId,
  }));
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// client resizes to ~1000px JPEG (~100–300KB); cap defensively well under
// MongoDB's 16MB document limit
const MAX_LEN = 3_500_000;

export async function addPhoto(
  userId: string,
  input: { date?: string; dataUrl?: string; workoutId?: string }
): Promise<PhotoOut> {
  const dataUrl = String(input.dataUrl ?? "");
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl))
    throw new Error("invalid image");
  if (dataUrl.length > MAX_LEN) throw new Error("image too large");
  const date = input.date && DATE_RE.test(input.date) ? input.date : new Date().toISOString().slice(0, 10);
  const _id = newId("photo");
  const { photos } = await collections();
  await photos.insertOne({
    _id,
    userId,
    date,
    dataUrl,
    workoutId: input.workoutId ? String(input.workoutId).slice(0, 80) : undefined,
    createdAt: new Date(),
  });
  return { id: _id, userId, date, url: dataUrl, workoutId: input.workoutId };
}

export async function removePhoto(userId: string, id: string) {
  const { photos } = await collections();
  // owner-scoped: userId in the filter, so another user's photo can't be deleted
  await photos.deleteOne({ _id: id, userId });
}

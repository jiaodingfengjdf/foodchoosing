import { useState } from "react";
import { useCheckin } from "../api/hooks";
import type { CheckinResponse, RecipeDTO } from "../api/types";
import { compressImage } from "../lib/imageCompress";
import { enqueueCheckin } from "../lib/offlineQueue";
import { fireConfetti } from "../lib/confetti";
import { track } from "../lib/api";

/** 打卡验收弹窗：星级必填、短评选填、照片选填（选中即压缩出预览）。 */
export function CheckinModal({ recipe, onClose, onSuccess }: {
  recipe: RecipeDTO;
  onClose: () => void;
  onSuccess: (r: CheckinResponse) => void;
}) {
  const checkin = useCheckin();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [done, setDone] = useState<CheckinResponse | null>(null);

  const submit = async () => {
    if (!rating) return;
    const form = new FormData();
    form.append("recipe_id", recipe.id);
    form.append("rating", String(rating));
    if (review) form.append("review", review);
    if (photoDataUrl) {
      const blob = await (await fetch(photoDataUrl)).blob();
      form.append("photo", blob, "dish.jpg");
    }

    if (navigator.onLine) {
      checkin.mutate(form, {
        onSuccess: (r) => {
          fireConfetti();
          track("recipe_cook_checkin", {
            recipe_id: recipe.id,
            has_image: photoDataUrl ? 1 : 0,
            streak_days: r.streak,
          });
          setDone(r);
          onSuccess(r);
        },
      });
    } else {
      // 断网：暂存本地，联网后由 App 的回放逻辑补交
      enqueueCheckin({
        recipe_id: recipe.id,
        rating,
        review: review || undefined,
        photoDataUrl: photoDataUrl ?? undefined,
      });
      const local: CheckinResponse = {
        checkin_id: "LOCAL",
        streak: null,
        max_streak: null,
        stat_date: "",
        new_badges: [],
      };
      setDone(local);
      onSuccess(local);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" data-testid="checkin-modal">
      <div className="mx-auto w-full max-w-md rounded-t-3xl bg-white p-5">
        {done ? (
          <div className="py-6 text-center" data-testid="checkin-success">
            <div className="text-5xl">🎉</div>
            {done.streak !== null ? (
              <>
                <p className="mt-3 text-lg font-bold">打卡成功！连续 {done.streak} 天</p>
                {done.streak === done.max_streak && done.streak > 1 && (
                  <p className="text-sm text-amber-600">🔥 新纪录！</p>
                )}
              </>
            ) : (
              <p className="mt-3 text-lg font-bold">已离线暂存，联网后自动同步</p>
            )}
            <button className="mt-5 w-full rounded-full bg-brand-500 py-3 text-white" onClick={onClose}>
              好的
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">
                打卡 · {recipe.name} {recipe.emoji}
              </h2>
              <button onClick={onClose} aria-label="关闭" className="text-neutral-400">
                ×
              </button>
            </div>

            <div className="flex gap-1" data-testid="star-row">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  data-testid={`star-${s}`}
                  aria-label={`${s} 星`}
                  className={`text-3xl ${s <= rating ? "" : "opacity-30"}`}
                  onClick={() => setRating(s)}
                >
                  ⭐
                </button>
              ))}
            </div>

            <textarea
              aria-label="心得"
              maxLength={100}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="写点心得（100 字以内，选填）"
              className="mt-3 w-full rounded-xl bg-neutral-50 p-3 text-sm"
              rows={3}
            />

            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl bg-neutral-50 p-3 text-sm">
              📷 {photoPreview ? "已选照片（点击更换）" : "晒一张成品图（选填）"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const blob = await compressImage(file);
                  const dataUrl = await new Promise<string>((resolve) => {
                    const r = new FileReader();
                    r.onload = () => resolve(r.result as string);
                    r.readAsDataURL(blob);
                  });
                  setPhotoDataUrl(dataUrl);
                  setPhotoPreview(dataUrl);
                }}
              />
              {photoPreview && (
                <img src={photoPreview} alt="preview" className="ml-auto h-10 w-10 rounded object-cover" />
              )}
            </label>

            <button
              className="mt-4 w-full rounded-full bg-brand-500 py-3 font-medium text-white disabled:opacity-40"
              disabled={!rating || checkin.isPending}
              onClick={submit}
            >
              {checkin.isPending ? "提交中…" : "完成打卡"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

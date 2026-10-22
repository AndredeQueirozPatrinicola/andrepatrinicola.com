import { useEffect, useMemo, useState } from "react";

import type { PublicImage } from "../../domain/blog";
import type { Locale } from "../../i18n/config";
import type { StudioApi } from "./api";
import type { Media } from "./types";

/** Library items seen in this tab (preview URLs last an hour; a reload refreshes them). */
const cache = new Map<string, Media>();

export function rememberMedia(media: Media): void {
  cache.set(media.id, media);
}

/** Media for the given ids, fetching the ones not seen yet. */
export function useMediaPreviews(api: StudioApi, ids: string[]): Record<string, Media> {
  const key = [...new Set(ids)].sort().join(",");
  const [, setVersion] = useState(0);

  useEffect(() => {
    const missing = key ? key.split(",").filter((id) => !cache.has(id)) : [];
    if (!missing.length) return;
    let active = true;
    Promise.all(
      missing.map((id) =>
        api.media.get(id).then(
          (media) => cache.set(id, media),
          () => undefined,
        ),
      ),
    ).then(() => {
      if (active) setVersion((value) => value + 1);
    });
    return () => {
      active = false;
    };
  }, [api, key]);

  return useMemo(() => {
    const result: Record<string, Media> = {};
    for (const id of key ? key.split(",") : []) {
      const media = cache.get(id);
      if (media) result[id] = media;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cache.size]);
}

export const previewUrls = (media: Record<string, Media>) =>
  Object.fromEntries(Object.values(media).flatMap((item) => (item.previewUrl ? [[item.id, item.previewUrl]] : [])));

/** Shapes library previews like the public site's images, for the article preview. */
export function previewImages(media: Record<string, Media>, locale: Locale): Record<string, PublicImage> {
  return Object.fromEntries(
    Object.values(media).flatMap((item) =>
      item.previewUrl
        ? [
            [
              item.id,
              {
                id: item.id,
                width: item.width ?? 1200,
                height: item.height ?? 675,
                alt: item.alt[locale] ?? "",
                src: item.previewUrl,
                srcSet: "",
              },
            ],
          ]
        : [],
    ),
  );
}

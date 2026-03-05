/**
 * Strict ordering: sections by order_index, videos (lessons) by order_index.
 * Flattened sequence defines global prev/next and locked (prerequisite) logic.
 */

export interface FlatVideo {
  id: string;
  sectionId: string;
  order: number;
}

export interface SectionWithLessons {
  id: string;
  title: string;
  order: number;
  lessons: Array<{ id: string; order: number }>;
}

/**
 * Returns flattened list of videos in global order for a subject (course).
 */
export function getFlattenedVideos(sections: SectionWithLessons[]): FlatVideo[] {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  const out: FlatVideo[] = [];
  for (const sec of sorted) {
    const lessons = [...(sec.lessons || [])].sort((a, b) => a.order - b.order);
    for (const l of lessons) {
      out.push({ id: l.id, sectionId: sec.id, order: l.order });
    }
  }
  return out;
}

/**
 * Returns previous and next video_id in the global sequence, or null.
 */
export function getPrevNextVideoId(
  flatVideos: FlatVideo[],
  videoId: string
): { previous_video_id: string | null; next_video_id: string | null } {
  const idx = flatVideos.findIndex((v) => v.id === videoId);
  if (idx < 0) {
    return { previous_video_id: null, next_video_id: null };
  }
  return {
    previous_video_id: idx > 0 ? flatVideos[idx - 1].id : null,
    next_video_id: idx < flatVideos.length - 1 ? flatVideos[idx + 1].id : null,
  };
}

/**
 * Returns true if the video is locked: previous video in global order must be completed.
 */
export function isVideoLocked(
  flatVideos: FlatVideo[],
  videoId: string,
  completedVideoIds: Set<string>
): boolean {
  const { previous_video_id } = getPrevNextVideoId(flatVideos, videoId);
  if (!previous_video_id) return false;
  return !completedVideoIds.has(previous_video_id);
}

/**
 * The tracks a person can choose from. This is a small checked library, not a search of SoundCloud.
 *
 * Each identity is the track number SoundCloud's own oEmbed endpoint returned for the track's page,
 * and `resolved` is the day it last did. The server accepts a track only if it is listed here, so a
 * player address is never built from text a user supplied.
 */
export type CatalogTrack = {
  track: string;
  title: string;
  artist: string;
  page: string;
  resolved: string;
};

export const catalog: readonly CatalogTrack[] = [
  { track: "soundcloud:296089690", title: "Chill Day", artist: "LAKEY INSPIRED", page: "https://soundcloud.com/lakeyinspired/chill-day", resolved: "2026-11-22" },
  { track: "soundcloud:322500042", title: "Better Days", artist: "LAKEY INSPIRED", page: "https://soundcloud.com/lakeyinspired/better-days", resolved: "2026-11-22" },
  { track: "soundcloud:437080521", title: "Blue Boi", artist: "LAKEY INSPIRED", page: "https://soundcloud.com/lakeyinspired/blue-boi", resolved: "2026-11-22" },
  { track: "soundcloud:333808909", title: "Warm Nights", artist: "LAKEY INSPIRED", page: "https://soundcloud.com/lakeyinspired/warm-nights", resolved: "2026-11-22" },
  { track: "soundcloud:323695178", title: "The Process", artist: "LAKEY INSPIRED", page: "https://soundcloud.com/lakeyinspired/the-process", resolved: "2026-11-22" },
  { track: "soundcloud:354495827", title: "Me 2 (Feat. Julian Avila)", artist: "LAKEY INSPIRED", page: "https://soundcloud.com/lakeyinspired/me-2-feat-julian-avila", resolved: "2026-11-22" },
  { track: "soundcloud:681078026", title: "Arcade", artist: "LAKEY INSPIRED", page: "https://soundcloud.com/lakeyinspired/arcade", resolved: "2026-11-22" },
  { track: "soundcloud:335567654", title: "In My Dreams", artist: "LAKEY INSPIRED", page: "https://soundcloud.com/lakeyinspired/in-my-dreams", resolved: "2026-11-22" },
  { track: "soundcloud:344935245", title: "Days Like These", artist: "LAKEY INSPIRED", page: "https://soundcloud.com/lakeyinspired/days-like-these", resolved: "2026-11-22" },
  { track: "soundcloud:190269240", title: "Tobu - Candyland [NCS Release]", artist: "NCS", page: "https://soundcloud.com/nocopyrightsounds/tobu-candyland-ncs-release", resolved: "2026-11-22" },
  { track: "soundcloud:205462171", title: "DEAF KEV - Invincible [NCS Release]", artist: "NCS", page: "https://soundcloud.com/nocopyrightsounds/deaf-kev-invincible-ncs-release", resolved: "2026-11-22" },
  { track: "soundcloud:294880565", title: "Unknown Brain - Superhero (feat. Chris Linton) [NCS Release]", artist: "NCS", page: "https://soundcloud.com/nocopyrightsounds/unknown-brain-superhero-feat-chris-linton-ncs-release", resolved: "2026-11-22" },
  { track: "soundcloud:293", title: "Flickermood", artist: "Forss", page: "https://soundcloud.com/forss/flickermood", resolved: "2026-11-22" },
  { track: "soundcloud:295", title: "Journeyman", artist: "Forss", page: "https://soundcloud.com/forss/journeyman", resolved: "2026-11-22" },
];

const byTrack = new Map(catalog.map(entry => [entry.track, entry]));

export function findTrack(track: string) {
  return byTrack.get(track) ?? null;
}

/** The address of SoundCloud's embedded player for a catalog track, in the form its Widget API documents. */
export function playerUrl(entry: CatalogTrack) {
  const number = entry.track.slice("soundcloud:".length);
  const source = encodeURIComponent(`https://api.soundcloud.com/tracks/${number}`);
  return `https://w.soundcloud.com/player/?url=${source}&auto_play=true&color=%236b47cf`
    + "&buying=false&sharing=false&download=false&show_playcount=false";
}

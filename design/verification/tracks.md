# Catalog playback

Checked 2026-11-23 with `bun run check:tracks` in Google Chrome, from one network, with the
player muted. A track passes when the widget is ready, SoundCloud does not block it, and playback
advances at least 3 seconds. `ALLOW` or `MONETIZE` means the full track plays; `SNIP` means only a preview.
Whether the sound is audible to a person, and whether the tracks play in other regions or
browsers, is not shown by this check.

| Track | Artist | Ready after | Sound started after | Policy | Length | Played to | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chill Day | LAKEY INSPIRED | 0.9 s | 1.5 s | MONETIZE | 186 s | 3.0 s | plays |
| Better Days | LAKEY INSPIRED | 0.7 s | 1.3 s | MONETIZE | 207 s | 3.0 s | plays |
| Blue Boi | LAKEY INSPIRED | 1.0 s | 1.4 s | MONETIZE | 106 s | 3.0 s | plays |
| Warm Nights | LAKEY INSPIRED | 0.9 s | 1.6 s | MONETIZE | 173 s | 3.0 s | plays |
| The Process | LAKEY INSPIRED | 0.8 s | 1.6 s | MONETIZE | 224 s | 3.0 s | plays |
| Me 2 (Feat. Julian Avila) | LAKEY INSPIRED | 1.1 s | 1.8 s | MONETIZE | 181 s | 3.0 s | plays |
| Arcade | LAKEY INSPIRED | 1.0 s | 1.5 s | MONETIZE | 108 s | 3.0 s | plays |
| In My Dreams | LAKEY INSPIRED | 1.1 s | 1.7 s | MONETIZE | 161 s | 3.0 s | plays |
| Days Like These | LAKEY INSPIRED | 0.9 s | 1.6 s | MONETIZE | 157 s | 3.0 s | plays |
| Tobu - Candyland [NCS Release] | NCS | 1.0 s | 1.5 s | MONETIZE | 201 s | 3.0 s | plays |
| DEAF KEV - Invincible [NCS Release] | NCS | 1.0 s | 1.6 s | MONETIZE | 280 s | 3.0 s | plays |
| Unknown Brain - Superhero (feat. Chris Linton) [NCS Release] | NCS | 0.9 s | 1.4 s | MONETIZE | 179 s | 3.0 s | plays |
| Flickermood | Forss | 0.8 s | 1.3 s | MONETIZE | 214 s | 3.0 s | plays |
| Journeyman | Forss | 0.8 s | 1.6 s | MONETIZE | 409 s | 3.0 s | plays |

14 of 14 plays succeeded.

## The one stall, diagnosed

On commit `bb09f35`, one run of this check failed. Blue Boi became ready, played 0.5 s,
and then did not advance for 24 s. To find out whether the track or the app was at
fault, the check was extended to time when each player becomes ready and when sound
starts, and Blue Boi was replayed on its own:

```sh
bun run check:tracks --only "Blue Boi" --repeat 12
```

All 12 plays succeeded: ready after 0.6 to 0.9 s, sound after 1.1 to 1.4 s. Across every
saved run (about 55 plays, including the deployed run), the stall happened once,
mid-play, after the player was ready. The conclusion is a passing network delay rather
than a problem with the track. Because a person could still meet one, the player now
says "Not playing? Press play in the player, or open it on SoundCloud" when a ready
track has made no sound for 8 s ([D12](../decisions.md#d12-a-player-that-stalls-says-so)).
The browser journeys reproduce a stall by blocking the audio host, and check that hint.

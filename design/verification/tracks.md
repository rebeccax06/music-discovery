# Catalog playback

Checked 2026-11-23 with `bun run check:tracks` in Google Chrome, from one network, with the
player muted. A track passes when the widget is ready, SoundCloud does not block it, and playback
advances at least 3 seconds. `ALLOW` or `MONETIZE` means the full track plays; `SNIP` means only a preview.
Whether the sound is audible to a person, and whether the tracks play in other regions or
browsers, is not shown by this check.

| Track | Artist | Ready | Policy | Length | Played to | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Chill Day | LAKEY INSPIRED | yes | MONETIZE | 186 s | 3.0 s | plays |
| Better Days | LAKEY INSPIRED | yes | MONETIZE | 207 s | 3.0 s | plays |
| Blue Boi | LAKEY INSPIRED | yes | MONETIZE | 106 s | 3.0 s | plays |
| Warm Nights | LAKEY INSPIRED | yes | MONETIZE | 173 s | 3.0 s | plays |
| The Process | LAKEY INSPIRED | yes | MONETIZE | 224 s | 3.0 s | plays |
| Me 2 (Feat. Julian Avila) | LAKEY INSPIRED | yes | MONETIZE | 181 s | 3.0 s | plays |
| Arcade | LAKEY INSPIRED | yes | MONETIZE | 108 s | 3.0 s | plays |
| In My Dreams | LAKEY INSPIRED | yes | MONETIZE | 161 s | 3.0 s | plays |
| Days Like These | LAKEY INSPIRED | yes | MONETIZE | 157 s | 3.0 s | plays |
| Tobu - Candyland [NCS Release] | NCS | yes | MONETIZE | 201 s | 3.0 s | plays |
| DEAF KEV - Invincible [NCS Release] | NCS | yes | MONETIZE | 280 s | 3.0 s | plays |
| Unknown Brain - Superhero (feat. Chris Linton) [NCS Release] | NCS | yes | MONETIZE | 179 s | 3.0 s | plays |
| Flickermood | Forss | yes | MONETIZE | 214 s | 3.0 s | plays |
| Journeyman | Forss | yes | MONETIZE | 409 s | 3.0 s | plays |

14 of 14 tracks play.
**Intermittent result.** In the run before this one, on the same commit, Blue Boi became
ready but played only 0.5 s in 25 s, and the check failed. Every other track played,
and this rerun passed for all 14. The likely cause is buffering on this network, but
it was not diagnosed further. Run the check again before each milestone and on the
deployed app; a track that fails twice in a row should be replaced in the catalog.

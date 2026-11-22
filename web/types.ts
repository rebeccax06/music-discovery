import type { SoundItOutWireHttp } from "../generated/wire.ts";

type Output<Path extends keyof SoundItOutWireHttp> = SoundItOutWireHttp[Path]["output"];

export type Account = Output<"/auth/me">;
export type Word = Output<"/wall/list">["wall"]["words"][number];
export type Example = Word["examples"][number];
export type Suggestion = Word["suggestions"][number];
export type Fit = Exclude<Suggestion["fit"], "PENDING">;
export type PublicWall = Output<"/wall/public">;
export type PublicWord = PublicWall["wall"]["words"][number];
export type PublicExample = PublicWord["examples"][number];
export type SentSuggestion = Output<"/suggestions/sent">["suggestions"][number];
export type Circle = Output<"/friends/list">["circle"];
export type Friend = Circle["friends"][number];
export type Audience = Word["visibility"];

/** What an action hands back: nothing when it worked, or a sentence to show beside the control. */
export type Failure = string | undefined;

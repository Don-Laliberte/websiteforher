/** All of the site's words live here so you can tweak them before you send the link. */

export const herName = "Sunnie";

/** First screen before the room loads — answer starts the room + next hello. */
export const guessPrompt = "Guess what?";

export const chickenButtLabel = "Chicken Butt";

/** Second beat after the room begins fading in — then the real question. */
export const haiPrompt = "Hai!";

export const haiLabel = "Hi ^_^";

export const question = "Will you be my girlfriend? Officially.";

export const yesLabel = "Yes";

/** Shown on the No button as she keeps trying — playful, never guilt-trippy. */
export const noLabels = [
  "No",
  "Are you sure?",
  "The lilies say yes",
  "Number 12 is rooting for you",
  "Even Usagi would hop to yes",
] as const;

export const celebrationTitle = "Okay. It's official.";

/** Rewrite this before you send her the link. Leave empty to hide the note. */
export const celebrationNote = "I already knew you'd say yes. ♡";

/** Optional signature under the celebration note. */
export const yourName = "";

/**
 * Every piece of text the picker shows. Override any of them (for wording or
 * translation) with the element's `strings` property. `{name}`, `{count}`,
 * `{query}`, and `{message}` are filled in where they appear.
 */
export const DEFAULT_STRINGS = {
  heading: "Share your health information",
  description: "Fill in this form from a health app you already use.",
  loading: "Looking for health apps…",

  platformTitle: "Use an app on this phone",
  platformDetail: "Your phone shows the health apps you have",
  platformTitleDesktop: "Use an app on your phone",
  platformDetailDesktop: "Scan a code with your phone's camera",
  webDivider: "or a health app on the web",
  onlyTitle: "Continue with {name}",
  onlyDetail: "Opens in a new tab",
  rememberedDetail: "You used this last time",
  useDifferent: "Use a different app",

  moreTitle: "More health apps",
  moreDetail: "{count} more, and a search box",
  selectorTitle: "Choose a health app",
  selectorDetail: "{count} apps can fill in this form.",
  search: "Find your app",
  noMatches: "No apps match “{query}”.",
  close: "Close",

  noneTitle: "No health apps can connect from this browser",
  noneDetail: "You can fill in the form yourself, or open this page on a phone with a health app.",

  waitingWebTitle: "Finish in {name}",
  waitingWebDetail: "It opened in a new tab. Choose what to share there, and you'll come back here.",
  waitingPlatformTitle: "Finish on your phone",
  waitingPlatformDetail: "Your phone is asking which health app to use and what to share.",
  cancel: "Cancel",

  doneTitle: "Shared from {name}",
  doneDetail: "Your information was added to this page.",
  shareAgain: "Share again or use a different app",
  declinedTitle: "Nothing was shared",
  declinedDetail: "You closed {name} before sharing. You can try again or fill in the form yourself.",
  blockedTitle: "Your browser blocked the new tab",
  blockedDetail: "Allow pop-ups for this site, then try again.",
  errorTitle: "Something went wrong",
  errorDetail: "{message}",
  tryAgain: "Try again",
  chooseDifferent: "Choose a different app",

  footer: "SMART Health Check-in",
};

export type PickerStrings = typeof DEFAULT_STRINGS;

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

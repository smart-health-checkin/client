/**
 * `@smart-health-checkin/client/ui`: the `<smart-checkin-picker>` element.
 *
 * Importing this module registers the element. See `picker-element.ts` for
 * its attributes, properties, and events, and `styles.ts` for the CSS
 * custom properties that reskin it.
 */
import { defineCheckinPicker } from "./picker-element.js";

export { SmartCheckinPicker, defineCheckinPicker, type PickerOutcome, type SmartCheckinPickerEventMap } from "./picker-element.js";
export { DEFAULT_STRINGS, type PickerStrings } from "./strings.js";
export { STARBURST_ICON_URL, STARBURST_SVG } from "./icons.js";
export { PICKER_CSS } from "./styles.js";

defineCheckinPicker();

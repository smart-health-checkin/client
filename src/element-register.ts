/**
 * Drop-in entry: import (or <script type="module" src=…>) this file and
 * <smart-checkin> is registered and ready to use. Built to /element.js on the
 * deployed site for zero-setup experimentation; vendor a pinned copy for
 * anything real.
 */

import { defineSmartCheckin } from "./kit/element.ts";

defineSmartCheckin();

export { defineSmartCheckin, SmartCheckinElement } from "./kit/element.ts";

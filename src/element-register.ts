/**
 * Drop-in entry: import (or <script type="module" src=…>) this file and
 * <smart-checkin> is registered and ready to use. The full kit API
 * (requestCheckin, registerScenario, runCheckin, …) is re-exported so one
 * hosted URL serves both the declarative and programmatic flavors.
 * Built to /element.js on the deployed site for zero-setup experimentation;
 * vendor a pinned copy for anything real.
 */

import { defineSmartCheckin } from "./kit/element.ts";

defineSmartCheckin();

export * from "./index.ts";

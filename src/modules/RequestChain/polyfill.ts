/**
 * Drash - A microframework for building JavaScript/TypeScript HTTP systems.
 * Copyright (C) 2023  Drash authors. The Drash authors are listed in the
 * AUTHORS file at <https://github.com/drashland/drash/AUTHORS>. This notice
 * applies to Drash version 3.X.X and any later version.
 *
 * This file is part of Drash. See <https://github.com/drashland/drash>.
 *
 * Drash is free software: you can redistribute it and/or modify it under the
 * terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 *
 * Drash is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * Drash. If not, see <https://www.gnu.org/licenses/>.
 */

// Imports > Standard
import {
  GroupConsoleLogger,
  Level,
} from "../../standard/log/GroupConsoleLogger.ts";

// Imports > Modules
import { RequestChain } from "../base/RequestChain.ts";

// Imports > Local
import { URLPatternPolyfillResourcesIndex } from "./polyfill/URLPatternPolyfillResourcesIndex.ts";

const logger = GroupConsoleLogger.create(
  "(mod.polyfill) RequestChain",
  Level.Off,
);

// FILE MARKER - PUBLIC API ////////////////////////////////////////////////////

export { AbstractResource as Resource } from "../../standard/http/AbstractResource.ts";
export { Middleware } from "../../standard/http/Middleware.ts";

/**
 * Get the builder that builds an HTTP request chain.
 */
export function builder() {
  return RequestChain
    .builder()
    .resourcesFinderClass(URLPatternPolyfillResourcesIndex);
}

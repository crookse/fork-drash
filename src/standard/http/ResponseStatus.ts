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

// Imports > Core
import { StatusCode } from "../../core/http/response/StatusCode.ts";
import { StatusCodeDescription } from "../../core/http/response/StatusCodeDescription.ts";
import type { ResponseStatusCode, ResponseStatusCodeDescription, ResponseStatusCodeName } from "../../core/Types.ts";

type Status = {
  code: ResponseStatusCode;
  description: ResponseStatusCodeDescription;
}

class ResponseStatus {
  /**
   * Get a status code object.
   * @param statusCode A valid status code. See HTTP Status link below for a
   * list of valid status codes.
   * @returns An object with a status code and description or `undefined` if
   * the provided `statusCode` is invalid.
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status}
   */
  static get(statusCode: ResponseStatusCode): Status | undefined {
    const entries = Object.entries<number>(
      StatusCode
    ) as [ResponseStatusCodeName, ResponseStatusCode][];

    for (const [ key, value ] of entries) {
      if (value === statusCode) {
        return {
          code: statusCode,
          description: StatusCodeDescription[key],
        }
      }
    }
  }
}

// FILE MARKER - PUBLIC API ////////////////////////////////////////////////////

export { ResponseStatus };

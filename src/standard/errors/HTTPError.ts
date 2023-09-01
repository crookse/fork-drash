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
import { ResponseStatus } from "../http/ResponseStatus.ts";
import { ResponseStatusCode } from "../../core/Types.ts";
import { StatusCode } from "../../core/http/response/StatusCode.ts";
import { StatusCodeDescription } from "../../core/http/response/StatusCodeDescription.ts";

/**
 * Base class for all HTTP errors in Drash. Use this class to throw uniform HTTP
 * errors.
 *
 * @example
 *
 * ```ts
 * // Usage in resource's GET method
 *
 * class MyResource extends Resource {
 *   public GET(request: Request) {
 *     if (!request.header("authorization")) {
 *       throw new HTTPError(401, "Get out!");
 *     }
 *
 *     return new Response("Authed");
 *   }
 * }
 * ```
 */
class HTTPError extends Error {
  /**
   * The HTTP status code associated with this error.
   */
  public readonly code: ResponseStatusCode;
  public readonly code_description: string;

  /**
   * The name of this error to be used with conditionals that do not work with
   * `instanceof`.
   *
   * @example
   * ```ts
   * // If this is false ...
   * console.log(error instanceof HTTPError);
   *
   * // ... then do this
   * console.log(error.name === 'HTTPError');
   * ```
   */
  public readonly name = "HTTPError";

  /**
   * @param statusCode A valid HTTP status code. If an unknown HTTP status code
   * is provided, then `500` will be used.
   * @param message (optional) The error message.
   */
  constructor(statusCode: ResponseStatusCode, message?: string) {
    super(message);

    this.code = StatusCode.InternalServerError;
    this.code_description = StatusCodeDescription.InternalServerError;

    const status =  ResponseStatus.get(statusCode);

    if (status) {
      this.code = status.code;
      this.code_description = status.description;
    }

    if (!this.message) {
      this.message = this.code_description;
    }
  }
}

// FILE MARKER - PUBLIC API ////////////////////////////////////////////////////

export { HTTPError };

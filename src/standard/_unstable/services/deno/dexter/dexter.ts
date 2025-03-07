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

import { ConsoleLogger, LoggerConfigs } from "./deps.ts";
import { Request, Response } from "../../../mod.deno.ts";

/**
 * See
 * https://doc.deno.land/https/deno.land/x/drash/src/interfaces/logger_configs.ts
 * for information on `Drash.Interfaces.LoggerConfigs`.
 *
 * response_time?: boolean
 *
 *     Are response times enabled?
 */
interface IDexterConfigs extends LoggerConfigs {
  // deno-lint-ignore camelcase
  response_time?: boolean;
  url?: boolean;
  datetime?: boolean;
  method?: boolean;
  enabled?: boolean;
}

/**
 * A logger middleware inspired by https://www.npmjs.com/package/morgan.
 *
 * @param configs - See IDexterConfigs
 *
 * @example
 * ```ts
 * const dexter = Dexter()
 * const dexter = Dexter({
 *  response_time: true,
 *
 * })
 * ```
 */
export class DexterService {
  public configs: IDexterConfigs;

  #timeEnd = 0;

  #timeStart = 0;

  public logger: ConsoleLogger;

  constructor(configs: IDexterConfigs = {}) {
    configs = {
      level: configs.level ?? "all",
      datetime: configs.datetime || true,
      url: configs.url || false,
      method: configs.method || false,
      response_time: configs.response_time || false,
      enabled: configs.enabled === undefined ? true : configs.enabled,
      tag_string: configs.tag_string ?? "",
      tag_string_fns: configs.tag_string_fns ?? {},
    };

    this.configs = configs;

    // If a user has defined specific strings we allow, ensure they are set
    // before we hand it off to unLogger to process into a log statement
    if (configs?.datetime !== false) {
      this.configs.tag_string += "{datetime} |";
      this.configs.tag_string_fns!.datetime = () =>
        new Date().toISOString().replace("T", " ").split(".")[0];
    }

    this.logger = new ConsoleLogger(this.configs);
  }

  runBeforeResource(request: Request, _response: Response) {
    if (this.configs.enabled === false) {
      return;
    }

    this.#timeStart = new Date().getTime();
    let message = "Request received";

    if (this.configs.url) {
      message = request.url + " | " + message;
    }

    if (this.configs.method) {
      message = request.method.toUpperCase() + " | " + message;
    }

    this.logger.info(message);
  }

  runAfterResource(request: Request, _response: Response) {
    if (!this.configs.response_time) {
      return;
    }
    if (this.configs.enabled === false) {
      return;
    }
    this.#timeEnd = new Date().getTime();
    let message = "Response sent [" + getTime(this.#timeEnd, this.#timeStart) +
      "]";
    if (this.configs.url) {
      message = request.url + " | " + message;
    }
    if (this.configs.method) {
      message = request.method.toUpperCase() + " | " + message;
    }
    this.logger.info(message);
  }
}

/**
 * Get the time it takes for the middleware to execute the
 * request-resource-response lifecycle in ms.
 *
 * @param end - The time at the point the response was sent.
 * @param start - The time at the point the request was received.
 *
 * @returns The time in ms as a string.
 */
function getTime(end: number, start: number): string {
  return `${end - start} ms`;
}

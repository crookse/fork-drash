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

import { Chain as BaseChain } from "../../../../../../../src/modules/base/Chain.ts";
import { RequestParamsParser } from "../../../../../../../src/standard/handlers/RequestParamsParser.ts";
import { RequestValidator } from "../../../../../../../src/standard/handlers/RequestValidator.ts";
import { ResourceCaller } from "../../../../../../../src/standard/handlers/ResourceCaller.ts";
import { ResourceNotFoundHandler } from "../../../../../../../src/standard/handlers/ResourceNotFoundHandler.ts";
import { StatusCode } from "../../../../../../../src/core/http/response/StatusCode.ts";
import { StatusDescription } from "../../../../../../../src/core/http/response/StatusDescription.ts";
import { HTTPError } from "../../../../../../../src/core/errors/HTTPError.ts";
import { ResourcesIndex } from "../../../../../../../src/standard/handlers/ResourcesIndex.ts";
import { Resource } from "../../../../../../../src/core/http/Resource.ts";
import { Status } from "../../../../../../../src/core/http/response/Status.ts";

export const protocol = "http";
export const hostname = "localhost";
export const port = 1447;

class Home extends Resource {
  public paths = ["/"];

  public GET(_request: Request) {
    return new Response("Hello from GET.");
  }

  public POST(_request: Request) {
    return new Response("Hello from POST.");
  }

  public DELETE(_request: Request) {
    throw new Error("Hey, I'm the DELETE endpoint. Errrr.");
  }

  public PATCH(_request: Request) {
    throw new HTTPError(Status.MethodNotAllowed);
  }
}

const chain = BaseChain
  .builder()
  .handler(new RequestValidator())
  // @ts-ignore We know URLPattern exists when dev'ing with Deno
  .handler(new ResourcesIndex(URLPattern, Home))
  .handler(new ResourceNotFoundHandler())
  .handler(new RequestParamsParser())
  .handler(new ResourceCaller())
  .build<Request, Promise<Response>>();

export const handleRequest = (
  request: Request,
): Promise<Response> => {
  return chain
    .handle(request)
    .catch((error: Error | HTTPError) => {
      if (
        (error.name === "HTTPError" || error instanceof HTTPError) &&
        "status_code" in error &&
        "status_code_description" in error
      ) {
        return new Response(error.message, {
          status: error.status_code,
          statusText: error.status_code_description,
        });
      }

      return new Response(error.message, {
        status: StatusCode.InternalServerError,
        statusText: StatusDescription.InternalServerError,
      });
    });
};

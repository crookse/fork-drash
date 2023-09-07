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

import { ResourceGroup } from "../../../../../../../src/standard/http/ResourceGroup.ts";
import { StatusCode } from "../../../../../../../src/core/http/response/StatusCode.ts";
import { StatusDescription } from "../../../../../../../src/core/http/response/StatusDescription.ts";
import * as Chain from "../../../../../../../src/modules/RequestChain/mod.native.ts";

export const protocol = "http";
export const hostname = "localhost";
export const port = 1447;

class Home extends Chain.Resource {
  public paths = ["/"];
}

export function handleRequest(
  cors: typeof Chain.Middleware,
  request: Request,
): Promise<Response> {
  const chain = Chain
    .builder()
    .resources(
      ResourceGroup
        .builder()
        .resources(Home)
        .middleware(cors)
        .build(),
    )
    .build<Request, Response>()

  return chain
    .handle(request)
    .catch((error) => {
      console.log({ error });
      return new Response(error.message, {
        status: ("status_code" in error)
          ? error.status_code
          : StatusCode.InternalServerError,
        statusText: ("status_code_description" in error)
          ? error.status_code_description
          : StatusDescription.InternalServerError,
      });
    });
}

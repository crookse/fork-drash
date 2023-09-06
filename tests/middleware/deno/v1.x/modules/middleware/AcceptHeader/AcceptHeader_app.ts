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

import { AcceptHeader } from "../../../../../../../src/modules/middleware/AcceptHeader/mod.ts"
import { catchError } from "../../../../utils.ts";
import { HTTPError } from "../../../../../../../src/core/errors/HTTPError.ts";
import { ResourceGroup } from "../../../../../../../src/standard/http/ResourceGroup.ts";
import { Status } from "../../../../../../../src/core/http/response/Status.ts";
import * as Chain from "../../../../../../../src/modules/RequestChain/mod.native.ts";

export const protocol = "http";
export const hostname = "localhost";
export const port = 1447;

class Home extends Chain.Resource {
  public paths = ["/"];

  public GET(_request: Request) {
    return new Response("Hello from GET.");
  }

  public POST(_request: Request) {
    return new Response(JSON.stringify({ message: "Hello from POST." }), {
      headers: {
        "content-type": "application/json"
      }
    });
  }

  public DELETE(_request: Request) {
    throw new Error("Hey, I'm the DELETE endpoint. Errrr.");
  }

  public PATCH(_request: Request) {
    throw new HTTPError(Status.MethodNotAllowed);
  }
}

const acceptHeaderResources = ResourceGroup
  .builder()
  .resources(Home)
  .middleware(new AcceptHeader({ fail_on_accept_header_mismatch: true }))
  .build();

const chain = Chain
  .builder()
  .resources(acceptHeaderResources)
  .build<Request, Response>();

export const handleRequest = (
  request: Request,
): Promise<Response> => {
  return chain
    .handle(request)
    .catch(catchError);
};

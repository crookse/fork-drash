// Drash imports
import { HTTPError } from "@/src/core/errors/HTTPError.ts";
import { StatusByCode } from "@/src/core/http/Status.ts";
import * as Chain from "@/src/modules/RequestChain/native.ts";

export const protocol = "http";
export const hostname = "localhost";
export const port = 1447;

class Home extends Chain.Resource {
  public paths = ["/"];

  public GET(request: Request) {
    return new Response("Hello from GET.");
  }

  public POST(request: Request) {
    return new Response("Hello from POST.");
  }

  public DELETE(request: Request) {
    throw new Error("Hey, I'm the DELETE endpoint. Errrr.");
  }

  public PATCH(request: Request) {
    throw new HTTPError(405);
  }
}

const chain = Chain
  .builder()
  .resources(Home)
  .build<Request, Response>();

export const send = (
  request: Request,
): Promise<Response> => {

  return chain
    .handle(request)
    .catch((error: Error | HTTPError) => {
      if (
        (error.name === "HTTPError" || error instanceof HTTPError) &&
        "code" in error &&
        "code_description" in error
      ) {
        return new Response(error.message, {
          status: error.code,
          statusText: error.code_description,
        });
      }

      return new Response(error.message, {
        status: StatusByCode[500].Code,
        statusText: StatusByCode[500].Description,
      });
    });
};

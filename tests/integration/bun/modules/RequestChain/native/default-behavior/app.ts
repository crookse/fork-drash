import { HTTPError } from "@/.drashland/builds/esm/standard/errors/HTTPError";
import { StatusCode } from "@/.drashland/builds/esm/standard/http/response/StatusCode";
import { StatusDescription } from "@/.drashland/builds/esm/standard/http/response/StatusDescription";
import * as Chain from "@/.drashland/builds/esm/modules/RequestChain/native";

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
        status: StatusCode.InternalServerError,
        statusText: StatusDescription.InternalServerError,
      });
    });
};

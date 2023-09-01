import { AbstractResource } from "../../../../../../../src/standard/http/AbstractResource.ts";
import { Chain as BaseChain } from "../../../../../../../src/modules/base/Chain.ts";
import { Handler } from "../../../../../../../src/standard/handlers/Handler.ts";
import { HTTPError } from "../../../../../../../src/standard/errors/HTTPError.ts";
import { MethodOf } from "../../../../../../../src/core/Types.ts";
import { Resource } from "../../../../../../../src/modules/RequestChain/mod.native.ts";
import { ResourceNotFoundHandler } from "../../../../../../../src/standard/handlers/ResourceNotFoundHandler.ts";
import { SearchResult } from "../../../../../../../src/modules/base/ResourcesIndex.ts";
import { StatusCode } from "../../../../../../../src/standard/http/response/StatusCode.ts";
import { StatusDescription } from "../../../../../../../src/standard/http/response/StatusDescription.ts";
import { URLPatternResourcesIndex } from "../../../../../../../src/modules/RequestChain/native/URLPatternResourcesIndex.ts";

export const protocol = "http";
export const hostname = "localhost";
export const port = 1447;

type Ctx = { request: Request; response?: Response; resource?: Resource };

class Home extends AbstractResource {
  public paths = ["/"];

  public GET(ctx: Ctx) {
    ctx.response = new Response(`Hello from GET.`);
  }

  public POST(ctx: Ctx) {
    ctx.response = new Response("Hello from POST.");
  }

  public DELETE(_ctx: Ctx) {
    throw new Error("Hey, I'm the DELETE endpoint. Errrr.");
  }

  public PATCH(_ctx: Ctx) {
    throw new HTTPError(405);
  }
}

// Set up a wrapper to use `.use( (...) => {...} )` instead of `.handler(new Handler())`

class UseInsteadOfHandleBuilder extends BaseChain.Builder {
  public use(handlerFn: (ctx: Ctx) => void): this {
    class UseHandler extends Handler<Ctx, Promise<void>> {
      handle(ctx: Ctx): Promise<void> {
        return Promise
          .resolve()
          .then(() => handlerFn(ctx))
          .then(() => {
            if (this.next_handler) {
              return super.nextHandler(ctx);
            }
          });
      }
    }

    const handler = new UseHandler();

    Object.defineProperty(handler.constructor, "name", {
      value: handlerFn.name,
    });

    return super.handler(handler);
  }
}

// Build the chain

const resourceIndex = new URLPatternResourcesIndex(Home);
const resourceNotFoundHandler = new ResourceNotFoundHandler();
class ReturnSearchResult extends Handler<SearchResult, SearchResult> {
  handle(result: SearchResult): SearchResult {
    return result;
  }
}

resourceIndex
  .setNext(resourceNotFoundHandler)
  .setNext(new ReturnSearchResult());

const chain = (new UseInsteadOfHandleBuilder())
  .use(function ReceiveRequest(ctx: Ctx) {
    if (!ctx.request) {
      throw new Error("No request found");
    }
  })
  .use(function FindResource(ctx) {
    return resourceIndex
      .handle(ctx.request) // Last handler is `ReturnSearchResult` and we can chain `then` from it
      .then((result) => {
        ctx.resource = result?.resource;
      });
  })
  .use(function CallResource(ctx: Ctx) {
    if (!ctx.resource) {
      throw new HTTPError(500, "No resource");
    }
    return ctx.resource
      [ctx.request.method?.toUpperCase() as MethodOf<Resource>](ctx);
  })
  .use(function SendResponse(ctx) {
    if (!ctx.response) {
      ctx.response = new Response("Woops", { status: 500 });
    }
  })
  .build<Ctx, Promise<void>>();

export const handleRequest = (
  request: Request,
): Promise<Response> => {
  const ctx: Ctx = { request };

  return chain
    .handle(ctx)
    .then(() => {
      if (!ctx.response) {
        return new Response("No response", { status: 500 });
      }

      return ctx.response;
    })
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

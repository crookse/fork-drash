import { Header } from "../../../core/http/Header.ts";
import { Middleware } from "../../../standard/http/Middleware.ts";
import { response } from "./ETagResponse.ts";
import { ResponseStatus, ResponseStatusName } from "../../../core/Types.ts";
import { Status } from "../../../core/http/response/Status.ts";
import { StatusCode } from "../../../core/http/response/StatusCode.ts";
import { StatusDescription } from "../../../core/http/response/StatusDescription.ts";
import { HTTPError } from "../../../core/errors/HTTPError.ts";

const defaultOptions: Options = {
  hash_length: 27,
  weak: false,
};

type Options = {
  weak?: boolean;
  hash_length?: number;
};

type Context = {
  request: Request;
  response: Response;
  etag?: string;
  done?: boolean;
};

type CachedResource = {
  [Header.ETag]: string;
  [Header.LastModified]: string;
};

class ETagMiddleware extends Middleware {
  #cache: Record<string, CachedResource> = {};
  #default_etag = '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"';
  #options: Options;

  constructor(options: Options) {
    super();

    this.#options = {
      ...defaultOptions,
      ...options,
    };
  }

  ALL(request: Request): Promise<Response> {
    return Promise
      .resolve()
      .then(() => this.handleEtagMatchesRequestIfMatchHeader(request))
      .then(() => this.next<Response>(request))
      .then((response) => ({ request, response }))
      .then((context) => this.handleIfResponseEmpty(context))
      .then((context) => this.createEtagHeader(context))
      .then((context) =>
        this.handleEtagMatchesRequestIfNoneMatchHeader(context)
      )
      .then((context) => this.sendResponse(context));
  }

  protected createEtagHeader(context: Context) {
    if (context.done) {
      return context;
    }

    return response(context.response)
      .etagHeader(this.#options)
      .then((etag) => {
        context.etag = etag;
        return context;
      });
  }

  protected createLastModifiedHeader() {
    return new Date().toUTCString();
  }

  protected getCacheKey(request: Request) {
    const { method, url } = request;
    return method + ";" + url;
  }

  protected handleEtagMatchesRequestIfNoneMatchHeader(context: Context) {
    if (context.done) {
      return context;
    }

    if (!context.etag) {
      return context;
    }

    if (context.request.headers.get(Header.IfNoneMatch) === context.etag) {
      // Edge case: We need to check if the etag was already cached. If we do
      // not do this, then we could end up sending a 304 for a response that
      // this middleware has not processed yet. This can happen if a client
      // sends a request with an etag (for shits and giggles) and the response
      // to that request's etag matches. In this case, we need to send the
      // repsonse as if it was being requested for the first time. After that,
      // we cache the etag so subsequent requests result in a 304 response.
      if (this.requestIsCached(context.request)) {
        context.response = new Response(null, {
          status: StatusCode.NotModified,
          statusText: StatusDescription.NotModified,
          headers: {
            [Header.ETag]: context.etag,
            [Header.LastModified]: this
              .#cache[this.getCacheKey(context.request)][Header.LastModified],
          },
        });

        context.done = true;
      }
    }

    return context;
  }

  protected handleEtagMatchesRequestIfMatchHeader(request: Request) {
    if (!this.requestIsCached(request)) {
      return;
    }

    if (!request.headers.get(Header.IfMatch)) {
      return;
    }

    const cacheKey = this.getCacheKey(request);
    const ifMatchHeader = request.headers.get(Header.IfMatch);

    // If the headers do not match, then a mid-air collision will happen if
    // we do not error out
    if (ifMatchHeader !== this.#cache[cacheKey][Header.ETag]) {
      throw new HTTPError(Status.PreconditionFailed);
    }
  }

  protected handleIfResponseEmpty(context: Context) {
    if (context.done) {
      return context;
    }

    const contentLength = context.response.headers.get(Header.ContentLength);

    // This method should only handle empty responses. That is, a response with
    // no body. So gtfo if you got one.
    if (
      context.response.body ||
      (context.response.body !== null) ||
      (contentLength && contentLength !== "0")
    ) {
      return context;
    }

    let lastModified;

    // If etag is already present, then use the previous last-modified value
    if (context.request.headers.get(Header.IfNoneMatch)) {
      lastModified = this.#cache[this.#default_etag][Header.LastModified];
    } else {
      // Otherwise, create a new "Last-Modified" value
      lastModified = this.createLastModifiedHeader();
      this.#cache[this.getCacheKey(context.request)][Header.LastModified] =
        lastModified;
    }

    context.response = new Response(null, {
      status: StatusCode.NotModified,
      statusText: StatusDescription.NotModified,
      headers: {
        [Header.ETag]: this.#default_etag,
        [Header.LastModified]: lastModified,
      },
    });

    context.done = true;

    return context;
  }

  protected requestIsCached(request: Request) {
    if (this.getCacheKey(request) in this.#cache) {
      return true;
    }

    return false;
  }

  protected sendResponse(context: Context) {
    if (context.done) {
      return context.response;
    }

    if (!context.etag) {
      throw new Error("Error generating ETag");
    }

    const newLastModifiedDate = this.createLastModifiedHeader();
    this.#cache[this.getCacheKey(context.request)] = {
      [Header.ETag]: context.etag,
      [Header.LastModified]: newLastModifiedDate,
    };

    const responseStatusCode = context.response.status;
    let status: ResponseStatus = Status.OK;

    for (const [name, statusCode] of Object.entries(StatusCode)) {
      if (responseStatusCode === statusCode) {
        status = Status[name as ResponseStatusName];
      }
    }

    return new Response(context.response.body, {
      status: status.code,
      statusText: status.description,
      headers: {
        [Header.ETag]: context.etag,
        [Header.LastModified]: newLastModifiedDate,
      },
    });
  }
}

/**
 * Create the ETag middleware.
 * @param options (optional) Options to use for creating the ETag header.
 * @returns The middleware class that can be instantiated. WHen it is
 * instantiated, it instantiate with the provided `options` or default to its
 * default options if no options are provided.
 */
function ETag(options: Options = defaultOptions) {
  return class DefaultEtagMiddleware extends ETagMiddleware {
    constructor() {
      super(options);
    }
  };
}

// FILE MARKER - PUBLIC API ////////////////////////////////////////////////////

export { defaultOptions, ETag, ETagMiddleware, type Options };

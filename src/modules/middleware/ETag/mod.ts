import { RequestMethod, ResponseStatus } from "../../../core/Types.ts";
import { ResponseStatusCode } from "../../../core/types/ResponseStatusCode.ts";
import { Method } from "../../../core/http/request/Method.ts";
import { HTTPError } from "../../../core/errors/HTTPError.ts";
import { Middleware } from "../../../standard/http/Middleware.ts";
import { StatusCode } from "../../../core/http/response/StatusCode.ts";
import { StatusDescription } from "../../../core/http/response/StatusDescription.ts";
import { Status } from "../../../core/http/response/Status.ts";

export type Options = {
  cookie?: boolean;
  weak: boolean;
};

const defaultOptions: Options = {
  cookie: false,
  weak: false,
};

class ResponseBuilder {
  #init: ResponseInit = {};
  #headers: Headers = new Headers();
  #body?: BodyInit | null;

  public headers(headers: Record<string, string>) {
    for (const [k, v] of Object.entries(headers)) {
      this.#headers.set(k, v);
    }

    return this;
  }

  public body(body: BodyInit | null) {
    this.#body = body;

    return this;
  }

  public status(status: ResponseStatus | number) {
    if (typeof status === "number") {
      this.#init.status = status;

      return this;
    }


    const [ code, desc ] = status;
    this.#init.status = code;
    this.#init.statusText = desc;

    return this;
  }

  public build() {

    return new Response(this.#body, {
      ...this.#init,
      headers: this.#headers,
    });
  }
}

function toHash(response: Response): Promise<string> {
  return response
    .clone()
    .text()
    .then((text) => btoa(text.substring(0, 27)));
}

class ETagMiddleware extends Middleware {
  #etags: Record<string, string> = {};
  #options: Options;
  #default_etag: string = '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"';

  constructor(options: Options) {
    super();

    this.#options = {
      ...defaultOptions,
      ...options,
    };
  }

  responseHasEmptyBody(response: Response) {
    const nullBody = response.body === null;
    const zeroLengthBody = response.headers.get("content-length") === "0";

    return nullBody || zeroLengthBody;
  }

  sendResponseForNoneMatchRequest(response: Response) {
    // When the body is empty, we want to set a default etag
    if (this.responseHasEmptyBody(response)) {
      return this.sendResponseNoneMatch304();
    }

    return this.sendResponseWithNewEtag(response);
  }

  sendResponseWithNewEtag(response: Response) {
    const newLastModifiedDate = this.generateNewLastModifiedDate();
    this.#etags[this.#default_etag] = newLastModifiedDate;

    if (this.responseHasEmptyBody(response)) {

      return new Response(null, {
        status: response.status || 200,
        headers: {
          "etag": this.#default_etag,
          "last-modified": newLastModifiedDate,
        }
      })
    }

    // else request doesnt have a new one so generate everything from scratch
    return new Response(response.body, {
      status: response.status || 200,
      headers: {
        "last-modified": newLastModifiedDate,
      }
    });
  }

  sendResponseNoneMatch304() {
    const existingModifiedDate = this.#etags[this.#default_etag];

    return new Response(null, {
      status: 304,
      headers: {
        "etag": this.#default_etag,
        "last-modified": existingModifiedDate,
      }
    });
  }

  sendResponseNoneMatchNew(response: Response) {
    const date = new Date().toUTCString();
    this.#etags[this.#default_etag] = date;

    return new Response(response.body, {
      status: response.status || 200,
      headers: {
        "etag": this.#default_etag,
        "last-modified": date
      }
    })
  }

  generateNewLastModifiedDate() {
    return new Date().toUTCString();
  }

  ALL(request: Request): Promise<Response> {
    const requestNoneMatch = request.headers.get("if-none-match");

    return Promise
      .resolve()
      .then(() => this.next<Response>(request))
      .then((response) => {
        if (requestNoneMatch) {
          return this.sendResponseForNoneMatchRequest(response);
        }

        return this.sendResponseWithNewEtag(response);
      });
  }

  protected getEtagHeader(response: Response) {
    // create the etag value to use;
    return toHash(response)
      .then((hash) => {
        return response
          .clone()
          .text()
          .then((text) => text.length.toString(16))
          .then((text) => `"${text}-${hash}"`);
      })
      .then((header) => this.setWeakHeader(header));

  }

  protected setWeakHeader(header: string): string {
    if (!this.#options.weak) {
      return header;
    }

    return "W/" + header;
  }
}

export function ETag(options: Options = defaultOptions) {
  return class EtagMiddlewareExtension extends ETagMiddleware {
    constructor() {
      super(options);
    }
  }
}

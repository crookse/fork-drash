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

type ETagOptions = {
  weak?: boolean;
  hash_length?: number;
}

class ResponseBuilder {
  #headers = new Headers();
  #response_init: ResponseInit = {};
  #body: BodyInit | null = null;

  headers(headers: Record<string, string>) {
    for (const [k ,v] of Object.entries(headers)) {
      this.#headers.set(k, v);
    }

    return this;
  }

  status(status: ResponseStatusCode) {
    this.#response_init.status = status;
    return this;
  }

  build() {
    return new Response(this.#body, {
      ...this.#response_init,
      headers: this.#headers,
    })
  }
}

class Extrasponse {
  #response: Response;
  #default_etag_options: ETagOptions = {
    weak: false,
    hash_length: 27
  };

  constructor(response: Response) {
    this.#response = response;
  }

  etag(options: ETagOptions = this.#default_etag_options) {
    return this
      .hash(options.hash_length)
      .then((hash) => {
        return this
          .#response
          .clone()
          .text()
          .then((text) => text.length.toString(16))
          .then((text) => `"${text}-${hash}"`);
      })
      .then((header) => {
        if (options.weak) {
          return "W/" + header;
        }

        return header;
      });
  }

  hash(maxLen = 27) {
    return this.#response
      .clone()
      .text()
      .then((text) => btoa(text.substring(0, maxLen)));
  }
}

function extrasponse(response: Response) {
  return new Extrasponse(response)
}

class ETagMiddleware extends Middleware {
  #etags: Record<string, string> = {};
  #options: Options;
  #default_etag = '"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"';

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

  sendResponseForNoneMatchRequest(request: Request, response: Response) {
    // When the body is empty, we want to set a default etag
    if (this.responseHasEmptyBody(response)) {
      const existingModifiedDate = this.#etags[this.#default_etag];

      return new Response(null, {
        status: 304,
        headers: {
          "etag": this.#default_etag,
          "last-modified": existingModifiedDate,
        }
      });
    }

    const requestNoneMatch = request.headers.get("if-none-match");

    return this
      .getEtagHeader(response)
      .then((header) => {
        if (header === requestNoneMatch) {
          return new Response(null, {
            status: 304,
            headers: {
              "etag": header,
              "last-modified": this.#etags[header],
            }
          })
        }

        const newLastModifiedDate = new Date().toUTCString();
        this.#etags[this.#default_etag] = newLastModifiedDate;

        return new Response(null, {
          status: response.status || 200,
          headers: {
            "etag": header,
            "last-modified": newLastModifiedDate,
          }
        })
      })
  }

  sendResponseWithNewEtag(response: Response) {
    const newLastModifiedDate = new Date().toUTCString();
    this.#etags[this.#default_etag] = newLastModifiedDate;

    // Else request doesnt have a new one so generate everything from scratch
    return this
      .getEtagHeader(response)
      .then((header) => {
        return new Response(response.body, {
          status: response.status || 200,
          headers: {
            "etag": header,
            "last-modified": newLastModifiedDate,
          }
        });
      })
  }

  ALL(request: Request): Promise<Response> {
    const requestNoneMatch = request.headers.get("if-none-match");

    return Promise
      .resolve()
      .then(() => this.next<Response>(request))
      .then((response) => {
        if (requestNoneMatch) {
          return this.sendResponseForNoneMatchRequest(request, response);
        }

        return this.sendResponseWithNewEtag(response);
      });
  }

  protected getEtagHeader(response: Response) {
    // create the etag value to use;
    return extrasponse(response)
      .etag({ weak: this.#options.weak, hash_length: 27 });

  }
}

export function ETag(options: Options = defaultOptions) {
  return class EtagMiddlewareExtension extends ETagMiddleware {
    constructor() {
      super(options);
    }
  }
}

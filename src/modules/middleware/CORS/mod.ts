import { RequestMethod, ResponseStatus } from "../../../core/Types.ts";
import { ResponseStatusCode } from "../../../core/types/ResponseStatusCode.ts";
import { Method } from "../../../core/http/request/Method.ts";
import { HTTPError } from "../../../core/errors/HTTPError.ts";
import { Middleware } from "../../../standard/http/Middleware.ts";
import { StatusCode } from "../../../core/http/response/StatusCode.ts";
import { StatusDescription } from "../../../core/http/response/StatusDescription.ts";
import { Status } from "../../../core/http/response/Status.ts";

// TODO(crookse)
// - [ ] Parse the Acces-Control-Request-Method header according to https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Request-Method
// - [ ] Handle responses that affect the Vary header
// - [ ] Compare to https://fetch.spec.whatwg.org/#concept-cors-check

export type Options = {
  allowed_headers?: string[];
  allowed_methods?: RequestMethod[];
  allowed_origins?: (string | RegExp)[];
  credentials?: boolean;
  exposed_headers?: string[];
  max_age?: number;
  options_success_status_code?: ResponseStatusCode;
};

const HeaderName = {
  // Response headers
  AccessControlAllowCredentials: "Access-Control-Allow-Credentials",
  AccessControlAllowHeaders: "Access-Control-Allow-Headers",
  AccessControlAllowMethods: "Access-Control-Allow-Methods",
  AccessControlAllowOrigin: "Access-Control-Allow-Origin",
  AccessControlExposeHeaders: "Access-Control-Expose-Headers",
  AccessControlMaxAge: "Access-Control-Max-Age",
  Vary: "Vary",

  // Request headers
  AccessControlRequestHeaders: "Access-Control-Request-Headers",
  AccessControlRequestMethod: "Acces-Control-Request-Method",
} as const;

const defaultOptions: Options = {
  allowed_headers: [],
  allowed_methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  allowed_origins: ["*"],
  credentials: false,
  exposed_headers: [],
  // max_age: 5, // MDN says default 5, so should this be 5?
  options_success_status_code: 204,
};

export function CORS(options: Options = defaultOptions) {
  return class CORSMiddleware extends Middleware {
    #options: Options;

    constructor() {
      super();

      this.#options = {
        ...defaultOptions,
        ...options,
      };
    }

    ALL(request: Request): Response {
      const method = request.method.toUpperCase();

      if (method === Method.OPTIONS) {
        return this.OPTIONS(request);
      }

      const headers = this.getCorsResponseHeaders(request);

      // Send the request to the requested resource
      const resourceResponse = super.next<Response>(request);

      // Merge the resource's response headers with the CORs response headers
      if (resourceResponse.headers) {
        for (const [key, value] of resourceResponse.headers.entries()) {
          this.appendHeaderValue({ key, value }, headers);
        }
      }

      return new Response(resourceResponse.body, {
        status: resourceResponse.status || StatusCode.OK,
        statusText: resourceResponse.statusText || StatusDescription.OK,
        headers,
      });
    }

    OPTIONS(request: Request): Response {
      const headers = this.getCorsResponseHeaders(request);
      this.setPreflightHeaders(request, headers);

      return new Response(null, {
        status: this.#options.options_success_status_code,
        headers,
      });
    }

    /**
     * @param request
     * @param headers The headers that will receive the preflight headers.
     */
    protected setPreflightHeaders(request: Request, headers: Headers): void {
      this.setHeaderAllowHeaders(request, headers);
      this.setHeaderAllowMethods(headers);
      this.setHeaderMaxAge(headers);

      // Body is always empty, so the Content-Length header should denote that.
      // This setting helps align with the following RFC:
      //
      //  https://www.rfc-editor.org/rfc/rfc9112#section-6.2
      //
      // In summary, this header must be set to "0" to help clients (e.g., other
      // servers, CDNs, browsers) know where this message ends when they receive
      // it.
      headers.set("content-length", "0");
    }

    /**
     * @param header The header (in key-value pair format) to add to the current
     * headers.
     * @param headers The current headers.
     */
    protected appendHeaderValue(
      header: { key: string; value: string },
      headers: Headers,
    ): void {
      const currentValue = headers.get(header.key);

      // If the header does not exist yet, then add it
      if (!currentValue) {
        headers.set(header.key, header.value);
        return;
      }

      // For vary headers, we need to check if values were already supplied. If so,
      // then we skip adding them.
      if (
        header.value.toLowerCase() === "vary" &&
        !currentValue.toLowerCase().includes(header.value)
      ) {
        headers.set(header.key, `${headers.get(header.key)}, ${header.value}`);
      }
    }

    /**
     * @param request
     * @returns The value that should be set in the
     * `Access-Control-Allow-Origin` header.
     */
    protected getAllowOriginHeaderValue(request: Request): string | null {
      if (
        !this.#options.allowed_origins || !this.#options.allowed_origins.length
      ) {
        return "*";
      }

      const origin = request.headers.get("origin");

      if (this.#options.allowed_origins.includes("*")) {
        return "*";
      }

      if (!origin) {
        return null;
      }

      if (this.#options.allowed_origins.includes(origin)) {
        return origin;
      }

      for (const allowedOrigin of this.#options.allowed_origins) {
        if (allowedOrigin instanceof RegExp) {
          if (allowedOrigin.test(origin)) {
            return origin;
          }
        }
      }

      return null;
    }

    /**
     * All CORS-related response headers start out with the values defined in
     * this method.
     * @param request
     * @returns The initial set of headers.
     */
    protected getCorsResponseHeaders(request: Request): Headers {
      const headers = new Headers();

      this.setHeaderExposeHeaders(headers);
      this.setHeaderAllowOrigin(request, headers);
      this.setHeaderAllowCredentials(headers);

      return headers;
    }

    /**
     * @param headers
     * @returns
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials}
     */
    protected setHeaderAllowCredentials(headers: Headers): void {
      if (!this.#options.credentials) {
        return;
      }

      headers.set(HeaderName.AccessControlAllowCredentials, "true");
    }

    /**
     * @param headers
     * @returns
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers}
     */
    protected setHeaderAllowHeaders(req: Request, headers: Headers): void {
      let allowedHeaders = req.headers.get(
        HeaderName.AccessControlRequestHeaders,
      );

      if (allowedHeaders) {
        this.appendHeaderValue(
          {
            key: HeaderName.Vary,
            value: HeaderName.AccessControlRequestHeaders,
          },
          headers,
        );
      }

      if (
        this.#options.allowed_headers && this.#options.allowed_headers.length
      ) {
        if (allowedHeaders) {
          allowedHeaders = this.#options.allowed_headers.concat(
            allowedHeaders.split(","),
          ).join(",");
        } else {
          allowedHeaders = this.#options.allowed_headers.join(",");
        }

        headers.set(HeaderName.AccessControlAllowHeaders, allowedHeaders);
      }
    }

    /**
     * @param headers
     * @returns
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Methods}
     */
    protected setHeaderAllowMethods(headers: Headers) {
      if (
        !this.#options.allowed_methods || !this.#options.allowed_methods.length
      ) {
        return;
      }

      headers.set(
        HeaderName.AccessControlAllowMethods,
        this.#options.allowed_methods.join(","),
      );
    }

    /**
     * @param req
     * @param headers
     * @returns
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin}
     */
    protected setHeaderAllowOrigin(request: Request, headers: Headers): void {
      if (
        !this.#options.allowed_origins || !this.#options.allowed_origins.length
      ) {
        return;
      }

      if (this.#options.allowed_origins.includes("*")) {
        headers.set(HeaderName.AccessControlAllowOrigin, "*");
        return;
      }

      const origin = this.getAllowOriginHeaderValue(request);
      headers.set(
        HeaderName.AccessControlAllowOrigin,
        origin ? origin : "false",
      );
      this.appendHeaderValue(
        { key: HeaderName.Vary, value: "Origin" },
        headers,
      );
    }

    /**
     * @param headers
     * @returns
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Expose-Headers}
     */
    protected setHeaderExposeHeaders(headers: Headers): void {
      if (
        !this.#options.exposed_headers || !this.#options.exposed_headers.length
      ) {
        return;
      }

      headers.set(
        HeaderName.AccessControlExposeHeaders,
        this.#options.exposed_headers.join(","),
      );
    }

    /**
     * @param headers
     * @returns
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Max-Age}
     */
    protected setHeaderMaxAge(headers: Headers) {
      if (typeof this.#options.max_age !== "number") {
        return;
      }

      headers.set(HeaderName.AccessControlMaxAge, `${this.#options.max_age}`);
    }
  };
}

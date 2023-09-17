import { Builder } from "../../standard/builders/Builder.ts";

/**
 * @example
 * ```ts
 * const builder = new ResponseBuilder();
 *
 * // This call ...
 * const resA = builder
 *   .headers({
 *     "x-some-header": "Some Value"
 *     "x-some-other-header": "Some Other Value",
 *   })
 *   .body("Nope.")
 *   .status(400)
 *   .statusText("Bad Request")
 *   .build();
 *
 * // ... results in the same response as this call ...
 * const resB = new Response("Nope.", {
 *   status: 400,
 *   statusText: "Bad Request",
 *   headers: {
 *     "x-some-header": "Some Value"
 *     "x-some-other-header": "Some Other Value",
 *   }
 * })
 * ```
 */
export class ResponseBuilder implements Builder<Response> {
  #body: BodyInit | null = null;
  #headers = new Headers();
  #response_init: ResponseInit = {
    status: 200,
    statusText: "OK",
  };

  body(body: BodyInit | null) {
    this.#body = body;
    return this;
  }

  headers(headers: Record<string, string>) {
    for (const [k, v] of Object.entries(headers)) {
      this.#headers.set(k, v);
    }

    return this;
  }

  status(status: number) {
    this.#response_init.status = status;
    return this;
  }

  statusText(statusText: string) {
    this.#response_init.statusText = statusText;
    return this;
  }

  build() {
    return new Response(this.#body, {
      ...this.#response_init,
      headers: this.#headers,
    });
  }
}

/**
 * Get a {@link Response} builder.
 * @returns A response builder.
 * @see {@link ResponseBuilder} for implementation details.
 */
export function response() {
  return new ResponseBuilder();
}

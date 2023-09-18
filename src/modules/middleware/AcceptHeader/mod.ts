import { Status } from "../../../core/http/response/Status.ts";
import { HTTPError } from "../../../core/errors/HTTPError.ts";
import { Middleware } from "../../../standard/http/Middleware.ts";

type Options = {
  fail_on_accept_header_mismatch: boolean;
};

const defaultOptions: Options = {
  fail_on_accept_header_mismatch: false,
};

export class AcceptHeader extends Middleware {
  #options: Options = defaultOptions;

  constructor(options: Options) {
    super();
    this.#options = {
      ...defaultOptions,
      ...options,
    };
  }

  public async ALL(request: Request) {
    const response = super.next<Response>(request);

    if (!response) {
      throw new HTTPError(
        Status.InternalServerError,
        "The server was unable to generate a response",
      );
    }

    const result = this.#requestAcceptsResponse(request, response);

    if (!this.#options.fail_on_accept_header_mismatch) {
      return response;
    }

    if (!request.headers.has("accept")) {
      throw new HTTPError(
        Status.BadRequest,
        `Request is missing 'Accept' header`,
      );
    }

    if (!result) {
      throw new HTTPError(
        Status.UnprocessableEntity,
        `The server cannot generate a response matching the value(s) in the request's 'Accept' header: ${
          request.headers.get("accept")
        }`,
      );
    }

    return response;
  }

  /**
   * If the request Accept header is present, then make sure the response
   * Content-Type header is accepted.
   *
   * @param request
   * @param response
   */
  #requestAcceptsResponse(request: Request, response: Response): boolean {
    const requestAcceptHeader = request.headers.get("accept");

    if (!requestAcceptHeader) {
      return false;
    }

    const responseContentTypeHeader = response.headers?.get("content-type");

    if (!responseContentTypeHeader) {
      return false;
    }

    if (requestAcceptHeader.includes("*/*")) {
      return true;
    }

    if (requestAcceptHeader.includes(responseContentTypeHeader)) {
      return true;
    }

    return false;
  }
}

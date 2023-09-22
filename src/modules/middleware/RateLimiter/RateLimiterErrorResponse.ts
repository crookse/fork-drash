import { ResponseStatus } from "../../../core/Types.ts";
import { HTTPError } from "../../RequestChain/mod.native.ts";

class RateLimiterErrorResponse extends HTTPError {
  readonly response: Response;

  constructor(status: ResponseStatus, response: Response) {
    super(status);
    this.response = response;
  }
}

// FILE MARKER - PUBLIC API ////////////////////////////////////////////////////

export { RateLimiterErrorResponse };

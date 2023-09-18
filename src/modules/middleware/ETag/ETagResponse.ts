import { ResponseBuilder } from "../../builders/ResponseBuilder.ts";

type Options = {
  weak?: boolean;
  hash_length?: number;
};

class ETagResponseBuilder extends ResponseBuilder {
  #response: Response;
  #default_options: Options = {
    weak: false,
    hash_length: 27,
  };

  constructor(response: Response) {
    super();
    this.#response = response;
  }

  addETagHeader(options: Options = this.#default_options) {
    return this
      .etagHeader(options)
      .then((etag) => {
        this.headers({
          etag,
        });

        return this;
      });
  }

  etagHeader(options: Options = this.#default_options) {
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

  protected hash(maxLength = 27) {
    return this.#response
      .clone()
      .text()
      .then((text) => btoa(text.substring(0, maxLength)));
  }
}

function response(response: Response) {
  return new ETagResponseBuilder(response);
}

export { ETagResponseBuilder, response };

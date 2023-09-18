import { RequestMethod } from "../../core/types/RequestMethod.ts";
import { Resource } from "../../core/http/Resource.ts";
import { Builder } from "../../standard/builders/Builder.ts";

type ResourceHTTPMethod<I = any, O = any> = (input: I) => O;

export class ResourceBuilder implements Builder<typeof Resource> {
  #name?: string;
  #paths: string[] = [];
  #http_methods: Partial<Record<RequestMethod, ResourceHTTPMethod>> = {};

  constructor(name?: string) {
    this.#name = name;
  }

  public paths(paths: string[]) {
    this.#paths = paths;
    return this;
  }

  public CONNET(cb: ResourceHTTPMethod) {
    this.#http_methods.CONNECT = cb;
    return this;
  }

  public DELETE(cb: ResourceHTTPMethod) {
    this.#http_methods.DELETE = cb;
    return this;
  }

  public GET(cb: ResourceHTTPMethod) {
    this.#http_methods.GET = cb;
    return this;
  }

  public HEAD(cb: ResourceHTTPMethod) {
    this.#http_methods.HEAD = cb;
    return this;
  }

  public OPTIONS(cb: ResourceHTTPMethod) {
    this.#http_methods.OPTIONS = cb;
    return this;
  }

  public PATCH(cb: ResourceHTTPMethod) {
    this.#http_methods.PATCH = cb;
    return this;
  }

  public POST(cb: ResourceHTTPMethod) {
    this.#http_methods.POST = cb;
    return this;
  }

  public PUT(cb: ResourceHTTPMethod) {
    this.#http_methods.PUT = cb;
    return this;
  }

  public TRACE(cb: ResourceHTTPMethod) {
    this.#http_methods.TRACE = cb;
    return this;
  }

  build(): typeof Resource {
    const paths = this.#paths;
    const httpMethods = this.#http_methods;

    const resource = class extends Resource {
      public paths = paths;

      public CONNECT(input: unknown) {
        if (!httpMethods.CONNECT) {
          return super.CONNECT(input);
        }

        return httpMethods.CONNECT(input);
      }

      public DELETE(input: unknown) {
        if (!httpMethods.DELETE) {
          return super.DELETE(input);
        }

        return httpMethods.DELETE(input);
      }

      public GET(input: unknown) {
        if (!httpMethods.GET) {
          return super.GET(input);
        }

        return httpMethods.GET(input);
      }

      public HEAD(input: unknown) {
        if (!httpMethods.HEAD) {
          return super.HEAD(input);
        }

        return httpMethods.HEAD(input);
      }

      public OPTIONS(input: unknown) {
        if (!httpMethods.OPTIONS) {
          return super.OPTIONS(input);
        }

        return httpMethods.OPTIONS(input);
      }

      public PATCH(input: unknown) {
        if (!httpMethods.PATCH) {
          return super.PATCH(input);
        }

        return httpMethods.PATCH(input);
      }

      public POST(input: unknown) {
        if (!httpMethods.POST) {
          return super.POST(input);
        }

        return httpMethods.POST(input);
      }

      public PUT(input: unknown) {
        if (!httpMethods.PUT) {
          return super.PUT(input);
        }

        return httpMethods.PUT(input);
      }

      public TRACE(input: unknown) {
        if (!httpMethods.TRACE) {
          return super.TRACE(input);
        }

        return httpMethods.TRACE(input);
      }
    };

    Object.defineProperty(resource, "name", {
      value: this.#name ?? "BuiltResource",
    });

    return resource;
  }
}

/**
 * Get a {@link Resource} builder.
 * @param name The name of the resource.
 * @returns A `Resource` builder.
 * @see {@link ResourceBuilder} for implementation details.
 */
export function resource(name?: string) {
  return new ResourceBuilder(name);
}

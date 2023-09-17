class RequestBuilder {
    #request: RequestInit = {};
    #path = "<path not provided>";
  
    path(path: string) {
      this.#path = path;
      return this;
    }
  
    get() {
      this.#request.method = "get";
      return this;
    }
  
    post() {
      this.#request.method = "post";
      return this;
    }
  
    put() {
      this.#request.method = "put";
      return this;
    }
  
    patch() {
      this.#request.method = "patch";
      return this;
    }
  
    delete() {
      this.#request.method = "delete";
      return this;
    }
  
    build() {
      return new Request(this.#path, this.#request);
    }
  }

  export function request() {
    return new RequestBuilder();
  }
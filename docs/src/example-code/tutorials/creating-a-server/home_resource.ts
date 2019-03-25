import Drash from "https://deno.land/x/drash/mod.ts";

/**
 * Create an HTTP resource that handles HTTP requests to the / URI
 */
export default class HomeResource extends Drash.Http.Resource {
  /**
   * Define the paths (a.k.a. URIs) that clients can use to access this resource.
   */
  static paths = ["/"];

  /**
   * Handle DELETE requests.
   */
  public DELETE() {
    this.response.body = "DELETE request received!";

    return this.response;
  }

  /**
   * Handle GET requests.
   */
  public GET() {
    this.response.body = "GET request received!";

    return this.response;
  }

  /**
   * Handle POSTS requests.
   */
  public POST() {
    this.response.body = "POST request received!";

    return this.response;
  }

  /**
   * Handle PUT requests.
   */
  public PUT() {
    this.response.body = "PUT request received!";

    return this.response;
  }
}

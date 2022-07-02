import * as Drash from "../../mod.ts";

/**
 * This is the base resource class for all resources. All resource classes must
 * extend this base resource class.
 *
 * Drash defines a resource according to the MDN at the following page:
 *
 *     https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Identifying_resources_on_the_Web
 */
export class Resource implements Drash.Interfaces.IResource {
  /**
   * Internal property used to identify this as a Drash resource.
   */
  protected drash_resource = true;

  public services: Drash.Interfaces.IResourceServices = {};
  public paths: string[] = [];

  // TODO(crookse) Deprecate this method and introduce `response.redirect()`
  /**
   * Redirect the incoming request to another resource
   *
   * @example
   * ```js
   * this.redirect("http://localhost/login", response);
   * this.redirect("http://localhost/login", response, 301);
   * this.redirect("http://localhost/login", response, 301, {"some-header": "some value"});
   * ```
   *
   * @param location - The location or resource uri of where you want to
   * redirect the request to
   * @param response - The response object, to set the related headers and
   * status code on
   * @param status - (optional) The response status. Defaults to 302.
   * @param headers - (optional) Any extra headers to specify with the response.
   * Defaults to an empty object.
   */
  public redirect(
    location: string,
    response: Drash.Response,
    status = 302,
    headers: Drash.Types.HttpHeadersKeyValuePairs = {},
  ): void {
    response.headers.set("Location", location);
    response.status = status;
    Object.keys(headers).forEach((key) => {
      response.headers.set(key, headers[key]);
    });
  }
}

/**
 * Drash - A microframework for building JavaScript/TypeScript HTTP systems.
 * Copyright (C) 2023  Drash authors. The Drash authors are listed in the
 * AUTHORS file at <https://github.com/drashland/drash/AUTHORS>. This notice
 * applies to Drash version 3.X.X and any later version.
 *
 * This file is part of Drash. See <https://github.com/drashland/drash>.
 *
 * Drash is free software: you can redistribute it and/or modify it under the
 * terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 *
 * Drash is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * Drash. If not, see <https://www.gnu.org/licenses/>.
 */

import {
  CORS,
  Options,
} from "../../../../../../../src/modules/middleware/CORS/mod.ts";
import { asserts } from "../../../../../../deps.ts";
import { handleRequest, hostname, port, protocol } from "./ETag_app.ts";
import { testCaseName, assertionMessage } from "../../../../utils.ts";

const url = `${protocol}://${hostname}:${port}`;

let corsOptions: Options = {};

function getCorsOptions() {
  return corsOptions;
}

const serverController = new AbortController();

Deno.serve(
  {
    port,
    hostname,
    onListen: () => test(),
    signal: serverController.signal,
  },
  (request: Request): Promise<Response> => {
    // Each test case sets a new `cors` variable, so we get the new value by calling this function
    const cors = getCorsOptions();

    // Now handle the request with the CORS middleware
    return handleRequest(CORS(cors), request);
  }
);

function test() {
  Deno.test("CSRF", async (t) => {
    await t.step("Deno Tests (using Deno server and chain)", async (t) => {

      const testCases = getTestCases();
      const path = "/";

      for (const [testCaseIndex, testCase] of testCases.entries()) {
        const { cors, method, headers = {}, expected } = testCase;

        corsOptions = cors;

        await t.step(
          `${testCaseName(testCaseIndex)} ${method} ${path}`,
          async () => {
            const requestOptions: Record<string, unknown> = { method };
            requestOptions.headers = headers ?? {};

            const req = new Request(url + "/", requestOptions);

            const response = await fetch(req);
            const actualHeaders = responseHeadersToKvp(response);
            const actualHeadersModified: Record<string, string> = {};

            const headersToIgnoreInAssertions = [
              "date",
              "content-length",
              "content-type",
            ];

            const expectedHeaders: Record<string, string> = {};

            for (const key in expected.headers) {
              if (headersToIgnoreInAssertions.includes(key.toLowerCase())) {
                continue;
              }

              actualHeadersModified[key] = actualHeaders[key];
              expectedHeaders[key] = expected.headers[key];
            }

            asserts.assertEquals(
              actualHeadersModified,
              expectedHeaders,
              assertionMessage(`Test case at index ${testCaseIndex} failed in Deno Tests.\nResponse headers do not match expected.`),
            );

            asserts.assertEquals(
              response.status === 200
                ? await response.text()
                : response.body,
              response.status === 200 // 200 responses have "" response body
                ? ""
                : null,
              assertionMessage(`Test case at index ${testCaseIndex} failed in Deno Tests.\nResponse body does not match expected.`),
            );

            asserts.assertEquals(
              response.status,
              expected.status,
              assertionMessage(`Test case at index ${testCaseIndex} failed in Deno Tests.\nResponse status does not match expected.`),
            );
          },
        );
      }
    })

    await t.step("Drash Tests (using chain only)", async (t) => {
      const testCases = getTestCases();
      const path = "/";

      for (const [testCaseIndex, testCase] of testCases.entries()) {
        const { cors, method, headers = {}, expected } = testCase;

        corsOptions = cors;

        await t.step(
          `${testCaseName(testCaseIndex)} ${method} ${path}`,
          async (t) => {
            const requestOptions: Record<string, unknown> = { method };
            requestOptions.headers = headers ?? {};

            const req = new Request(url + "/", requestOptions);

            const chainResponse = await handleRequest(CORS(cors), req);
            const actualHeaders = responseHeadersToKvp(chainResponse);

            asserts.assertEquals(
              actualHeaders,
              expected.headers,
              assertionMessage(`Test case at index ${testCaseIndex} failed in Drash Tests.\Response status does not match expected.`),
            );

            asserts.assertEquals(
              chainResponse.body,
              null,
              assertionMessage(`Test case at index ${testCaseIndex} failed in Drash Tests.\Response body does not match expected.`),
            );

            asserts.assertEquals(
              chainResponse.status,
              expected.status,
              assertionMessage(`Test case at index ${testCaseIndex} failed in Drash Tests.\Response status does not match expected.`),
            );
          },
        );
      }
    })
  });
}

/**
 * Get the response headers in key-value pair format.
 * @param response
 * @returns A key-value pair object.
 */
function responseHeadersToKvp(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};

  response.headers.forEach((v, k) => {
    headers[k] = v;
  });

  return headers;
}

function getTestCases(): {
  cors: Options;
  method: string;
  headers?: Record<string, string>;
  expected: {
    status: number;
    headers?: Record<string, string>;
  };
}[] {
  return [
    {
      cors: {},
      method: "OPTIONS",
      headers: {},
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {},
      method: "OPTIONS",
      headers: {
        "access-control-request-headers": "x-yezzir",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "*",
          "content-length": "0",
          "vary": "Access-Control-Request-Headers",
        },
      },
    },
    {
      cors: {
        allowed_origins: [
          "http://test",
          "https://woopwoop2",
          /.*woopwoop3\.local.*/,
          new RegExp("http(s)?://slowbro$"),
        ],
      },
      method: "OPTIONS",
      headers: {
        origin: "http://woopwoop",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "false",
          "content-length": "0",
          "vary": "Origin",
        },
      },
    },
    {
      cors: {
        allowed_origins: [
          "http://test",
          "https://woopwoop2",
          /.*woopwoop3\.local.*/,
          new RegExp("http(s)?://slowbro$"),
        ],
      },
      method: "OPTIONS",
      headers: {
        origin: "http://test",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "http://test",
          "content-length": "0",
          "vary": "Origin",
        },
      },
    },
    {
      cors: {
        allowed_origins: [
          "http://test",
          "https://woopwoop2",
          /.*woopwoop3\.local.*/,
          new RegExp("http(s)?://slowbro$"),
        ],
      },
      method: "OPTIONS",
      headers: {
        origin: "https://woopwoop2",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "https://woopwoop2",
          "content-length": "0",
          "vary": "Origin",
        },
      },
    },
    {
      cors: {
        allowed_origins: [
          "http://test",
          "https://woopwoop2",
          /.*woopwoop3\.local.*/,
          new RegExp("http(s)?://slowbro$"),
        ],
      },
      method: "OPTIONS",
      headers: {
        origin: "http://woopwoop3.local",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "http://woopwoop3.local",
          "content-length": "0",
          "vary": "Origin",
        },
      },
    },
    {
      cors: {
        allowed_origins: [
          "http://test",
          "https://woopwoop2",
          /.*woopwoop3\.local.*/,
          new RegExp("http(s)?://slowbro$"),
        ],
      },
      method: "OPTIONS",
      headers: {
        origin: "http://slowbro",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "http://slowbro",
          "content-length": "0",
          "vary": "Origin",
        },
      },
    },
    {
      cors: {
        allowed_origins: [
          "http://test",
          "https://woopwoop2",
          /.*woopwoop3\.local.*/,
          new RegExp("http(s)?://slowbro$"),
        ],
      },
      method: "OPTIONS",
      headers: {
        origin: "http://slowbros", // The last `s` character should cause a `false` origin
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "false",
          "content-length": "0",
          "vary": "Origin",
        },
      },
    },
    {
      cors: {
        allowed_origins: [
          "http://test",
          "https://woopwoop2",
          /.*woopwoop3\.local.*/,
          new RegExp("http(s)?://slowbro$"),
        ],
      },
      method: "OPTIONS",
      headers: {
        origin: "https://slowbro", // https should work too
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "https://slowbro",
          "content-length": "0",
          "vary": "Origin",
        },
      },
    },
    {
      cors: {
        allowed_origins: [
          "http://test",
          "https://woopwoop2",
          /.*woopwoop3\.local.*/,
          new RegExp("http(s)?://slowbro$"),
        ],
      },
      method: "OPTIONS",
      headers: {
        origin: "https://slowbros", // The last `s` character should cause a `false` origin again
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "false",
          "content-length": "0",
          "vary": "Origin",
        },
      },
    },
    {
      cors: {
        options_success_status_code: 200, // This results in a "" response body in Deno
      },
      method: "OPTIONS",
      expected: {
        status: 200,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        options_success_status_code: 200, // This results in a "" response body in Deno
      },
      method: "OPTIONS",
      headers: {
        origin: "https://woopwoop2",
      },
      expected: {
        status: 200,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        options_success_status_code: 200, // This results in a "" response body in Deno
      },
      method: "OPTIONS",
      headers: {
        origin: "http://woopwoop3.local",
      },
      expected: {
        status: 200,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        options_success_status_code: 200, // This results in a "" response body in Deno
      },
      method: "OPTIONS",
      headers: {
        origin: "http://slowbro",
      },
      expected: {
        status: 200,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        allowed_methods: [
          "GET",
        ],
      },
      method: "OPTIONS",
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        allowed_methods: [
          "GET",
        ],
      },
      method: "OPTIONS",
      headers: {
        origin: "https://woopwoop2",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        allowed_methods: [
          "GET",
        ],
      },
      method: "OPTIONS",
      headers: {
        origin: "http://woopwoop3.local",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        allowed_methods: [
          "GET",
        ],
      },
      method: "OPTIONS",
      headers: {
        origin: "http://slowbro",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        max_age: 1000,
      },
      method: "OPTIONS",
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "*",
          "access-control-max-age": "1000",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        max_age: 1000,
      },
      method: "OPTIONS",
      headers: {
        origin: "https://woopwoop2",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "*",
          "access-control-max-age": "1000",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        max_age: 1000,
      },
      method: "OPTIONS",
      headers: {
        origin: "http://woopwoop3.local",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "*",
          "access-control-max-age": "1000",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        max_age: 1000,
      },
      method: "OPTIONS",
      headers: {
        origin: "http://slowbro",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-origin": "*",
          "access-control-max-age": "1000",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        allowed_headers: ["x-hello", "x-nah-brah"],
      },
      method: "OPTIONS",
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-headers": "x-hello,x-nah-brah",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        allowed_headers: ["x-hello", "x-nah-brah"],
      },
      method: "OPTIONS",
      headers: {
        origin: "https://woopwoop2",
        "access-control-request-headers": "x-test",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-headers": "x-hello,x-nah-brah,x-test",
          "access-control-allow-origin": "*",
          "content-length": "0",
          "vary": "Access-Control-Request-Headers",
        },
      },
    },
    {
      cors: {
        allowed_headers: ["x-hello", "x-nah-brah"],
      },
      method: "OPTIONS",
      headers: {
        origin: "http://woopwoop3.local",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-headers": "x-hello,x-nah-brah",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        allowed_headers: ["x-hello", "x-nah-brah"],
      },
      method: "OPTIONS",
      headers: {
        origin: "http://slowbro",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-allow-headers": "x-hello,x-nah-brah",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        exposed_headers: ["x-pose-headers", "x-anotha-one"],
      },
      method: "OPTIONS",
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-expose-headers": "x-pose-headers,x-anotha-one",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        exposed_headers: ["x-pose-headers", "x-anotha-one"],
      },
      method: "OPTIONS",
      headers: {
        origin: "https://woopwoop2",
        "access-control-request-headers": "x-test",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-expose-headers": "x-pose-headers,x-anotha-one",
          "access-control-allow-origin": "*",
          "content-length": "0",
          "vary": "Access-Control-Request-Headers",
        },
      },
    },
    {
      cors: {
        exposed_headers: ["x-pose-headers", "x-anotha-one"],
      },
      method: "OPTIONS",
      headers: {
        origin: "http://woopwoop3.local",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-expose-headers": "x-pose-headers,x-anotha-one",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
    {
      cors: {
        exposed_headers: ["x-pose-headers", "x-anotha-one"],
      },
      method: "OPTIONS",
      headers: {
        origin: "http://slowbro",
      },
      expected: {
        status: 204,
        headers: {
          "access-control-allow-methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
          "access-control-expose-headers": "x-pose-headers,x-anotha-one",
          "access-control-allow-origin": "*",
          "content-length": "0",
        },
      },
    },
  ];
}

import { assertEquals } from "../deps.ts";
import { Request, Resource, Response, Server } from "../../mod.ts";
import { deferred } from "https://deno.land/std@0.158.0/async/deferred";

const messages: MessageEvent[] = [];
let globalResolve: ((arg: unknown) => void) | null = null;

////////////////////////////////////////////////////////////////////////////////
// FILE MARKER - APP SETUP /////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

class HomeResource extends Resource {
  paths = ["/"];

  public GET(request: Request, response: Response) {
    const {
      socket,
      response: upgradedResponse,
    } = Deno.upgradeWebSocket(request);

    socket.onmessage = (message) => {
      messages.push(message.data);
      if (globalResolve) {
        globalResolve(messages);
      }
    };

    return response.upgrade(upgradedResponse);
  }
}

const server = new Server({
  resources: [
    HomeResource,
  ],
  protocol: "http",
  hostname: "localhost",
  port: 3000,
});

////////////////////////////////////////////////////////////////////////////////
// FILE MARKER - TESTS /////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

Deno.test("integration/upgrade_websocket_test.ts", async () => {
  server.run();

  const socket = new WebSocket("ws://localhost:3000");

  const hydratedMessages = await new Promise((resolve, _reject) => {
    // We pass the `resolve` function to the `globalResolve` variable so that
    // the `socket.onmessage()` call in the `GET()` method in the resource can
    // use it to resolve the `Promise`. This makes the `Promise` truly wait
    // until the `messages` array has the message that was sent from the client.
    globalResolve = resolve;
    socket.onopen = () => {
      socket.send("this is a message from the client");
      // Close the connection so that this test doesn't leak async ops
      socket.close();
    };
  });

  const p = deferred();
  socket.onclose = () => {
    p.resolve();
  }
  assertEquals<string>(
    (hydratedMessages as MessageEvent[])[0] as unknown as string,
    "this is a message from the client",
  );
  await server.close();
  await p;
});

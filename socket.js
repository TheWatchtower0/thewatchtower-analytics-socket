import { WebSocketServer } from "ws";

const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port });

function heartbeat() {
  console.log("received pong from", this.client_id);

  this.isAlive = true;
}

wss.on("connection", function connection(webSocket, request) {
  const queryParams = new URLSearchParams(request.url.replace("/?", ""));
  const client_id = queryParams.get("client_id");
  const url = queryParams.get("url");

  webSocket.client_id = client_id;
  webSocket.page_url = url;
  webSocket.connection_open_timestamp = Date.now();
  webSocket.isAlive = true;

  console.log(`Opening connection for: ${webSocket.client_id}`);

  // client responds automatically to ping with pong
  webSocket.on("pong", heartbeat);

  webSocket.on("close", function close() {
    console.log(`Closing connection for: ${webSocket.client_id}`);
    webSocket.connection_close_timestamp = Date.now();

    // Convert queryParams to an object and spread it
    const queryParamsObj = Object.fromEntries(queryParams.entries());

    fetch("https://watchtower.thewatchtower.ae/api/analytics/record", {
      headers: {
        accepts: "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        page_url: webSocket.page_url,
        client_id: webSocket.client_id,
        time_start: webSocket.connection_open_timestamp,
        time_end: webSocket.connection_close_timestamp,
        ...queryParamsObj,
      }),
    });
  });
});

// heartbeat interval
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`Terminating dead connection: ${ws.client_id}`);
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // 30s interval

wss.on("close", () => {
  clearInterval(interval);
});

console.log(`WebSocket server running on ws://localhost:${port}`);


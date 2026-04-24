import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import { OakWoodsRoom } from "./rooms/OakWoodsRoom";

const PORT = Number(process.env.PORT ?? 2567);

const httpServer = createServer();
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("oakwoods", OakWoodsRoom);

gameServer.listen(PORT).then(() => {
  console.log(`[oakwoods] Colyseus listening on ws://localhost:${PORT}`);
}).catch((err) => {
  console.error("[oakwoods] failed to start:", err);
  process.exit(1);
});

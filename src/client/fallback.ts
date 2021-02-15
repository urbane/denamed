import { OptionalQueryHandler, QueryHandler } from "../server";
import { DnsMessage, DnsResponseMessage } from "../core/protocol";
import dgram from "dgram";
import { decodeMessage } from "../core/decoder";
import { encodeMessage } from "../core/encoding";

export function useFallback(
  queryHandler: OptionalQueryHandler,
  server: string
): QueryHandler {
  const requestMap = new Map<number, (message: DnsMessage) => any>();
  const socket = dgram.createSocket("udp4");
  socket.on("error", console.error);
  socket.on("message", (message) => {
    const decoded = decodeMessage(message);
    const req = requestMap.get(decoded.id);
    if (req) req(decoded);
  });
  return async (query, source) => {
    const result = await queryHandler(query, source);
    if (!result) {
      return await new Promise((resolve, reject) => {
        requestMap.set(query.id, (message) => {
          requestMap.delete(query.id);
          resolve(message as DnsResponseMessage);
        });
        socket.send(
          encodeMessage({ ...query, additional: undefined }),
          53,
          server,
          (error) => {
            if (error) reject(error);
          }
        );
      });
    }
    return result;
  };
}

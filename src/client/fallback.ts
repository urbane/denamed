import { OptionalQueryHandler, QueryHandler } from "../server";
import { DnsMessage, DnsResponseMessage } from "../core/protocol";
import dgram from "dgram";
import { decodeMessage } from "../core/decoder";
import { encodeMessage } from "../core/encoding";

export function useFallback(
  queryHandler: OptionalQueryHandler,
  server: string
): QueryHandler {
  const requestMap = new Map<
    number,
    (err: Error | null, message: DnsMessage) => any
  >();
  const socket = dgram.createSocket("udp4");
  // TODO: Add error handling
  socket.on("error", console.error);
  socket.on("message", (message) => {
    try {
      const decoded = decodeMessage(message);
      const req = requestMap.get(decoded.id);
      if (req) req(null, decoded);
    } catch (e) {
      // TODO: Add error handling
      console.error(e);
    }
  });
  return async (query, source) => {
    const result = await queryHandler(query, source);
    if (!result) {
      return await new Promise((resolve, reject) => {
        requestMap.set(query.id, (err, message) => {
          requestMap.delete(query.id);
          if (err) reject(err);
          else resolve(message as DnsResponseMessage);
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

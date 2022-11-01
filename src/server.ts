import dgram from "dgram";
import { DnsExceptionError, DnsProtocolError } from "./errors";
import { LoggingInterface } from "./logging";
import { decodeMessage } from "./core/decoder";
import { QuerySource } from "./query";
import { DnsQueryMessage, DnsResponseMessage } from "./core/protocol";
import { encodeMessage } from "./core/encoding";

export type QueryHandler = (
  query: DnsQueryMessage,
  source: QuerySource
) => DnsResponseMessage | Promise<DnsResponseMessage>;

export type OptionalQueryHandler = (
  query: DnsQueryMessage,
  source: QuerySource
) =>
  | DnsResponseMessage
  | Promise<DnsResponseMessage | undefined>
  | undefined
  | void;

export interface ServerOptions {
  name?: string;
  address?: string;
  port?: number;
  log?: LoggingInterface;
}

export function startUdpServer(
  queryHandler: QueryHandler,
  options: ServerOptions = { port: 53 }
) {
  const { port = 53, address, name, log } = options;
  const socket = dgram.createSocket("udp6");
  socket.on("message", async (buffer, rinfo) => {
    try {
      const message = decodeMessage(buffer);
      const response = await queryHandler(message as DnsQueryMessage, {
        family: "udp6",
        address: rinfo.address,
        port: rinfo.port,
      });
      const addr = rinfo.address;
      socket?.send(
        encodeMessage(response),
        rinfo.port,
        rinfo.address,
        (err, bytes) => {
          if (err) {
            log?.warn(
              {
                address: addr,
                port: port,
                err: err,
              },
              "send: unable to send response"
            );
            socket.emit("error", new DnsExceptionError(err.message));
          } else {
            log?.trace(
              {
                address: addr,
                port: port,
              },
              "send: DNS response sent"
            );
          }
        }
      );
    } catch (e) {
      log?.warn({ err: e }, "Error");
      socket.emit("clientError", new DnsProtocolError("invalid DNS datagram"));
      return;
    }
  });
  socket.bind(port, address);
}

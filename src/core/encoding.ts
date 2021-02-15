import {
  AaaaRecord,
  ARecord,
  CnameRecord,
  DnsRecord,
  IPv4Addr,
  IPv6Addr,
  MxRecord,
  NsRecord,
  SoaRecord,
  SrvRecord,
  TxtRecord,
} from "../records";
import { BooleanToBit, DnsClass, DnsMessage, QueryTypes } from "./protocol";
import { ipV4ToDecimal, parseIPv6 } from "./ip";

export const encodeFlags = (
  buffer: Buffer,
  offset: number,
  message: DnsMessage
) => {
  const v = (message as any) as BooleanToBit<DnsMessage>;
  let f = 0x0000;
  f = f | (v.queryResponse << 15);
  f = f | (v.operationCode << 11);
  f = f | (((v.authoritativeAnswer as any) as number) << 10);
  f = f | (((v.truncation as any) as number) << 9);
  f = f | (((v.recursionDesired as any) as number) << 8);
  f = f | (((v.recursionAvailable as any) as number) << 7);
  f = f | (0 << 6); //Z flag
  f = f | (((v.authenticatedData as any) as number) << 5);
  f = f | (((v.checkingDisabled as any) as number) << 4);
  f = f | v.responseCode;
  buffer.writeUInt16BE(f, offset);
  return buffer;
};

export const encodeNsName = (buffer: Buffer, offset: number, name: string) => {
  if (!(buffer as any).nameOffsets[name]) {
    (buffer as any).nameOffsets[name] = offset;
  } else {
    buffer.writeUInt16BE((buffer as any).nameOffsets[name] | 0xc000, offset);
    return 2;
  }
  const n = name.split(/\./);
  let o = offset; //offset
  n.forEach((item) => {
    const l = item.length;
    buffer[o] = l;
    buffer.write(item, ++o, l, "utf8");
    o += l;
  });
  buffer[o] = 0x00;
  return n.toString().length + 2;
};

export const encodeDnsRecord = (
  buffer: Buffer,
  offset: number,
  v: DnsRecord
) => {
  let length = 0;
  offset += 2;
  switch (v.type) {
    case "A":
      length = encodeIp4(buffer, offset, (v as ARecord).target);
      break;
    case "CNAME":
    case "NS":
      length = encodeNsName(
        buffer,
        offset,
        (v as CnameRecord | NsRecord).target
      );
      break;
    case "SOA":
      length = encodeSoaRecord(buffer, offset, v as SoaRecord);
      break;
    case "MX":
      length = encodeMxRecord(buffer, offset, v as MxRecord);
      break;
    case "TXT":
      length = encodeNsText(buffer, offset, (v as TxtRecord).target);
      break;
    case "AAAA":
      length = encodeIp6(buffer, offset, (v as AaaaRecord).target);
      break;
    case "SRV":
      length = encodeSrvRecord(buffer, offset, v as SrvRecord);
      break;
    default:
      throw new Error("unrecognized nsdata type");
  }
  buffer.writeUInt16BE(length, offset - 2);
  return length + 2;
};

export const encodeMxRecord = (
  buffer: Buffer,
  offset: number,
  record: MxRecord
) => {
  buffer.writeUInt16BE(record.priority, offset);
  return encodeNsName(buffer, offset + 2, record.exchange) + 2;
};

export const encodeSoaRecord = (
  buffer: Buffer,
  offset: number,
  record: SoaRecord
) => {
  let o = offset;
  o += encodeNsName(buffer, o, record.host);
  o += encodeNsName(buffer, o, record.admin);
  // Not super readable, but writeUInt32BE returns the new offset, so taking advantage of that with nested calls
  return (
    buffer.writeUInt32BE(
      record.ttl,
      buffer.writeUInt32BE(
        record.expire,
        buffer.writeUInt32BE(
          record.retry,
          buffer.writeUInt32BE(
            record.refresh,
            buffer.writeUInt32BE(record.serial, o)
          )
        )
      )
    ) - offset
  );
};

export const encodeSrvRecord = (
  buffer: Buffer,
  offset: number,
  record: SrvRecord
) => {
  return (
    encodeNsName(
      buffer,
      buffer.writeUInt16BE(
        record.port,
        buffer.writeUInt16BE(
          record.weight,
          buffer.writeUInt16BE(record.priority, offset)
        )
      ),
      record.target
    ) + 6
  );
};

export const encodeIp4 = (b: Buffer, offset: number, ipAddress: IPv4Addr) => {
  b.writeUInt32BE(ipV4ToDecimal(ipAddress), offset);
  return 4;
};

export const encodeIp6 = (b: Buffer, offset: number, v: IPv6Addr) => {
  const a = parseIPv6(v)!;
  for (let i = 0; i < 8; i++) {
    b.writeUInt16BE(a[i], offset + i * 2);
  }
  return 16;
};
export const encodeNsText = (b: Buffer, offset: number, v: string) => {
  b.writeUInt8(v.length, offset);
  return b.write(v, offset + 1) + 1;
};

// Haven't tested what is faster, creating a bunch of buffers concatenating or the single allocation with a calc method.
// This can probably be optimized as well, my assumption is this strategy is faster however it may be a premature optimization
export function getEncodedSize(message: DnsMessage) {
  let length = 12;
  let cache: Record<string, number> = {};
  const calcName = (name: string) => {
    if (cache[name]) return 2;
    return (cache[name] = name.split(".").toString().length + 2);
  };
  message.questions?.forEach((question) => {
    length += 4 + calcName(question.name);
  });
  [message.answers, message.authorities, message.additional].forEach((a) => {
    a?.forEach((answer) => {
      length += 10 + calcName(answer.name);
      switch (answer.type) {
        case "A":
          length += 4;
          break;
        case "CNAME":
        case "NS":
          length += (answer.data as CnameRecord | NsRecord).target
            .split(".")
            .toString().length;
          break;
        case "SOA":
          length +=
            calcName(answer.data.host) + calcName(answer.data.admin) + 20;
          break;
        case "SRV":
          length += calcName((answer.data as SrvRecord).target) + 6;
          break;
        case "MX":
          length += calcName((answer.data as MxRecord).exchange) + 2;
          break;
        default:
          throw new Error(`Unsupported type ${answer.type}`);
      }
    });
  });
  return length;
}

export function encodeMessage(message: DnsMessage) {
  const headerSize = 12;
  const buffer = Buffer.allocUnsafe(getEncodedSize(message));
  (buffer as any).nameOffsets = {};
  buffer.writeUInt16BE(message.id, 0);
  encodeFlags(buffer, 2, message);
  buffer.writeUInt16BE(message.questions?.length ?? 0, 4);
  buffer.writeUInt16BE(message.answers?.length ?? 0, 6);
  buffer.writeUInt16BE(message.authorities?.length ?? 0, 8);
  buffer.writeUInt16BE(message.additional?.length ?? 0, 10);
  let offset = headerSize;
  message.questions?.forEach((question) => {
    offset += encodeNsName(buffer, offset, question.name);
    offset = buffer.writeUInt16BE(QueryTypes[question.type], offset);
    offset = buffer.writeUInt16BE(DnsClass.Internet, offset);
  });
  [message.answers, message.authorities, message.additional].forEach((a) => {
    a?.forEach((answer) => {
      offset += encodeNsName(buffer, offset, answer.name);
      offset = buffer.writeUInt16BE(QueryTypes[answer.type], offset);
      offset = buffer.writeUInt16BE(DnsClass.Internet, offset);
      offset = buffer.writeUInt32BE(answer.ttl, offset);
      offset += encodeDnsRecord(buffer, offset, answer.data);
    });
  });
  return buffer;
}

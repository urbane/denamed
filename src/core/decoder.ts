import { ARecord } from "../records";
import {
  DnsAnswer,
  DnsMessage,
  DnsQuestion,
  DnsResourceRecord,
  InverseQueryMap,
  QueryType,
} from "./protocol";
import { decimalToIpV4 } from "./ip";

export const decodeFlags = (
  buffer: Buffer,
  offset: number
): Pick<
  DnsMessage,
  | "queryResponse"
  | "operationCode"
  | "authoritativeAnswer"
  | "truncation"
  | "recursionDesired"
  | "recursionAvailable"
  | "authenticatedData"
  | "checkingDisabled"
  | "responseCode"
> => {
  const flags = buffer.readUInt16BE(offset);
  return {
    queryResponse: flags & 0x8000 ? 1 : 0,
    operationCode: flags & 0x7800,
    authoritativeAnswer: !!(flags & 0x400),
    truncation: !!(flags & 0x200),
    recursionDesired: !!(flags & 0x100),
    recursionAvailable: !!(flags & 0x80),
    authenticatedData: !!(flags & 0x20),
    checkingDisabled: !!(flags & 0x10),
    responseCode: flags & 0xf,
  };
};

export function decodeResourceRecord(
  buffer: Buffer,
  offset: number
): [record: DnsResourceRecord, length: number] {
  let off = offset;
  const [name, l] = decodeNsName(buffer, off);
  off += l;
  const typeCode = buffer.readUInt16BE(off);
  off += 2;
  const dClass = buffer.readUInt16BE(off);
  off += 2;
  const ttl = buffer.readUInt32BE(off);
  off += 4;
  const length = buffer.readUInt16BE(off);
  off += 2;
  const type = InverseQueryMap[typeCode] as QueryType;
  let record: DnsResourceRecord;
  switch (type) {
    case "OPT":
      {
        let optionsLengths = 0;
        const options = {} as any;
        while (optionsLengths < length) {
          const optCode = buffer.readUInt16BE(off);
          off += 2;
          const optLength = buffer.readUInt16BE(off);
          off += 2;
          const value = buffer.slice(off, off + optLength);
          off += optLength;
          options[optCode] = value;
          optionsLengths += 4 + optLength;
        }
        record = {
          type,
          ttl,
          name,
          class: dClass,
          data: options,
        };
      }
      break;
    case "A":
      {
        const ip = decimalToIpV4(buffer.readUInt32BE(off));
        off += 4;
        record = {
          type,
          ttl,
          name,
          class: dClass,
          data: {
            type: "A",
            target: ip,
          } as ARecord,
        };
      }
      break;
    default:
      throw new Error(`Unsupported type ${type} (${typeCode})`);
  }
  return [record, off - offset];
}

export function decodeMessage(buffer: Buffer): DnsMessage {
  const id = buffer.readUInt16BE(0);
  const flags = decodeFlags(buffer, 2);
  const qdCount = buffer.readUInt16BE(4);
  const anCount = buffer.readUInt16BE(6);
  const nsCount = buffer.readUInt16BE(8);
  const srCount = buffer.readUInt16BE(10);
  let offset = 12;
  const questions = new Array<DnsQuestion>(qdCount);
  for (let i = 0; i < qdCount; i++) {
    const [name, length] = decodeNsName(buffer, offset);
    offset += length;
    const type = InverseQueryMap[buffer.readUInt16BE(offset)];
    // skipping class for right now
    offset += 4;
    questions[i] = {
      name,
      type,
    };
  }
  const [answers, authorities, additional] = [
    anCount ? new Array<DnsAnswer>(anCount) : undefined,
    nsCount ? new Array<DnsResourceRecord>(nsCount) : undefined,
    srCount ? new Array<DnsResourceRecord>(srCount) : undefined,
  ];
  [answers, authorities, additional].forEach((set) => {
    if (set) {
      for (let i = 0; i < set.length; i++) {
        const [rr, l] = decodeResourceRecord(buffer, offset);
        set[i] = rr;
        offset += l;
      }
    }
  });
  return {
    ...flags,
    id,
    questions,
    answers,
    authorities,
    additional,
  };
}

export const decodeNsName = (
  buffer: Buffer,
  offset: number
): [name: string, length: number] => {
  let start = offset;
  const name = [];
  let readLength = buffer.readUInt8(offset);
  // If this is a pointer (i.e. 0b11xxxxxx), then ref up
  if (readLength > 63) {
    return [decodeNsName(buffer, buffer.readUInt16BE(offset) & 0x3fff)[0], 2];
  }
  while (readLength != 0x00) {
    offset++;
    name.push(buffer.slice(offset, offset + readLength).toString());
    offset = offset + readLength;
    readLength = buffer.readUInt8(offset);
  }
  return [name.join("."), offset - start + 1];
};

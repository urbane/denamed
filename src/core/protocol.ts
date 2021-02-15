/*

  # Protocol

  Stores protocol definitions and their primitives as well as any other
  associated protocol constants

  ## References

  http://tools.ietf.org/html/rfc1035
  http://tools.ietf.org/html/rfc4408
  http://tools.ietf.org/html/rfc2782
  http://tools.ietf.org/html/rfc3596

  ## Notes

  * Even though RFC1035 says that questions should support multiple queries, the
  reality is *nobody* does this. MS DNS doesn't support it and apparently BIND
  doesn't support it as well. That implies no client side tools do either - so
  we will not worry about that complication.

  * DNS Extensions have been proposed, but another case of chicken-and-egg.
  These extensions make it _possible_ to have DNS queries over 512 bytes in
  length, but because it is not universally supported, nobody does it.

*/

import { DnsRecord } from "../records";

export type BooleanToBit<T> = {
  [K in keyof T]: T[K] extends boolean ? number : T[K];
};

export const QueryTypes = {
  A: 0x01, // ipv4 address
  NS: 0x02, // nameserver
  MD: 0x03, // obsolete
  MF: 0x04, // obsolete
  CNAME: 0x05, // alias
  SOA: 0x06, // start of authority
  MB: 0x07, // experimental
  MG: 0x08, // experimental
  MR: 0x09, // experimental
  NULL: 0x0a, // experimental null RR
  WKS: 0x0b, // service description
  PTR: 0x0c, // reverse entry (inaddr.arpa)
  HINFO: 0x0d, // host information
  MINFO: 0x0e, // mailbox or mail list information
  MX: 0x0f, // mail exchange
  TXT: 0x10, // text strings
  AAAA: 0x1c, // ipv6 address
  SRV: 0x21, // srv records
  AXFR: 0xfc, // request to transfer entire zone
  MAILA: 0xfe, // request for mailbox related records
  MAILB: 0xfd, // request for mail agent RRs
  ANY: 0xff, // any class,
  OPT: 0x29,
};

export const InverseQueryMap = Object.keys(QueryTypes).reduce((map, key) => {
  map[QueryTypes[key as keyof typeof QueryTypes]] = key;
  return map;
}, {} as any);

export type QueryType = keyof typeof QueryTypes;

export enum QueryResponseFlag {
  Query,
  Response,
}

/**
 * OPCODE
 */
export enum OperationCode {
  StandardQuery,
  ServerStatus = 2,
  Notify = 4,
  Update,
  DSO,
}

/**
 * RCODE
 */
export enum ResponseCode {
  Okay, // 'No Error Condition
  FormatError,
  ServerFailure,
  NotFound, //
  NotImplemented,
  Refused, // Any old reason the server refused the request
  YXDomain,
  YXRRSet,
  NXRRSet,
  NotAuthority,
  NotInZone,
  BadSig = 16,
  BadKey,
  BadTime,
  BadMode,
  BadName,
  BadAlgorithm,
  BadTruncation,
  BadCookie,
}

export enum DnsClass {
  Internet = 1,
}

export interface DnsQuestion {
  name: string;
  type: QueryType;
}

export interface DnsResourceRecord {
  name: string;
  class: DnsClass;
  type: QueryType;
  data: any;
  ttl: number;
}

export interface DnsAnswer<T extends DnsRecord = any>
  extends DnsResourceRecord {
  data: T;
}

export interface DnsMessage {
  id: number;
  operationCode: OperationCode;
  /**
   * QR flag
   */
  queryResponse: QueryResponseFlag;
  /**
   * AA flag
   */
  authoritativeAnswer: boolean;
  /**
   * TC flag
   */
  truncation: boolean;
  /**
   * RD flag
   */
  recursionDesired: boolean;
  /**
   * RA flag
   */
  recursionAvailable: boolean;
  /**
   * AD flag
   */
  authenticatedData: boolean;
  /**
   * CD flag
   */
  checkingDisabled: boolean;

  responseCode: ResponseCode;

  questions?: DnsQuestion[];
  answers?: DnsAnswer[];
  authorities?: DnsResourceRecord[];
  additional?: DnsResourceRecord[];
}

export interface DnsQueryMessage extends DnsMessage {
  queryResponse: QueryResponseFlag.Query;
}

export interface DnsResponseMessage extends DnsMessage {
  queryResponse: QueryResponseFlag.Response;
}

export interface DnsMessageWithCounts extends DnsMessage {
  questionCount: number;
  answerCount: number;
  nameserverCount: number;
  additionalRecordCount: number;
}

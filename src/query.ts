import {
  DnsAnswer,
  DnsMessage,
  DnsResponseMessage,
  QueryResponseFlag,
  ResponseCode,
} from "./core/protocol";

export function createResponse(
  query: DnsMessage,
  answers: DnsAnswer[]
): DnsResponseMessage {
  return {
    ...query,
    queryResponse: QueryResponseFlag.Response,
    responseCode: ResponseCode.Okay,
    additional: undefined,
    answers,
  };
}

export interface QuerySource {
  family: "udp6";
  address: string;
  port: number;
}

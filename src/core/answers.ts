import { DnsAnswer, DnsClass, DnsQuestion } from "./protocol";
import {
  AaaaRecord,
  ARecord,
  CnameRecord,
  IPv4Addr,
  IPv6Addr,
  MxRecord,
  NsRecord,
  SrvRecord,
  TxtRecord,
} from "../records";

export function createAAnswer(
  question: DnsQuestion,
  ip: IPv4Addr,
  ttl: number = 60
): DnsAnswer<ARecord> {
  return {
    type: "A",
    ttl: ttl,
    name: question.name,
    class: DnsClass.Internet,
    data: {
      type: "A",
      target: ip,
    },
  };
}

export function createMxAnswer(
  question: DnsQuestion,
  exchange: IPv4Addr,
  priority: number = 0,
  ttl: number = 60
): DnsAnswer<MxRecord> {
  return {
    type: "MX",
    ttl: ttl,
    name: question.name,
    class: DnsClass.Internet,
    data: {
      type: "MX",
      exchange,
      priority,
    },
  };
}

export function createNSAnswer(
  question: DnsQuestion,
  target: IPv4Addr,
  ttl: number = 60
): DnsAnswer<NsRecord> {
  return {
    type: "NS",
    ttl: ttl,
    name: question.name,
    class: DnsClass.Internet,
    data: {
      type: "NS",
      target,
    },
  };
}

export function createTxtAnswer(
  question: DnsQuestion,
  target: IPv4Addr,
  ttl: number = 60
): DnsAnswer<TxtRecord> {
  return {
    type: "TXT",
    ttl: ttl,
    name: question.name,
    class: DnsClass.Internet,
    data: {
      type: "TXT",
      target,
    },
  };
}

export function createCnameAnswer(
  question: DnsQuestion,
  target: string,
  ttl: number = 60
): DnsAnswer<CnameRecord> {
  return {
    type: "CNAME",
    ttl: ttl,
    name: question.name,
    class: DnsClass.Internet,
    data: {
      type: "CNAME",
      target,
    },
  };
}

export function createAaaaAnswer(
  question: DnsQuestion,
  target: IPv6Addr,
  ttl: number = 60
): DnsAnswer<AaaaRecord> {
  return {
    type: "AAAA",
    ttl: ttl,
    name: question.name,
    class: DnsClass.Internet,
    data: {
      type: "AAAA",
      target,
    },
  };
}

export function createSrvAnswer(
  question: DnsQuestion,
  target: IPv6Addr,
  port: number,
  priority: number = 0,
  weight: number = 0,
  ttl: number = 60
): DnsAnswer<SrvRecord> {
  return {
    type: "SRV",
    ttl: ttl,
    name: question.name,
    class: DnsClass.Internet,
    data: {
      type: "SRV",
      target,
      port,
      weight,
      priority,
    },
  };
}

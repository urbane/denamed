import { DnsAnswer, DnsClass, DnsQuestion } from "./protocol";
import { ARecord, IPv4Addr } from "../records";

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

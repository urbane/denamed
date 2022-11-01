import { createResponse } from "../query";
import {
  createAaaaAnswer,
  createAAnswer,
  createCnameAnswer,
  createMxAnswer,
  createNSAnswer,
  createTxtAnswer,
} from "../core/answers";
import { OptionalQueryHandler } from "../server";
import { DnsAnswer, DnsQuestion } from "../core/protocol";

export interface ValueWithTtl {
  value: string;
  ttl?: number;
}

export type MxValue = ValueWithTtl & { priority?: number };

export interface Zone {
  tld: string;
  ttl?: number;
  a?: Record<string, string | ValueWithTtl>;
  aaaa?: Record<string, string | ValueWithTtl>;
  txt?: Record<string, string | ValueWithTtl>;
  cname?: Record<string, string | ValueWithTtl>;
  ns?: Record<string, string | ValueWithTtl>;
  mx?: Record<string, MxValue>;
}

function expandZone(zone: Zone) {
  const newZone: any = { tld: zone.tld };
  (["a", "txt", "cname", "mx", "ns", "aaaa"] as (keyof Zone)[]).forEach(
    (key) => {
      if (zone[key]) {
        newZone[key] = {} as any;
        Object.keys(zone[key] as any).forEach((name) => {
          const value = (zone[key] as any)[name];
          newZone[key][
            (name.endsWith(zone.tld) ? name : name + "." + zone.tld) as string
          ] = typeof value === "string" ? { value } : value;
        });
      }
    }
  );
  return newZone;
}

function matchAnswerInZone(
  expandedZone: Zone,
  question: DnsQuestion
): DnsAnswer | undefined {
  if (question.name.endsWith(expandedZone.tld)) {
    switch (question!.type) {
      case "A":
        {
          const match = expandedZone.a?.[question.name] as ValueWithTtl;
          if (match)
            return createAAnswer(
              question,
              match.value,
              match.ttl ?? expandedZone.ttl
            );
        }
        break;
      case "NS":
        {
          const match = expandedZone.ns?.[question.name] as ValueWithTtl;
          if (match)
            return createNSAnswer(
              question,
              match.value,
              match.ttl ?? expandedZone.ttl
            );
        }
        break;
      case "MX":
        {
          const match = expandedZone.mx?.[question.name] as MxValue;
          if (match)
            return createMxAnswer(
              question,
              match.value,
              match.priority,
              match.ttl ?? expandedZone.ttl
            );
        }
        break;
      case "TXT":
        {
          const match = expandedZone.txt?.[question.name] as ValueWithTtl;
          if (match)
            return createTxtAnswer(
              question,
              match.value,
              match.ttl ?? expandedZone.ttl
            );
        }
        break;
      case "CNAME":
        {
          const match = expandedZone.cname?.[question.name] as ValueWithTtl;
          if (match)
            return createCnameAnswer(
              question,
              match.value,
              match.ttl ?? expandedZone.ttl
            );
        }
        break;
      case "AAAA":
        {
          const match = expandedZone.aaaa?.[question.name] as ValueWithTtl;
          if (match)
            return createAaaaAnswer(
              question,
              match.value,
              match.ttl ?? expandedZone.ttl
            );
        }
        break;
    }
  }
}

export function useZone(zone: Zone): OptionalQueryHandler {
  const expandedZone = expandZone(zone);
  return (query) => {
    const answers = query.questions?.map((question) =>
      matchAnswerInZone(expandedZone, question)
    );
    if (answers?.every((a) => a)) {
      return createResponse(query, answers as DnsAnswer[]);
    }
  };
}

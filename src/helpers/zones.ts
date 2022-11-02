import {createResponse} from "../query";
import {
    createAaaaAnswer,
    createAAnswer,
    createCnameAnswer,
    createMxAnswer,
    createNSAnswer,
    createSrvAnswer,
    createTxtAnswer,
} from "../core/answers";
import {OptionalQueryHandler} from "../server";
import {DnsAnswer, DnsQuestion} from "../core/protocol";

export interface ValueWithTtl {
    value: string;
    ttl?: number;
}

export type MxValue = ValueWithTtl & { priority?: number };
export type SrvValue = ValueWithTtl & {
    port: number;
    priority?: number;
    weight?: number;
};

export interface Zone {
    tld: string;
    ttl?: number;
    a?: Record<string, string | ValueWithTtl>;
    aaaa?: Record<string, string | ValueWithTtl>;
    txt?: Record<string, string | ValueWithTtl>;
    cname?: Record<string, string | ValueWithTtl>;
    ns?: Record<string, string | ValueWithTtl>;
    mx?: Record<string, MxValue | MxValue[]>;
    srv?: Record<string, SrvValue | SrvValue[]>;
}

type ExpandedZone = {
    tld: string;
    ttl?: number;
    a?: Record<string, ValueWithTtl[]>;
    aaaa?: Record<string, ValueWithTtl[]>;
    txt?: Record<string, ValueWithTtl[]>;
    cname?: Record<string, ValueWithTtl[]>;
    ns?: Record<string, ValueWithTtl[]>;
    mx?: Record<string, MxValue[]>;
    srv?: Record<string, SrvValue[]>;
};

function expandZone(zone: Zone): ExpandedZone {
    const newZone: any = {tld: zone.tld};
    (["a", "txt", "cname", "mx", "ns", "aaaa", "srv"] as (keyof Zone)[]).forEach(
        (key) => {
            if (zone[key]) {
                newZone[key] = {} as any;
                Object.keys(zone[key] as any).forEach((name) => {
                    let value = (zone[key] as any)[name];
                    if (typeof value === "string") value = {value};
                    if (!Array.isArray(value))
                        value = [value]
                    newZone[key][
                        (name.endsWith('.' + zone.tld) ? name : name + "." + zone.tld) as string
                        ] = typeof value === "string" ? {value} : value;
                });
            }
        }
    );
    return newZone;
}

function matchAnswerInZone(
    expandedZone: ExpandedZone,
    question: DnsQuestion
): DnsAnswer[] | undefined {
    if (question.name.endsWith(expandedZone.tld)) {
        const matches = (expandedZone[
            question!.type.toLowerCase() as keyof ExpandedZone
            ] as any)?.[question.name] as (ValueWithTtl | MxValue | SrvValue)[];
        switch (question!.type) {
            case "A":
                return matches?.map((match: ValueWithTtl) =>
                    createAAnswer(question, match.value, match.ttl ?? expandedZone.ttl)
                );
            case "NS":
                return matches?.map((match: ValueWithTtl) =>
                    createNSAnswer(question, match.value, match.ttl ?? expandedZone.ttl)
                );
            case "MX":
                return matches?.map((match: MxValue) =>
                    createMxAnswer(
                        question,
                        match.value,
                        match.priority,
                        match.ttl ?? expandedZone.ttl
                    )
                );
            case "SRV":
                return (matches as SrvValue[])?.map((match) =>
                    createSrvAnswer(
                        question,
                        match.value,
                        match.port,
                        match.priority,
                        match.weight,
                        match.ttl ?? expandedZone.ttl
                    )
                );
            case "TXT":
                return matches?.map((match: ValueWithTtl) =>
                    createTxtAnswer(question, match.value, match.ttl ?? expandedZone.ttl)
                );
            case "CNAME":
                return matches?.map((match: ValueWithTtl) =>
                    createCnameAnswer(
                        question,
                        match.value,
                        match.ttl ?? expandedZone.ttl
                    )
                );

            case "AAAA":
                return matches?.map((match: ValueWithTtl) =>
                    createAaaaAnswer(question, match.value, match.ttl ?? expandedZone.ttl)
                );
        }
    }
}

export function useZone(zone: Zone): OptionalQueryHandler {
    const expandedZone = expandZone(zone);
    return (query) => {
        const answers = query.questions?.flatMap((question) =>
            matchAnswerInZone(expandedZone, question)
        );
        if (answers?.every((a) => a)) {
            return createResponse(query, answers as DnsAnswer[]);
        }
    };
}

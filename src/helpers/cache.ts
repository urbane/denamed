import { QueryHandler } from "../server";
import { DnsAnswer } from "../core/protocol";
import { createResponse } from "../query";
import Timeout = NodeJS.Timeout;

export interface CacheEntry {
  answers: DnsAnswer[];
  created: number;
  expires: number;
}

export interface CacheInterface<T, U> {
  get(key: T): U | undefined;

  set(key: T, value: U): any;
}

export interface CacheOptions {
  cache?: CacheInterface<string, CacheEntry>;
}

export function useCache(
  handler: QueryHandler,
  cacheOptions?: CacheOptions
): QueryHandler {
  const cache = cacheOptions?.cache ?? new Map<string, CacheEntry>();
  let cleanCacheTimer: Timeout | undefined;
  return async (query, source) => {
    const question = query.questions![0];
    const key = question.type + ":" + question.name;
    const existing = cache.get(key);
    const time = Date.now();
    if (existing && time < existing.expires) {
      return createResponse(
        query,
        existing.answers.map((answer) => ({
          ...answer,
          ttl: Math.floor(answer.ttl - (time - existing.created) / 1000),
        }))
      );
    }
    const result = await handler(query, source);
    const entry = {
      answers: result.answers!,
      created: time,
      expires: result.answers!.reduce(
        (expires, answer) =>
          expires === 0 || expires > time + answer.ttl * 1000
            ? time + answer.ttl * 1000
            : expires,
        0
      ),
    };
    cache.set(key, entry);
    if (!cleanCacheTimer && !cacheOptions?.cache) {
      cleanCacheTimer = setTimeout(() => {
        const now = Date.now();
        const map = cache as Map<string, CacheEntry>;
        for (let [key, value] of map) {
          if (value.expires < now) {
            map.delete(key);
          }
        }
        cleanCacheTimer = undefined;
      }, Math.min(entry.expires - time + 1000, 60 * 1000));
    }
    return result;
  };
}

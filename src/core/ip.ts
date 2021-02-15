import ipaddr from "ipaddr.js";
import { IPv4Addr } from "../records";

export const ipV4ToDecimal = (ip: IPv4Addr) =>
  ip.split(".").reduce(function (ipInt, octet) {
    return (ipInt << 8) + parseInt(octet, 10);
  }, 0) >>> 0;

export const decimalToIpV4 = (ip: number) =>
  (ip >>> 24) +
  "." +
  ((ip >> 16) & 255) +
  "." +
  ((ip >> 8) & 255) +
  "." +
  (ip & 255);

export function parseIPv6(addr: string): number[] | undefined {
  try {
    return (ipaddr.parse(addr) as ipaddr.IPv6).parts;
  } catch (e) {}
}

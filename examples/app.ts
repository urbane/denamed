import {
  createResponse,
  createSoaRecord,
  DnsClass,
  startUdpServer,
} from "../src";

// Recreating the `node-named` example with functional API
startUdpServer((query) => {
  const domain = query.questions![0].name;
  return createResponse(query, [
    {
      type: "SOA",
      name: domain,
      ttl: 5,
      class: DnsClass.Internet,
      data: createSoaRecord({
        host: domain,
        serial: 12345,
        ttl: 300,
      }),
    },
  ]);
});

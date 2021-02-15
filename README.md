# `denamed` - _Pure JS DNS Server & Client Library_

![Node.js Package](https://github.com/idiotworks/denamed/workflows/Node.js%20Package/badge.svg)

A lightweight, functional-first, strongly typed DNS library that provides tools and HOFs for quickly building DNS client and server implementations in pure JavaScript/TypeScript.

## Why?

There are quite a few DNS server and client implementations in the wild, however most aren't very accessible beyond some static config files. Additionally, most of the libraries are in compiled languages with undesirable licensing that require complex toolchains to build and deploy.

JavaScript (and its superior superset TypeScript) provide incredibly portable and accessible code that can run anywhere and be seamlessly deployed in a million ways. This flexibility not only makes it hackable beyond belief, but also makes it the possible base for many useful applications.

The primary goals of `denamed` are:

- Create a flexible platform for configuring DNS services for a wide variety of applications, everything from home weekend hacks to providing SMB with tools to add additional security and compliance tools to their networks.
- Remove the barrier to entry by creating an accessible API for building DNS tools. It's hard to read through dozens of RFCs to pull out implementation details. `denamed` tries to use simple english terminology in its API so people can avoid confusion around cryptic naming conventions in the original standards.
- Have strong typing for DNS APIs. Leverage TypeScript to reduce implementation errors by using strong typing throughout the library.

There is a tradeoff for the flexibility of `denamed`. It probably will never win performance awards (although it is plenty fast for purpose), but you will get an extremely portable and easy to implement tool.

## Creating a DNS Server

Simple example form `examples/app.ts`, that granted, is not super cool:

```typescript
import {
  createResponse,
  createSoaRecord,
  DnsClass,
  startUdpServer,
} from "denamed";

// Recreating the 'node-named' example with functional API
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
```

### HOFing it up

To make it more useful, you'll probably want to opt-in to some utility functions. The server function(s) simply take a
transform function that receives a query request and returns a query response, either synchronously or asynchronously.
That lends it extremely well to being wrapped in higher-order functions (HOFs). The library has some useful ones
built-in.

The following example turns the above 'oh, lots of work to do' into a useful DNS server. By wrapping your handler
in `useFallback`, you can choose to serve which requests you want and which you want to 'bubble up' or recurse to
another server.

Additionally, probably want to keep things speedy. Simply add `useCache` to cache answers to queries (either local
and/or remote) and return the cached answer. It respects TTL values and will automatically purge old entries. If you
need a more advanced cache, you can use the `lru-cache` package or write your own and stick it in th config to override
the default functionality.

With a two HOFs you've added recursive DNS & local caching. Suddenly you have useful program:

```typescript
import {
  createAAnswer,
  createResponse,
  startUdpServer,
  useCache,
  useFallback,
} from "denamed";

startUdpServer(
  useCache(
    useFallback((query) => {
      //do some optional stuff otherwise just passthrough results
      //Here we just answer questions ending with local
      const question = query.questions![0];
      if (question.type == "A" && question.name.endsWith(".local")) {
        return createResponse(query, [createAAnswer(question, "127.0.0.1")]);
      }
    }, "8.8.8.8")
  )
);
```

You can write your own HOFs to create reusable functionality and keep your code clean.

### Performance

Would you want to use this as the foundation of a public DNS serving millions of people? I wouldn't. It's still running on Node.js (probably, although you can run it anywhere as long as you have the network interfaces required) and has all the limitations of its I/O and event loop. However, it's still pretty fast. Not scientific, but on a 2017 MacBook Pro a simple use had no problem hitting ~20k requests/second with no errors over a sustained period on a single thread.

Additionally, `denamed` isn't opinionated, it's a toolbox. The core decoding/encoding functionality has been optimized, so an easy way to squeeze more performance is ditching the convenience HOFs containing `async/await` and do everything 100% callback with no promises. However, you'll probably hit network limits before you hit CPU/memory limits.

Lastly, don't mistake server performance with user experience. Having the control with `denamed` allows you to be smart with your DNS with very little extra work. A great example would be implementing pre-fetching to ensure your cache is always fresh for commonly used domains. Given the prevalence of low TTL values on many cloud services these days, this can help _perceived_ performance.

## Creating DNS Records

`denamed` provides helper functions for creating DNS records. These functions are named `create[type]Record`
where `type` is one of ['A', 'AAAA', 'CNAME', 'SOA', 'MX', 'NS', 'TXT, 'SRV']. It is important to remember that these
DNS records are not permanently added to the server. They only exist for the length of the particular request. After
that, they are destroyed. This means you have to create your own lookup mechanism.

```typescript
import { createSoaRecord } from "denamed";

var soaRecord = createSoaRecord({ host: "example.com", serial: 201205150000 });
console.log(soaRecord);
```

### Supported Record Types

The following record types are supported

- A (ipv4)
- AAAA (ipv6)
- CNAME (aliases)
- SOA (start of authority)
- MX (mail server records)
- NS (nameserver entries)
- TXT (arbitrary text entries)
- SRV (service discovery)

## History

This project started of a fork of https://github.com/trevoro/node-named by Trevor Orsztynowicz and aimed to modernize
and complete some of the missing features in that original project. Some of the code is his and contributors and falls
under MIT license with his copyright. The goal of the project was to offer a lightweight library implementing the common
DNS functionality used today.

### Differences to `node-named`

- 100% strongly-typed TypeScript, including events. This corrected some bugs by itself.
- Opt-in features. It's designed to be bundled for deployment, so everything that doesn't get used can be tree-shaken.
- Logging is purely opt-in, there is a strongly-typed interface for it, but by default nothing is logged. This removes
  bunyan as a dependency.
- Moved most of the classes to interfaces. This moves this into a 'building block' library.
- Different APIs
- Some performance enhancements. Using `Buffer.allocUnsafe` and reducing the class overhead into pure functions shave
  off some time.

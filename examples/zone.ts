import {startUdpServer, useCache, useFallback, useZone} from "../src";

startUdpServer(
    useCache(
        useFallback(
            useZone({
                tld: "test",
                a: {
                    test: "127.0.0.1",
                },
                aaaa: {
                    test: "0:0:0:0:0:0:0:1",
                },
                mx: {
                    mail: {
                        value: "127.0.0.1",
                        priority: 10,
                    },
                },
                txt: {
                    test: "test=record",
                },
                ns: {
                    ns1: "127.0.0.1",
                },
                cname: {
                    alias: "test.test",
                },
                srv: {
                    '_chat._tcp': {value: 'test.test', port: 2000}
                }
            }),
            "8.8.8.8"
        )
    )
);

import {
  createResponse,
  createSoaRecord,
  startUdpServer,
  DnsClass,
} from "../src";
import cluster from "cluster";

class ClusterDns {
  private SCALING: number;

  /**
   *
   * <div>
   * Example that uses cluster (http://nodejs.org/api/cluster.html) to
   * spin up multiple workers to handle requests.
   * </div>
   *
   * <div>
   * You can test it like this: dig @localhost -p 9999 goodtimes.com
   * </div>
   *
   * <div>
   * Or using dnsperf:
   * </div>
   *
   * <pre>
   * $ echo "goodtimes.com A" > /tmp/f
   * $ dnsperf -s localhost -p 9999 -d /tmp/f -l 300
   * </pre>
   *
   * <div>
   * Unfortunately the surprise is that more workers (4) run slower (3711 qps),
   * than a single worker (4084 qps).
   * </div>
   *
   * @author Brian Hammond
   *
   */
  constructor() {
    /* lame config */
    // this.PORT = 9999;
    // this.LISTEN = "127.0.0.1";
    this.SCALING = 0.5;
  }

  randumb() {
    var r = function () {
      return Math.floor(Math.random() * 252 + 1);
    };
    return r() + "." + r() + "." + r() + "." + r();
  }

  friendo() {
    startUdpServer((query, source) => {
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
  }

  run() {
    if (cluster.isMaster) {
      this.master();
    } else {
      this.friendo();
    }
  }

  master() {
    var numCPUs = require("os").cpus().length;
    var workers = numCPUs * this.SCALING;
    // workers = 1;

    console.log(
      "there are numCPUs:" + numCPUs + ", starting " + workers + " workers"
    );

    for (var i = 0; i < workers; i++) {
      cluster.fork();
    }

    cluster.on("exit", function (worker, code, signal) {
      console.log("worker " + worker.process.pid + " died");
    });
  }
}

new ClusterDns().run();

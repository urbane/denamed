import {
  createAAnswer,
  createResponse,
  startUdpServer,
  useCache,
  useFallback,
} from "../src";

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

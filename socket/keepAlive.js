"use-strict";

exports.run = async (io) => {
  io.on("connection", function (socket) {
    console.log("client connected for keep alive checker");

    socket.on("disconnect", function () {
      console.log("client disconnected");
    });

    socket.on("aliveChecker", function (data) {
      console.log(new Date().toString());
    });

    socket.on("refresh", function (data) {
      io.emit("reSubscribe", data);
    });

    socket.on("readyToConnect", function (data) {
      console.log("ready to connect");
      io.emit("publisherReady", data);
    });
  });
};

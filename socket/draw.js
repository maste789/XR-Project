"use-strict";

exports.run = async (io) => {
  io.on("connection", function (socket) {
    console.log("client connected for draw");

    socket.on("disconnect", function () {
      console.log("client disconnected");
    });

    socket.on("draw", function (data) {
      console.log(data);
      socket.to(data.room).emit("draw", data);
    });

    socket.on("muted", function (data) {
      console.log(data);
      socket.to(data.room).emit("muted", data);
    });

   

    

  });
};

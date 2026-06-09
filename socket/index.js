const Socket = require("socket.io");

exports.initSocket = (httpsServer) => {
  const io = new Socket.Server(httpsServer, {
    // allowRequest: (req, callback) => {
    //   callback(null, false);
    // },
    cors: {
      origin: "*", // ["https://xr.k-bridge.co.kr"],
      credentials: true,
      // allowEIO3: true,
    },
    pingTimeout: 1000 * 60 * 60,
    pingInterval: 1000 * 60,
  });

  return io;
};

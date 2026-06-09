const mongoose = require("mongoose");

module.exports = () => {
  const db = mongoose.connect(
    `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  );
  const cube_db_path = require("path").join(__dirname);

  require("fs")
    .readdirSync(cube_db_path)
    .forEach(function (file) {
      require("./" + file);
    });

  return db;
};

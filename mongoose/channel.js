const mongoose = require("mongoose");

const ChannelSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Channel", ChannelSchema);

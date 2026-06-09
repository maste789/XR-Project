const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Channel = mongoose.model("Channel");

router.get("/match", async (req, res) => {
  try {
    const channel = await Channel.findOne(req.query).exec();
    if (channel) {
      res.json(channel);
    } else {
      res.status(500).send("not matched");
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.post("/", async (req, res) => {
  try {
    const channel = new Channel(req.body);
    await channel.save();
    res.json(channel);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.delete("/", async (req, res) => {
  try {
    await Channel.findOneAndDelete(req.body).exec();
    res.end();
  } catch (err) {
    res.status(500).send(err.message);
  }
});
module.exports = router;

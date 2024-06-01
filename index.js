const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
app.get("/", (req, res) => {
  res.send("Welcome EduCollaborate Server.");
});

app.listen(port, () => {
  console.log(`EduCollaborate Server is Running on Port ${port}`);
});

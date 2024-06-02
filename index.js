const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware for server
app.use(cors());
app.use(express.json());

// home routes
app.get("/", (req, res) => {
  res.send("Welcome EduCollaborate Server.");
});

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// connect to MongoDB
const run = async () => {
  try {
    await client.connect();

    // created a new MongoDB Database Collection
    const studySession = client.db("EduCollaborate").collection("StudySession");

    // study session routes
    app.get("/study-session", async (req, res) => {
      const options = {
        projection: {
          sessionTitle: 1,
          tutorName: 1,
          sessionDescription: 1,
          fee: 1,
          registrationEndDate: 1,
        },
      };
      const studySessions = await studySession.find({}, options).toArray();
      res.send(studySessions);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
};

run().catch(console.dir);

// app listeners
app.listen(port, () => {
  console.log(`EduCollaborate Server is Running on Port ${port}`);
});

const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const bookedStudySession = client
      .db("EduCollaborate")
      .collection("BookedStudySession");
    const allUsers = client.db("EduCollaborate").collection("AllUsers");

    // study session routes
    app.get("/study-session", async (req, res) => {
      const options = {
        projection: {
          sessionTitle: 1,
          tutorName: 1,
          sessionDescription: 1,
          fee: 1,
          registrationStartDate: 1,
          registrationEndDate: 1,
          image: 1,
        },
      };
      const studySessions = await studySession.find({}, options).toArray();
      res.send(studySessions);
    });
    app.get("/study-session-detailes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await studySession.findOne(query);
      res.send(result);
    });

    // booked study session routes
    app.post("/study-session-booked", async (req, res) => {
      const studySessionData = req.body;
      const result = await bookedStudySession.insertOne(studySessionData);
      res.send(result);
    });

    // create json web token in user information
    app.post("/user-login", async (req, res) => {
      const userInfo = req.body;
      const userToken = jwt.sign(
        userInfo,
        process.env.USER_ACCESS_TOKEN_SECRET,
        {
          expiresIn: process.env.USER_EXPIRED,
        }
      );
      res.send({ userToken });
    });

    // user registration data added to database
    app.post("/users", async (req, res) => {
      const userData = req.body;
      const query = { email: userData.email };

      const existingEmail = await allUsers.findOne(query);
      if (existingEmail) {
        return res
          .status(400)
          .send({ message: "Email already exists!", insertedId: null });
      }
      const result = await allUsers.insertOne(userData);
      res.send(result);
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

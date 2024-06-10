const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware for server
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://educollaborate-study.web.app",
      "https://educollaborate-study.firebaseapp.com",
    ],
  })
);
app.use(express.json());

// my middleware
const verifyToken = (req, res, next) => {
  const authorizationToken = req.headers.authorization;
  if (!authorizationToken) {
    return res.status(401).send({
      message: "You are not authorized to access this route.",
    });
  }
  const userToken = req.headers.authorization.split(" ")[1];

  jwt.verify(
    userToken,
    process.env.USER_ACCESS_TOKEN_SECRET,
    (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      req.decodedToken = decoded;

      next();
    }
  );
};

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
    const studySessionRejectionResonFeedback = client
      .db("EduCollaborate")
      .collection("StudySessionRejectionResonFeedback");

    const studySessionStudentReview = client
      .db("EduCollaborate")
      .collection("StudySessionStudentReview");

    const studentCreateNote = client
      .db("EduCollaborate")
      .collection("StudentCreateNote");

    const studySessionMaterial = client
      .db("EduCollaborate")
      .collection("StudySessionMaterial");

    // middleware verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decodedToken.email;
      const query = { email: email };
      const user = await allUsers.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    // middleware verify admin
    const verifyTutor = async (req, res, next) => {
      const email = req.decodedToken.email;
      const query = { email: email };
      const user = await allUsers.findOne(query);
      const isTutor = user?.role === "tutor";
      if (!isTutor) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // study session routes
    app.get(
      "/all-study-session-admin",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const studySessions = await studySession.find().toArray();
        res.send(studySessions);
      }
    );

    // get accepted study session
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
      const studySessions = await studySession
        .find({ status: "success" }, options)
        .toArray();
      res.send(studySessions);
    });

    // study session material upload by tutor
    app.post(
      "/upload-study-session-material",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const data = req.body;

        const result = await studySessionMaterial.insertOne(data);
        res.send(result);
      }
    );

    // all material get by tutor
    app.get(
      "/all-study-session-material/:email",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const email = req.params.email;
        const query = { tutorEmail: email };
        const result = await studySessionMaterial.find(query).toArray();
        res.send(result);
      }
    );

    // all materials get by admin
    app.get(
      "/all-study-session-material-by-admin",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const result = await studySessionMaterial.find().toArray();
        res.send(result);
      }
    );

    // delete material study session by tutor
    app.delete(
      "/delete-study-session-material/:id",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await studySessionMaterial.deleteOne(query);
        res.send(result);
      }
    );

    // delete material study session by admin
    app.delete(
      "/delete-study-session-material-by-admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await studySessionMaterial.deleteOne(query);
        res.send(result);
      }
    );

    // update material study session
    app.patch(
      "/update-study-session-material/:id",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const id = req.params.id;
        const data = req.body;
        const query = { _id: new ObjectId(id) };
        const updatedStudySessionMaterial = {
          $set: {
            materialImageUrl: data?.materialImageUrl,
            materialLink: data?.materialLink,
          },
        };
        const result = await studySessionMaterial.updateOne(
          query,
          updatedStudySessionMaterial
        );
        res.send(result);
      }
    );

    // get accepted study session detailes
    app.get("/study-session-detailes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await studySession.findOne(query);
      res.send(result);
    });

    // delete study session
    app.delete(
      "/study-session/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await studySession.deleteOne(query);
        res.send(result);
      }
    );

    // update study session price and max participants
    app.patch(
      "/update-study-session-price-maxparticipants/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const data = req.body;
        const query = { _id: new ObjectId(id) };
        const updatedStudyPriceMaxParticipants = {
          $set: { fee: data?.fee, maxParticipants: data?.maxParticipants },
        };
        const result = await studySession.updateOne(
          query,
          updatedStudyPriceMaxParticipants
        );
        res.send(result);
      }
    );

    // view study session rejected reson & feedback
    app.get("/view-rejected-reson-feedback/:id", async (req, res) => {
      const id = req.params.id;
      const query = { studySessionId: id };
      const result = await studySessionRejectionResonFeedback
        .find(query)
        .toArray();
      res.send(result);
    });

    // create study session
    app.post(
      "/create-study-session",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const studySessionData = req.body;
        const result = await studySession.insertOne(studySessionData);
        res.send(result);
      }
    );

    // view all study sessions in tutor
    app.get(
      "/view-all-study-session-tutor/:email",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const email = req.params.email;
        const query = { tutorEmail: email };
        const result = await studySession.find(query).toArray();
        res.send(result);
      }
    );

    // view all study success sessions in tutor
    app.get(
      "/view-all-study-success-session-tutor/:email",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const email = req.params.email;
        const query = { tutorEmail: email, status: "success" };
        const result = await studySession.find(query).toArray();
        res.send(result);
      }
    );

    // study session status accept
    app.patch(
      "/status-accept-request/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const updatedStatusData = req.body;
        const query = { _id: new ObjectId(id) };
        const updateStatus = {
          $set: {
            status: "success",
            fee: updatedStatusData.fee,
            maxParticipants: updatedStatusData.maxParticipants,
          },
        };
        const result = await studySession.updateOne(query, updateStatus);
        res.send(result);
      }
    );

    // study session status pending
    app.patch(
      "/status-pending-request/:id",
      verifyToken,
      verifyTutor,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updateStatus = { $set: { status: "pending" } };
        const result = await studySession.updateOne(query, updateStatus);
        res.send(result);
      }
    );

    // study session status reject
    app.patch(
      "/status-reject-request/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const updateStatus = { $set: { status: "rejected" } };
        const result = await studySession.updateOne(query, updateStatus);
        res.send(result);
      }
    );

    // study session rejection reson and feedback data added to database
    app.post("/study-session-reject-reson-feedback", async (req, res) => {
      const studySessionRejectionData = req.body;
      const result = await studySessionRejectionResonFeedback.insertOne(
        studySessionRejectionData
      );
      res.send(result);
    });

    // // check study session already booked by user before payment
    app.post(
      "/check-study-session-already-booked-by-user",
      async (req, res) => {
        const studySessionData = req.body;
        const studySessionMainId = studySessionData?.studySessionId;
        const studySessionBookedStudentEmail = studySessionData?.studentEmail;

        const queryStudySessionMainData = {
          studySessionId: studySessionMainId,
          studentEmail: studySessionBookedStudentEmail,
        };
        const existingStudentBookedStudySession =
          await bookedStudySession.findOne(queryStudySessionMainData);

        if (existingStudentBookedStudySession) {
          return res.send({ message: "Already Booked!" });
        } else {
          return res.send({ message: "Not Booked!" });
        }
      }
    );

    // booked study session routes
    app.post("/study-session-booked", async (req, res) => {
      const studySessionData = req.body;
      const studySessionMainId = studySessionData?.studySessionId;
      const studySessionBookedStudentEmail = studySessionData?.studentEmail;

      const queryStudySessionMainData = {
        studySessionId: studySessionMainId,
        studentEmail: studySessionBookedStudentEmail,
      };
      const existingStudentBookedStudySession =
        await bookedStudySession.findOne(queryStudySessionMainData);

      if (existingStudentBookedStudySession) {
        return res.send({ message: "Already Booked!" });
      }
      const result = await bookedStudySession.insertOne(studySessionData);
      res.send(result);
    });

    // study session booked before payment
    app.post("/create-payment-intent", async (req, res) => {
      const { fee } = req.body;
      const priceInt = parseInt(fee * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: priceInt,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // get student booked study session count
    app.get("/view-student-booked-session-count/:email", async (req, res) => {
      const email = req.params.email;
      const query = { studentEmail: email };
      const result = await bookedStudySession.countDocuments(query);
      res.send({ bookedSessionCount: result });
    });

    // get student booked study session routes
    app.get("/view-student-booked-session/:email", async (req, res) => {
      const email = req.params.email;
      const page = parseInt(req.query.page);
      const query = { studentEmail: email };
      const result = await bookedStudySession
        .find(query)
        .skip(page * 3)
        .limit(3)
        .toArray();
      res.send(result);
    });

    // get student booked study session detailes routes
    app.get("/view-student-booked-session-detailes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookedStudySession.findOne(query);
      res.send(result);
    });

    // post student booked study session detailes review & rating
    app.post("/view-student-booked-session-review-rating", async (req, res) => {
      const reviewRatingData = req.body;
      const result = await studySessionStudentReview.insertOne(
        reviewRatingData
      );
      res.send(result);
    });

    // get study session review data
    app.get("/study-session-review/:id", async (req, res) => {
      const id = req.params.id;
      const query = { studentBookedSessionId: id };
      const result = await studySessionStudentReview.find(query).toArray();
      res.send(result);
    });

    // student created note
    app.post("/student-creat-note", async (req, res) => {
      const studentCreateNoteData = req.body;
      const result = await studentCreateNote.insertOne(studentCreateNoteData);
      res.send(result);
    });

    // get student created note
    app.get("/student-personal-note/:email", async (req, res) => {
      const email = req.params.email;
      const query = { studentEmail: email };
      const result = await studentCreateNote.find(query).toArray();
      res.send(result);
    });

    // delete create note student
    app.delete("/delete-create-note/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await studentCreateNote.deleteOne(query);
      res.send(result);
    });

    // update create note student
    app.patch("/update-create-note/:id", async (req, res) => {
      const id = req.params.id;
      const updateNoteData = req.body;
      const newUpdateNoteData = {
        $set: {
          noteTitle: updateNoteData.noteTitle,
          noteDescription: updateNoteData.noteDescription,
        },
      };
      const query = { _id: new ObjectId(id) };
      const result = await studentCreateNote.updateOne(
        query,
        newUpdateNoteData
      );
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

    // users count
    app.get("/users-count", async (req, res) => {
      const result = await allUsers.countDocuments();
      res.send({ usersCount: result });
    });

    // user data get
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const userFilter = req.query.userFilter;
      const page = parseInt(req.query.page);
      const UserFilterQuery = {
        $or: [{ email: userFilter }, { name: userFilter }],
      };
      const userFilterResult = await allUsers.findOne(UserFilterQuery);
      if (userFilterResult) {
        return res.send([userFilterResult]);
      }

      const result = await allUsers
        .find()
        .skip(page * 5)
        .limit(5)
        .toArray();
      res.send(result);
    });

    // all tutor users
    app.get("/all-tutor", async (req, res) => {
      const query = { role: "tutor" };
      const result = await allUsers.find(query).toArray();
      res.send(result);
    });

    // check user role
    app.get("/check-user-role/:email", async (req, res) => {
      const userEmail = req.params.email;
      const query = { email: userEmail };
      const findResult = await allUsers.findOne(query);
      if (findResult?.role === "student") {
        return res.send({ resUserRoleIs: true });
      } else {
        return res.send({ resUserRoleIs: false });
      }
    });

    // user role update
    app.patch("/update-role", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.body._id;
      const email = req.body.email;
      const query = { _id: new ObjectId(id), email: email };
      const update = { $set: { role: "admin" } };
      const result = await allUsers.updateOne(query, update);
      res.send(result);
    });

    // check user is admin
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decodedToken.email) {
        return res.status(401).send({
          message: "You are not authorized to access this route.",
        });
      }
      const query = { email: email };
      const result = await allUsers.findOne(query);
      if (result?.role === "admin") {
        return res.send(true);
      }

      return res.send(false);
    });

    // check user is student
    app.get("/user/student/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decodedToken.email) {
        return res.status(401).send({
          message: "You are not authorized to access this route.",
        });
      }
      const query = { email: email };
      const result = await allUsers.findOne(query);
      if (result?.role === "student") {
        return res.send(true);
      }

      return res.send(false);
    });

    // check user is tutor
    app.get("/user/tutor/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decodedToken.email) {
        return res.status(401).send({
          message: "You are not authorized to access this route.",
        });
      }
      const query = { email: email };
      const result = await allUsers.findOne(query);
      if (result?.role === "tutor") {
        return res.send(true);
      }
      return res.send(false);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // await client.close();
  }
};

run().catch(console.dir);

// app listeners
app.listen(port, () => {
  console.log(`EduCollaborate Server is Running on Port ${port}`);
});

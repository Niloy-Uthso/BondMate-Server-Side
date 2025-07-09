const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t3hmlwb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


const database = client.db("bondmateDB"); // Name of your DB
    const biodataCollection = database.collection("biodata"); // Your collection


    app.post("/biodata", async (req, res) => {
      const biodata = req.body;

      // Automatically generate biodataId
      const last = await biodataCollection.find().sort({ biodataId: -1 }).limit(1).toArray();
      const newId = last.length ? last[0].biodataId + 1 : 1;
      biodata.biodataId = newId;

      const result = await biodataCollection.insertOne(biodata);
      res.send({ success: true, insertedId: result.insertedId, biodataId: newId });
    });

      app.get("/biodata", async (req, res) => {
      const biodatas = await biodataCollection.find().toArray();
      res.send(biodatas);
    });

app.get("/biodata-by-email", async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).send({ message: "Email query parameter is required." });
    }

    const biodata = await biodataCollection.findOne({ email });

    if (!biodata) {
      return res.status(404).send({ message: "Biodata not found for this email." });
    }

    res.send(biodata);
  } catch (error) {
    console.error("Error fetching biodata by email:", error);
    res.status(500).send({ message: "Internal server error." });
  }
});

app.patch("/biodata/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const result = await biodataCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    res.send(result);
  } catch (error) {
    console.error("Error updating biodata:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

app.patch('/premium-request/:id', async (req, res) => {
  const id = req.params.id;
  const result = await biodataCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { premiumRequested: true } }
  );
  res.send(result);
});



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// Basic route
app.get("/", (req, res) => {
  res.send("Matrimony server is running!");
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

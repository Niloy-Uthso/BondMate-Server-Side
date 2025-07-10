const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// Load environment variables
dotenv.config();

const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);


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
    const usersCollection = database.collection("users");
     const contactRequestsCollection =database.collection("contactrequest")


    app.post("/users", async (req, res) => {
  const { email, role } = req.body;

  const existingUser = await usersCollection.findOne({ email });

  if (existingUser) {
    return res.status(200).send({ message: "User already exists." });
  }

  const result = await usersCollection.insertOne({
    email,
    role: role || "normal",
    favourites: []
  });

  res.send(result);
});


app.patch("/users/add-favourite", async (req, res) => {
  const { email, biodataId } = req.body;

  const result = await usersCollection.updateOne(
    { email },
    { $addToSet: { favourites: biodataId } } // $addToSet prevents duplicates
  );

  res.send(result);
});

 app.post("/biodatas-by-ids", async (req, res) => {
  const ids = req.body.ids; // [1, 5, 12]

  const biodatas = await biodataCollection.find({
    biodataId: { $in: ids }
  }).toArray();

  res.send(biodatas);
});


app.get("/users/:email", async (req, res) => {
  const email = req.params.email;

  const user = await usersCollection.findOne({ email });

  if (!user) {
    return res.status(404).send({ message: "User not found" });
  }

  res.send(user);
});

app.patch("/users/:email/remove-favourite", async (req, res) => {
  const email = req.params.email;
  const { biodataId } = req.body;

  const result = await usersCollection.updateOne(
    { email },
    { $pull: { favourites: biodataId } }
  );

  res.send(result);
});


    app.post("/biodata", async (req, res) => {
      const biodata = req.body;

      // Automatically generate biodataId
      const last = await biodataCollection.find().sort({ biodataId: -1 }).limit(1).toArray();
      const newId = last.length ? last[0].biodataId + 1 : 1;
      biodata.biodataId = newId;

      const result = await biodataCollection.insertOne(biodata);
      res.send({ success: true, insertedId: result.insertedId, biodataId: newId });
    });

      app.get("/biodatas", async (req, res) => {
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

app.delete('/biodata/:id', async (req, res) => {
  const id = req.params.id;
  const result = await biodataCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

// Get a single biodata by its MongoDB _id
app.get("/biodata/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const biodata = await biodataCollection.findOne(query);

  if (!biodata) {
    return res.status(404).send({ message: "Biodata not found" });
  }

  res.send(biodata);
});



app.post("/create-payment-intent", async (req, res) => {
  const { price } = req.body;

  const amount = parseInt(price * 100); // Convert USD to cents

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      payment_method_types: ["card"],
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error("Stripe PaymentIntent error:", err);
    res.status(500).send({ error: err.message });
  }
});



app.post("/contact-requests", async (req, res) => {
  const { biodataId, userEmail, transactionId, status ,requestedbioname} = req.body;

  const result = await contactRequestsCollection.insertOne({
    biodataId,
    userEmail,
    transactionId,
    status, // pending
    createdAt: new Date(),
    requestedbioname,
  });

  res.send(result);
});

// Get all requests for a user
app.get("/contact-requests/:email", async (req, res) => {
  const email = req.params.email;
  const requests = await contactRequestsCollection.find({ userEmail: email }).toArray();
  res.send(requests);
});

// Delete a request
app.delete("/contact-requests/:id", async (req, res) => {
  const id = req.params.id;
  const result = await contactRequestsCollection.deleteOne({ _id: new ObjectId(id) });
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

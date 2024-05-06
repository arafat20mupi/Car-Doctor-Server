const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('Car doctor is runing...');
});



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ykgi9mv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
// middileWare
const logger = async (req, res, next) => {
  console.log('object', req.host, req.originalUrl);
  next();
};
const verifyToken = async (req, res, next) => {
  console.log('value of token in middileware', req.cookies?.token);
  const token = req.cookies?.token;
  console.log('value of token in middileware', token);
  if (!token) {
    return res.status(401).send({ message: "not logged in" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET , (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" })
    }
    console.log('value in decoded', decoded);
    req.user = decoded;
    next();
  })

}



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();




    const serviceCollection = client.db('carDoctor').collection('services');
    const bookingsCollection = client.db('carDoctor').collection('bookings');

    // auth retaled api
    app.post('/jwt', logger, async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      console.log(user);
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
        })
        .send({ success: true });
    })

    // services relatad api
    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) }
      const result = await serviceCollection.findOne(quary);
      res.send(result);
    })

    // booking related api 
    app.post('/bookings', async (req, res) => {
      const service = req.body;
      const result = await bookingsCollection.insertOne(service);
      res.send(result);
    })

    app.get('/bookings/:email', logger,verifyToken, async (req, res) => {
      const email = req.params.email;
      // console.log(req.cookies.token);
      const quary = { email: email }
      const result = await bookingsCollection.find(quary).toArray();
      res.send(result);
    })


    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) }
      const updatedBoooking = req.body;
      const updateBook = {
        $set: {
          status: updatedBoooking.status,
        }
      }
      const result = await bookingsCollection.updateOne(quary, updateBook);
      res.send(result);
    });
    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const quary = { _id: new ObjectId(id) }
      const result = await bookingsCollection.deleteOne(quary);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

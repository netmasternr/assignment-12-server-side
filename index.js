const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zudvrkg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();
    const campCollection = client.db("primeCareDb").collection("camp");
    const userCollection = client.db("primeCareDb").collection("users");


    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      res.send({ token });
    })

    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" })
      }
      const token = req.headers.authorization.split(' ')[1]

      // verify token
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next()
      })
    }

    // use verify organizer after verify token
    const verifyOrganizer = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isOrganizer = user?.role === 'isOrganizer';
      if (!isOrganizer) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }


    // user related api
    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if yser doesnt exits:
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: "user already exist" })
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })


    // admin get
    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query)
      let isOrganizer = false;
      if (user) {
        isOrganizer = user?.role === 'isOrganizer'
      }
      res.send({ isOrganizer })
    })


    // add a camp
    app.post('/addCamp', async (req, res) => {
      const item = req.body;
      const result = await campCollection.insertOne(item)
      res.send(result)
    })

    // home card
    app.get('/addCamp', async (req, res) => {
      const result = await campCollection.find().toArray()
      res.send(result)

    })

    // card details
    app.get('/addCamp/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campCollection.findOne(query)
      res.send(result)

    })


    // delete
    app.delete('/addCamp/:id', verifyToken, verifyOrganizer, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campCollection.deleteOne(query);
      res.send(result)
    })


    // for update function get 
    app.get('/addCamp/update/:id', verifyToken, verifyOrganizer, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campCollection.findOne(query);
      res.send(result)
    })

    // for update function patch
    app.patch('/addCamp/update/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          campName: item.campName,
          dateTime: item.dateTime,
          location: item.location,
          healthcareProfessionalName: item.healthcareProfessionalName
        }
      }
      const result = await campCollection.updateOne(filter, updateDoc);
      res.send(result)

    })



    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('medical camp is coming')
})

app.listen(port, () => {
  console.log(`Medical camp is coming on port${port}`)
})
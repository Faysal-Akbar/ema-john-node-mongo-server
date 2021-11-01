const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const { query } = require('express');
require('dotenv').config();
var admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 5000;


var serviceAccount = require('./ema-john-simple-bb524-firebase-adminsdk-75r56-fcf2f6acc6.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rqp1u.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next){
    if(req.headers?.authorization?.startsWith('Bearer ')){
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try{
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
           
        }
        catch{

        }
    }
    next();
}

async function run() {
    try{
        await client.connect();
        const database = client.db("online_shop");
        const productCollection = database.collection("products");
        const orderCollection = database.collection("orders");

        //GET products API
        app.get('/products', async(req, res)=> {
            const cursor = productCollection.find({});
            const count = await cursor.count();
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            if(page){
                products = await cursor.skip(page*size).limit(size).toArray();
            }
            else{
                products = await cursor.toArray();
            }
            res.send({
                count,
                products
            })
        })

        //add POST to get data by keys
        app.post('/products/byKeys', async(req, res) => {
            const keys = req.body;
            const query = {key: {$in: keys}}
            const products = await productCollection.find(query).toArray();
            res.json(products);
        })

        //order GET 
        app.get('/orders', verifyToken, async(req, res) => {
            const email = req.query.email;
            if(req.decodedUserEmail === email){
                const query = {email : email}
                const cursor = orderCollection.find(query);
                const result = await cursor.toArray();
                res.send(result);
            }
            else{
                res.status(401).json({message: 'User Not Authorized'})
            }
        })

        //Order to POST
        app.post('/orders', async(req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })
    }
    finally{
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Ema-john server is Running...');
})

app.listen(port, () => {
    console.log('Server running at port', port);
})
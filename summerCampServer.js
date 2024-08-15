//const http = require('http');
const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
//MONGO DB:
require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') }) 

const url = process.env.MONGO_CONNECTION_STRING;
//console.log("DB URI: ", uri);
const dbName = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_DB_COLLECTION;

/* Database and collection */
 const databaseAndCollection = {db: dbName , collection: collection};

const { MongoClient, ServerApiVersion } = require('mongodb');

let portNumber = 3000;
//const httpSuccessStatus = 200;

app.use(bodyParser.urlencoded({ extended: false }));

process.stdin.setEncoding("utf8");

if (process.argv.length != 3) {
    process.stdout.write(`Usage summerCamp.js portNumber`);
    process.exit(1);
}

//portNumber to be used
const portChosen = process.argv[2];

portNumber = portChosen;

console.log(`Web server started and running at http://localhost:${portNumber}`);

const prompt = "Type stop to shutdown the server: ";

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");

process.stdout.write(prompt);
process.stdin.on('readable', function () {
    const dataInput = process.stdin.read();
    if (dataInput !== null) {
	    const command = dataInput.trim();

	    if (command === "stop") {
            //Closing MongoDB client connection
            //console.log('Closing MongoDB client connection');
            client.close();
		    console.log("Shutting down the server");
            process.exit(0);  /* exiting */

        }else{
        /* After invalid command, maintain stdin reading */
		    console.log(`Invalid command: ${command}`);
        }
        process.stdout.write(prompt);
        process.stdin.resume();
    }
});

/* Connecting to MongoDB */
const client = new MongoClient(url, {serverApi: ServerApiVersion.v1 });

client.connect(err =>{
    if(err){
        console.error(err);
    }
    console.log("Connected to MongoDB");
})


/************************ */
/*  ENDPOINT PROCESSING   */
/************************ */

app.get("/", (request, response) => {
    // Render the index.ejs file
    response.render('welcome');
});

app.get("/apply", (request, response) => {
    response.render('apply', {portNumber}); 
});

app.post("/apply", async (request, response) => {
    // Extract application data from request body
    const { name, email, gpa, info } = request.body;
    //console.log("Request Body: ", request.body);
    //console.log("Request.name: ", name);

    // Insert application data into MongoDB
    try {
        var myobj = { name, email, gpa, info };
        //console.log("Object: " , JSON.stringify(myobj));
        await client.db(dbName).collection(collection).insertOne(myobj, function(err, res){
            if (err) {
                console.error('Error inserting application into MongoDB:', err);
                response.status(500).send('Internal Server Error');
                return;
            }
        });

    } catch (e) {
        console.error(e);
    }
    const timestamp = new Date();
    //console.log('Application submitted successfully');
    response.render('processApplication', {name, email, gpa, info, portNumber, timestamp});
});

app.get('/reviewApplication', (request,response) => {
    response.render("reviewApplication", {portNumber});
});

app.get('/processReviewApplication', async (request, response) => {
    const email = request.query.email;

    try {
        const db = client.db(dbName);
        const result = await db.collection(collection).findOne({ email });
        const timestamp = new Date();
        if (result) {
            response.render("processReviewApplication", {result, portNumber, timestamp});
        } else {
            //console.log(`No application found with email ${email}`);
            response.status(404);
            let result = {name: "NONE", email: "NONE", gpa: "NONE", info: "NONE"};
            response.render("processReviewApplication", {result, portNumber, timestamp});
        }
    } catch (error) {
        console.error('Error searching for application in MongoDB:', error);
        response.status(500).send('Internal Server Error');
    }
});

/*async function lookUpOneEntry(email) {
    let filter = {addr: email};
    const result = await client.db(dbName).collection(collection).findOne(filter);

   if (result) {
       return result;
   } else {
       console.log(`No application found with email ${fliter}`);
   }
}*/

app.get("/adminGPA", (request, response) => {
    response.render("adminGPA", { portNumber });
});

app.get("/processAdminGPA", async(request, response) => {
    const gpa = request.query.gpa;
    const filter = {gpa : {$gte: gpa}};
    try {
        const db = client.db(dbName);
        const result = await db.collection(collection).find(filter).toArray();
        
        if (result) {
            let gpaTable = '<table border="1">'
            gpaTable += '<tr><th>Name</th><th>GPA</th></tr>';

            result.forEach(elem => {
                gpaTable += `<tr><td> ${elem.name} </td><td> ${elem.gpa} </td></tr>`;
            });

            gpaTable += '</table>';

            response.render("processAdminGPA", {gpaTable, portNumber });
        } else {
            //console.log(`No applications found with gpa gte: ${gpa}`);
            response.status(404).send(`No applications found with gpa gte: ${gpa}`);
        }
    } catch (error) {
        console.error('Error searching for applications in MongoDB:', error);
        response.status(500).send('Internal Server Error');
    }
});

app.get("/adminRemove", (request, response) => {
    response.render('adminRemove', {portNumber});
});

app.post("/adminRemove", async (request, response) => {
    let count = -1;
    try {
        const result = await client.db(dbName).collection(collection).deleteMany({});
        response.render('processAdminRemove', {count : result.deletedCount, portNumber});
    } catch (e) {
        console.error(e);
    }
});

app.listen(portNumber); 

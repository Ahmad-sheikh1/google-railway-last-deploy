const express = require("express");
const app = express();
const cors = require("cors");
const PORT = 5000;
const scrapedroute = require("./Routes/Scrapping.route")
const downloadroutes = require("./Routes/Download_Routes")


// Middlewares
app.use(cors({
    origin: '*', // Replace with your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use("/upload", express.raw({ type: "*/*", limit: "50mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/Api/Scrap", scrapedroute)
app.use("/Api/Download", downloadroutes)



// Testing Api
app.get("/", (req, res) => {
    res.send("Api is Working")
})

//  Server Listening
app.listen((PORT), () => {
    console.log(`Server is Listening on ${PORT}`);
})
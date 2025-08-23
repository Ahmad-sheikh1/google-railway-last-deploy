const express = require("express");
const router = express.Router()
const {
    Scrapper_google_bot
} = require("../Controllers/Scrapper.controller")



router.post("/google-bot", Scrapper_google_bot);


module.exports = router;
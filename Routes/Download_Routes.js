const express = require("express");
const router = express.Router()
const {
    YoutubeDownloadController,
    InstaDownloadControllerV2Latest,
    YoutubeDownloadControllerV2Latest
} = require("../Controllers/Download.controller")



router.post("/insta", InstaDownloadControllerV2Latest);
router.post("/youtube", YoutubeDownloadControllerV2Latest);



module.exports = router;
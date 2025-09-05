const express = require("express");
const router = express.Router()
const {
    YoutubeDownloadController,
    InstaDownloadControllerV2Latest,
    YoutubeDownloadControllerV2Latest,
    YoutubeDownloadControllerV2LatestVersion02
} = require("../Controllers/Download.controller")



router.post("/insta", InstaDownloadControllerV2Latest);
router.post("/youtube", YoutubeDownloadControllerV2LatestVersion02);



module.exports = router;
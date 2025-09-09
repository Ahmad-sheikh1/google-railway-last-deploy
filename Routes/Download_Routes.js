const express = require("express");
const router = express.Router()
const {
    YoutubeDownloadController,
    InstaDownloadControllerV2Latest,
    YoutubeDownloadControllerV2Latest,
    YoutubeDownloadControllerV2LatestVersion02,
    YoutubeVideoDownoaderv3withMetaOptions,
    InstaDownloadControllerV3Latest,
    FacebookVideoDownloaderv1,
    XVideoDownloaderV1WithMeta
} = require("../Controllers/Download.controller")



router.post("/insta", InstaDownloadControllerV3Latest);
router.post("/youtube", YoutubeVideoDownoaderv3withMetaOptions);
router.post("/facebook", FacebookVideoDownloaderv1);
router.post("/x", XVideoDownloaderV1WithMeta);




module.exports = router;
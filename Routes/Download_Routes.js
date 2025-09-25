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
    XVideoDownloaderV1WithMeta,
    LinkedinVideoDownloaderv1,
    UploadImage
} = require("../Controllers/Download.controller")



router.post("/insta", InstaDownloadControllerV3Latest);
router.post("/youtube", YoutubeVideoDownoaderv3withMetaOptions);
router.post("/facebook", FacebookVideoDownloaderv1);
router.post("/x", XVideoDownloaderV1WithMeta);
router.post("/linkedin", LinkedinVideoDownloaderv1);
router.post("/uploadimage/:filename", express.raw({ type: "*/*", limit: "50mb" }), UploadImage)





module.exports = router;
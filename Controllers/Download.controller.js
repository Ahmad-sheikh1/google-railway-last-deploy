require("dotenv").config();
const fs = require('fs');
const path = require('path');
const youtubedl = require('yt-dlp-exec');
const { Upload } = require("@aws-sdk/lib-storage");
const { s3, uploadFileToS3 } = require("../Configurations/s3.config");

function norm(p) {
    return p.replace(/\\/g, "/");
}

const InstaDownloadControllerV2Latest = async (req, res) => {
    try {

        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

        const outDirAbs = path.resolve(__dirname, "../downloads");
        if (!fs.existsSync(outDirAbs)) fs.mkdirSync(outDirAbs, { recursive: true });

        const cookiesAbs = path.resolve(__dirname, "../cookies.txt");
        const hasCookies = fs.existsSync(cookiesAbs);

        const outputTpl = norm(path.join(outDirAbs, "insta-%(id)s.%(ext)s"));

        let printedPath = "";
        const ffmpegLocation = process.env.FFMPEG_PATH || "C:\\ffmpeg\\bin\\ffmpeg.exe";

        printedPath = await youtubedl(url, {
            f: 'b[ext=mp4]/bv*+ba/b',
            recodeVideo: "mp4",             // more reliable than remuxVideo
            restrictFilenames: true,
            noPart: true,
            noProgress: true,
            // forceOverwrites: true,
            mergeOutputFormat: "mp4",
            ffmpegLocation,
            noOverwrites: true,
            output: outputTpl,
            // Only pass cookies if the file exists; bad cookies can break downloads
            ...(hasCookies ? { cookies: norm(cookiesAbs) } : {}),
            addHeader: [
                "referer:https://www.instagram.com/",
                "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            ],
            // Ask yt-dlp to print the FINAL path (requires reasonably recent yt-dlp)
            print: "after_move:filepath",
        });
        printedPath = printedPath.trim();

        const fileName = path.basename(printedPath);

        const key = `instagram/${fileName}`;

        const { s3url } = await uploadFileToS3(printedPath, key);
        console.log(s3url)

        await fs.promises.unlink(printedPath);


        return res.json({
            ok: true,
            msg: "Uploaded to S3 and cleaned up local file",
            s3url,
            key
        });


    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ ok: false, error: error.message });
    }
}


// const YoutubeDownloadController = async (req, res) => {
//     try {

//         const { url } = req.body;
//         if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

//         const outDirAbs = path.resolve(__dirname, "../youtube");
//         if (!fs.existsSync(outDirAbs)) fs.mkdirSync(outDirAbs, { recursive: true });

//         const outputTpl = norm(path.join(outDirAbs, "video.mp4"));
//         const ffmpegLocation = process.env.FFMPEG_PATH || "C:\\ffmpeg\\bin\\ffmpeg.exe";

//         let printedPath = await youtubedl(url, {
//             f: "b[ext=mp4]/b",           // progressive only → no FFmpeg/merge
//             noPlaylist: true,
//             maxDownloads: 1,
//             playlistItems: "1",
//             noPart: true,
//             noProgress: true,
//             restrictFilenames: true,
//             output: outputTpl,
//             forceOverwrites: true,       // prevent resume/range issues
//             noContinue: true,            // don't try to resume old partials
//             print: "filename",           // final filename (not after_move)
//         });



//         printedPath = String(printedPath).trim();
//         if (!printedPath || !fs.existsSync(printedPath)) {
//             throw new Error("yt-dlp did not produce a final file path");
//         }

//         const fileName = path.basename(printedPath);

//         const key = `youtube/${fileName}`;

//         const { s3url } = await uploadFileToS3(printedPath, key);

//         await fs.promises.unlink(printedPath);

//         res.status(200).json({ "ok": true, msg: "Downloaded and Uploaded to S3", key, s3url })
//     } catch (error) {
//         console.error(error)
//         return res.status(500).json({ ok: false, error: error.message });
//     }
// }

const YoutubeDownloadControllerV2Latest = async (req, res) => {
    try {
        let { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

        // Clean single-video URL (remove playlist params)
        try {
            const u = new URL(url);
            if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
                url = `https://www.youtube.com/watch?v=${u.searchParams.get("v")}`;
            }
        } catch { }

        const outDirAbs = path.resolve(__dirname, "../youtube");
        if (!fs.existsSync(outDirAbs)) fs.mkdirSync(outDirAbs, { recursive: true });

        const outputPath = norm(path.join(outDirAbs, "video.mp4"));

        // Remove any prior file to avoid 416 range issues
        if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath);

        // Force PROGRESSIVE MP4 only (no ffmpeg needed): try 720p (22) then 360p (18)
        const opts = {
            f: "22/18",                 // <- progressive-only itags
            noPlaylist: true,
            maxDownloads: 1,
            playlistItems: "1",
            noPart: true,
            noProgress: true,
            restrictFilenames: true,
            output: outputPath,
            forceOverwrites: true,
            noContinue: true,
            // don't rely on --print; some yt-dlp builds lack it or stdout can be empty
            // print: "filename",
            // ignoreConfig: true,      // uncomment if a local yt-dlp config is interfering
        };

        try {
            await youtubedl(url, opts);
        } catch (err) {
            // Some builds return exitCode 101 even if file got written; handle that
            if (!(err && err.exitCode === 101 && fs.existsSync(outputPath))) {
                throw err;
            }
        }

        if (!fs.existsSync(outputPath)) {
            throw new Error("yt-dlp did not write the expected file (progressive MP4).");
        }

        const fileName = path.basename(outputPath); // "video.mp4"
        const key = `youtube/${fileName}`;

        const { s3url } = await uploadFileToS3(outputPath, key);
        await fs.promises.unlink(outputPath);

        return res.status(200).json({
            ok: true,
            msg: "Downloaded → Uploaded to S3 → Local deleted",
            key,
            s3url,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, error: error.message });
    }
};

const YoutubeDownloadControllerV2LatestVersion02 = async (req, res) => {
    try {
        let { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

        // Clean single-video URL (remove playlist params)
        try {
            const u = new URL(url);
            if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
                url = `https://www.youtube.com/watch?v=${u.searchParams.get("v")}`;
            }
        } catch { }

        const outDirAbs = path.resolve(__dirname, "../youtube");
        if (!fs.existsSync(outDirAbs)) fs.mkdirSync(outDirAbs, { recursive: true });

        const uniqueName = `video-${Date.now()}.mp4`;

        const outputPath = norm(path.join(outDirAbs, uniqueName));

        const fileName = path.basename(outputPath);
        const key = `youtube/${fileName}`;

        // Remove any prior file to avoid 416 range issues
        if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath);

        const COOKIES_PATH = path.resolve(__dirname, "../youtubcookies.txt");

        console.log('COOKIES_PATH =', COOKIES_PATH, fs.existsSync(COOKIES_PATH));
        console.log('cookie size =', (await fs.promises.stat(COOKIES_PATH)).size);

        // Force PROGRESSIVE MP4 only (no ffmpeg needed): try 720p (22) then 360p (18)
        const opts = {
            f: "22/18",                 // <- progressive-only itags
            noPlaylist: true,
            maxDownloads: 1,
            playlistItems: "1",
            noPart: true,
            noProgress: true,
            restrictFilenames: true,
            output: outputPath,
            forceOverwrites: true,
            noContinue: true,
            cookies: COOKIES_PATH,
            addHeader: [
                "User-Agent: Mozilla/5.0",
                "Referer: https://www.youtube.com/"
            ],
            // don't rely on --print; some yt-dlp builds lack it or stdout can be empty
            // print: "filename",
            // ignoreConfig: true,      // uncomment if a local yt-dlp config is interfering
        };

        try {
            await youtubedl(url, opts);
        } catch (err) {
            // Some builds return exitCode 101 even if file got written; handle that
            if (!(err && err.exitCode === 101 && fs.existsSync(outputPath))) {
                throw err;
            }
        }

        if (!fs.existsSync(outputPath)) {
            throw new Error("yt-dlp did not write the expected file (progressive MP4).");
        }

        const { s3url } = await uploadFileToS3(outputPath, key);
        await fs.promises.unlink(outputPath);

        return res.status(200).json({
            ok: true,
            msg: "Downloaded → Uploaded to S3 → Local deleted",
            key,
            s3url,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, error: error.message });
    }
};

module.exports = { InstaDownloadControllerV2Latest, YoutubeDownloadControllerV2Latest, YoutubeDownloadControllerV2LatestVersion02 };

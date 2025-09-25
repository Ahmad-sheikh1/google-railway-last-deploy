require("dotenv").config();
const fs = require('fs');
const path = require('path');
const youtubedl = require('yt-dlp-exec');
const { Upload } = require("@aws-sdk/lib-storage");
const { s3, uploadFileToS3 , uploadImageToS3 } = require("../Configurations/s3.config");
const { URL } = require("url");
const mime = require("mime-types");
const { fileTypeFromBuffer } = require("file-type");

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


const InstaDownloadControllerV3Latest = async (req, res) => {
    try {

        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

        const outDirAbs = path.resolve(__dirname, "../downloads");
        if (!fs.existsSync(outDirAbs)) fs.mkdirSync(outDirAbs, { recursive: true });

        const cookiesAbs = path.resolve(__dirname, "../cookies.txt");
        const hasCookies = fs.existsSync(cookiesAbs);

        const outputTpl = norm(path.join(outDirAbs, "insta-%(id)s.%(ext)s"));

        let meta = {};

        const metaOpts = {
            dumpSingleJson: true,      // -j
            skipDownload: true,        // sirf JSON, video nahi
            noWarnings: true,
            noCallHome: true,
            ...(hasCookies ? { cookies: norm(cookiesAbs) } : {}),
            addHeader: [
                "referer:https://www.instagram.com/",
                "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            ],
        };

        const stdout = await youtubedl(url, metaOpts);
        const j = typeof stdout === "string" ? JSON.parse(stdout) : stdout;

        const caption = j.description || j.title || "";
        const hashtags = (caption.match(/#[\p{L}\p{N}_]+/gu) || []).map(h => h.toLowerCase());


        meta = {
            id: j.id,
            permalink: j.webpage_url || url,
            username: j.uploader || j.uploader_id || "",
            caption,
            hashtags,
            duration_seconds: j.duration ?? null,
            taken_at: j.timestamp ? new Date(j.timestamp * 1000).toISOString() : null,
            thumb: j.thumbnail || (Array.isArray(j.thumbnails) ? j.thumbnails[0]?.url : undefined),
            stats: {
                views: j.view_count ?? null,
                likes: j.like_count ?? null,
                comments: j.comment_count ?? null,
            },
        };

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
            key,
            metadata: meta
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


const YoutubeVideoDownoaderv3withMetaOptions = async (req, res) => {
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

        const metaOpts = {
            dumpSingleJson: true,   // -j
            skipDownload: true,     // --skip-download
            noWarnings: true,
            noCallHome: true,
            cookies: fs.existsSync(COOKIES_PATH) ? COOKIES_PATH : undefined,
            addHeader: [
                "User-Agent: Mozilla/5.0",
                "Referer: https://www.youtube.com/",
            ],
        };

        const stdout = await youtubedl(url, metaOpts);
        const j = typeof stdout === "string" ? JSON.parse(stdout) : stdout;

        meta = {
            id: j.id,
            url: j.webpage_url || url,
            title: j.title || "",
            description: j.description || "",
            tags: Array.isArray(j.tags) ? j.tags : [],
            channel: j.channel || j.uploader || "",
            channel_id: j.channel_id || "",
            duration_seconds: j.duration ?? null,
            upload_date: j.upload_date || null, // YYYYMMDD
            thumbnails: j.thumbnails || [],
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
            metadata: meta
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, error: error.message });
    }
};

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const FacebookVideoDownloaderv1 = async (req, res) => {
    try {

        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

        const outDirAbs = path.resolve(__dirname, "../facebookdownloads");
        if (!fs.existsSync(outDirAbs)) fs.mkdirSync(outDirAbs, { recursive: true });

        const cookiesAbs = path.resolve(__dirname, "../facebookcookies.txt");
        const hasCookies = fs.existsSync(cookiesAbs);

        const outputTpl = norm(path.join(outDirAbs, "facebook-%(id)s.%(ext)s"));

        let printedPath = "";
        const ffmpegLocation = process.env.FFMPEG_PATH || "C:\\ffmpeg\\bin\\ffmpeg.exe";

        let meta = {};

        const metaOpts = {
            dumpSingleJson: true,      // -j
            skipDownload: true,        // sirf JSON, video nahi
            noWarnings: true,
            noCallHome: true,
            ...(hasCookies ? { cookies: norm(cookiesAbs) } : {}),
            addHeader: [
                "referer:https://www.instagram.com/",
                "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            ],
        };

        const stdout = await youtubedl(url, metaOpts);
        const j = typeof stdout === "string" ? JSON.parse(stdout) : stdout;

        const caption = j.description || j.title || "";
        const hashtags = (caption.match(/#[\p{L}\p{N}_]+/gu) || []).map(h => h.toLowerCase());


        meta = {
            id: j.id,
            permalink: j.webpage_url || url,
            username: j.uploader || j.uploader_id || "",
            caption,
            hashtags,
            duration_seconds: j.duration ?? null,
            taken_at: j.timestamp ? new Date(j.timestamp * 1000).toISOString() : null,
            thumb: j.thumbnail || (Array.isArray(j.thumbnails) ? j.thumbnails[0]?.url : undefined),
            stats: {
                views: j.view_count ?? null,
                likes: j.like_count ?? null,
                comments: j.comment_count ?? null,
            },
        };

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

        const key = `facebook/${fileName}`;

        const { s3url } = await uploadFileToS3(printedPath, key);
        console.log(s3url)

        await fs.promises.unlink(printedPath);


        return res.json({
            ok: true,
            msg: "Uploaded to S3 Faceboo Folder  and cleaned up local file",
            s3url,
            key,
            metadata: meta
        });


    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ ok: false, error: error.message });
    }
}


const XVideoDownloaderV1WithMeta = async (req, res) => {
    try {
        let { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

        // Normalize common X/Twitter URL forms
        // Accepts https://x.com/{user}/status/{id} OR https://twitter.com/{user}/status/{id}
        try {
            const u = new URL(url);
            if (
                (u.hostname.includes("x.com") || u.hostname.includes("twitter.com")) &&
                u.pathname.includes("/status/")
            ) {
                // keep as-is
            } else {
                // Best-effort: if it's a share URL or mobile, try to coerce host
                if (u.hostname.includes("mobile.twitter.com")) {
                    u.hostname = "twitter.com";
                    url = u.toString();
                }
            }
        } catch { /* ignore */ }

        const outDirAbs = path.resolve(__dirname, "../x");
        if (!fs.existsSync(outDirAbs)) fs.mkdirSync(outDirAbs, { recursive: true });

        const uniqueName = `xvideo-${Date.now()}.mp4`;
        const outputPath = norm(path.join(outDirAbs, uniqueName));
        const fileName = path.basename(outputPath);
        const key = `x/${fileName}`;

        // Clean pre-existing file (rare but safe)
        if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath);

        // Optional cookies for protected/age-gated/region-limited tweets
        const COOKIES_PATH = path.resolve(__dirname, "../twittercookies.txt");
        const hasCookies = fs.existsSync(COOKIES_PATH);

        if (hasCookies) {
            const st = await fs.promises.stat(COOKIES_PATH);
            console.log("COOKIES_PATH =", COOKIES_PATH, true);
            console.log("cookie size =", st.size);
        } else {
            console.warn("No cookies file found. Some tweets may fail without login.");
        }

        // 1) Fetch metadata (tweet text, author, etc.) without downloading media
        const metaOpts = {
            dumpSingleJson: true,   // -j
            skipDownload: true,     // --skip-download
            noWarnings: true,
            noCallHome: true,
            addHeader: [
                "User-Agent: Mozilla/5.0",
                "Referer: https://x.com/",
            ],
            cookies: hasCookies ? COOKIES_PATH : undefined,
        };

        const metaStdout = await youtubedl(url, metaOpts);
        const j = typeof metaStdout === "string" ? JSON.parse(metaStdout) : metaStdout;

        // Extract caption & hashtags
        const caption = (j.description || "").trim();
        const hashtags = Array.from(
            new Set(
                (caption.match(/#\w+/g) || []).map(h => h.trim())
            )
        );

        const meta = {
            id: j.id,
            url: j.webpage_url || url,
            title: j.title || "",                // often "Tweet by @handle"
            caption,
            hashtags,
            author_handle: j.uploader_id || "",  // e.g., "@jack"
            author_name: j.uploader || "",
            author_url: j.uploader_url || "",
            duration_seconds: j.duration ?? null,
            upload_date: j.upload_date || null,  // YYYYMMDD
            thumbnail: j.thumbnail || "",
            thumbnails: j.thumbnails || [],
            like_count: j.like_count ?? null,    // may be null if extractor can't fetch
            repost_count: j.repost_count ?? null // field availability can vary
        };

        // 2) Download best quality and ensure a single MP4 output
        // On X, many videos are HLS/DASH. Let yt-dlp handle merge/remux to MP4.
        // Requires ffmpeg available on PATH.
        const dlOpts = {
            // Prefer best combo or single best mp4; fallback to best overall then recode to mp4
            f: "bv*+ba/b[ext=mp4]/b",
            mergeOutputFormat: "mp4",         // --merge-output-format mp4
            // If your yt-dlp uses --recode-video instead (older), you can use:
            // recodeVideo: "mp4",
            noPlaylist: true,
            maxDownloads: 1,
            playlistItems: "1",
            noPart: true,
            noProgress: true,
            restrictFilenames: true,
            forceOverwrites: true,
            noContinue: true,
            output: outputPath,
            addHeader: [
                "User-Agent: Mozilla/5.0",
                "Referer: https://x.com/",
            ],
            cookies: hasCookies ? COOKIES_PATH : undefined,
            // ignoreConfig: true, // uncomment if a local yt-dlp config causes conflicts
        };

        try {
            await youtubedl(url, dlOpts);
        } catch (err) {
            // Some builds can throw even after successful write; verify file
            if (!(err && fs.existsSync(outputPath))) throw err;
        }

        if (!fs.existsSync(outputPath)) {
            throw new Error("yt-dlp did not produce an MP4 file for this tweet.");
        }

        // 3) Upload to S3 & cleanup
        const { s3url } = await uploadFileToS3(outputPath, key);
        await fs.promises.unlink(outputPath);

        return res.status(200).json({
            ok: true,
            msg: "Downloaded → Uploaded to S3 → Local deleted",
            key,
            s3url,
            metadata: meta,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, error: error.message });
    }
};

const LinkedinVideoDownloaderv1 = async (req, res) => {
    try {

        let { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: "Missing url" });

        try {
            const u = new URL(url);
            if (u.hostname.includes("lnkd.in")) {
            }
            if (u.hostname.includes("m.linkedin.com")) {
                u.hostname = "www.linkedin.com";
                url = u.toString();
            }
        } catch {
            // ignore parse issues; yt-dlp may still handle raw string
        }

        const outDirAbs = path.resolve(__dirname, "../linkedin");
        if (!fs.existsSync(outDirAbs)) fs.mkdirSync(outDirAbs, { recursive: true });

        const uniqueName = `linkedin-video-${Date.now()}.mp4`;
        const outputPath = norm(path.join(outDirAbs, uniqueName));
        const fileName = path.basename(outputPath);
        const key = `linkedin/${fileName}`;

        if (fs.existsSync(outputPath)) await fs.promises.unlink(outputPath);

        // 3) Optional cookies (for private/member-only/company-gated videos)
        //   Make a Netscape cookie jar at ../linkedincookies.txt if needed.
        const COOKIES_PATH = path.resolve(__dirname, "../linkedincookies.txt");
        const hasCookies = fs.existsSync(COOKIES_PATH);

        if (hasCookies) {
            const st = await fs.promises.stat(COOKIES_PATH);
            console.log("COOKIES_PATH =", COOKIES_PATH, true);
            console.log("cookie size =", st.size);
        } else {
            console.warn(
                "No LinkedIn cookies file found. Public videos may work; private/member-only will likely fail."
            );
        }

        const metaOpts = {
            dumpSingleJson: true,
            skipDownload: true,
            noWarnings: true,
            noCallHome: true,
            forceGenericExtractor: true,
            addHeader: [
                "User-Agent: Mozilla/5.0",
                "Referer: https://www.linkedin.com/",
            ],
            cookies: hasCookies ? COOKIES_PATH : undefined,
        };

        let metaRaw;

        try {
            metaRaw = await youtubedl(url, metaOpts);
        } catch (e) {
            // If meta fails without cookies, tell user to try with cookies
            if (!hasCookies) {
                throw new Error(
                    "LinkedIn metadata fetch failed without cookies. Try again with a cookies file (linkedincookies.txt)."
                );
            }
            throw e;
        }

        const j = typeof metaRaw === "string" ? JSON.parse(metaRaw) : metaRaw;

        const caption = (j.description || "").trim();
        const hashtags = Array.from(new Set((caption.match(/#\w+/g) || []).map(h => h.trim())));

        const meta = {
            id: j.id,
            url: j.webpage_url || url,
            title: j.title || "",
            caption,
            hashtags,
            author_name: j.uploader || "",
            author_url: j.uploader_url || "",
            duration_seconds: j.duration ?? null,
            upload_date: j.upload_date || null, // YYYYMMDD if available
            thumbnail: j.thumbnail || "",
            thumbnails: j.thumbnails || [],
            like_count: j.like_count ?? null,
            view_count: j.view_count ?? null,
        };

        const dlOpts = {
            f: "bv*+ba/b[ext=mp4]/b",
            mergeOutputFormat: "mp4",
            noPlaylist: true,
            maxDownloads: 1,
            playlistItems: "1",
            noPart: true,
            noProgress: true,
            restrictFilenames: true,
            forceOverwrites: true,
            noContinue: true,
            output: outputPath,
            addHeader: [
                "User-Agent: Mozilla/5.0",
                "Referer: https://www.linkedin.com/",
            ],
            cookies: hasCookies ? COOKIES_PATH : undefined,
            // ignoreConfig: true,
        };

        try {
            await youtubedl(url, dlOpts);
        } catch (err) {
            // Sometimes yt-dlp throws even after writing; verify file exists
            if (!(err && fs.existsSync(outputPath))) {
                // If it failed without cookies, guide user
                if (!hasCookies) {
                    throw new Error(
                        "LinkedIn download failed without cookies. This post may require login; supply linkedincookies.txt."
                    );
                }
                throw err;
            }
        }

        if (!fs.existsSync(outputPath)) {
            throw new Error("yt-dlp did not produce an MP4 file for this LinkedIn URL.");
        }


        const { s3url } = await uploadFileToS3(outputPath, key);
        await fs.promises.unlink(outputPath);


        return res.status(200).json({
            ok: true,
            msg: "Downloaded → Uploaded to S3 → Local deleted",
            key,
            s3url,
            metadata: meta,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, error: error.message });
    }
}

const thumbnailsDir = path.join(__dirname, 'thumbnails');
if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
}

const UploadImage = async (req, res) => {
    try {
        const filename = req.params.filename;

        console.log(req.params)

        if (!filename) {
            return res.status(400).json({
                error: 'Filename required'
            });
        }

        if (!req.body || req.body.length === 0) {
            return res.status(400).json({
                error: 'No file data'
            });
        }

        const filePath = path.join(thumbnailsDir, filename);

        fs.writeFileSync(filePath, req.body);
        const result = await uploadImageToS3(filePath, filename);



        res.status(200).json({
            message: 'File saved successfully',
           ...result
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ ok: false, error: err.message });
    }
};




module.exports = { UploadImage, XVideoDownloaderV1WithMeta, LinkedinVideoDownloaderv1, FacebookVideoDownloaderv1, YoutubeVideoDownoaderv3withMetaOptions, InstaDownloadControllerV3Latest, InstaDownloadControllerV2Latest, YoutubeDownloadControllerV2Latest, YoutubeDownloadControllerV2LatestVersion02 };

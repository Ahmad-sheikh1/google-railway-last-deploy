require("dotenv").config();
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const fs = require('fs');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function uploadFileToS3(filePath, key, bucket = "content-store-jay") {
    console.log('ENV REGION:', process.env.AWS_REGION, 'BUCKET:', process.env.S3_BUCKET);

    const stream = fs.createReadStream(filePath);
    const uploader = new Upload({
        client: s3,
        params: {
            Bucket: bucket,
            Key: key,
            Body: stream,
            ContentType: "video/mp4",
        },
    });
    await uploader.done();
    const s3url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return { bucket, key, s3url };
}


module.exports = { s3, uploadFileToS3 };
require("dotenv").config();
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const fs = require('fs');
const path = require('path');


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

async function uploadImageToS3(filePath, filename, bucket = "content-store-jay") {
    console.log('ENV REGION:', process.env.AWS_REGION, 'BUCKET:', process.env.S3_BUCKET);

    try {
        // Get file extension to determine content type
        const fileExtension = path.extname(filename).toLowerCase();
        
        // Map file extensions to content types
        const contentTypeMap = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml'
        };

        const contentType = contentTypeMap[fileExtension] || 'image/jpeg';
        
        // Create S3 key with instathumbnails folder
        const key = `instathumbnails/${filename}`;
        
        const stream = fs.createReadStream(filePath);
        
        const uploader = new Upload({
            client: s3,
            params: {
                Bucket: bucket,
                Key: key,
                Body: stream,
                ContentType: contentType,
            },
        });
        
        // Upload to S3
        await uploader.done();
        
        // Delete local file after successful upload
        fs.unlinkSync(filePath);
        console.log(`Local file deleted: ${filePath}`);
        
        const s3url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        
        return { 
            bucket, 
            key, 
            s3url,
            filename,
            contentType,
            message: 'Image uploaded successfully and local file deleted'
        };
        
    } catch (error) {
        console.error('Error uploading image to S3:', error);
        
        // If upload fails, don't delete the local file
        throw new Error(`S3 upload failed: ${error.message}`);
    }
}


module.exports = { s3, uploadFileToS3 , uploadImageToS3};
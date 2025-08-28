const cloudinary   = require("cloudinary").v2;
const stream = require("stream")

cloudinary .config({
    cloud_name: "dcwe0f1hk",
    api_key: "151122764114398",
    api_secret: "cnlKDFiQ-AlXHaYHq7wgN1kQRR4",
    secure: process.env.CLOUDINARY_SECURE !== 'false',
});


function uploadBufferToCloudinary(buffer, {
    folder = 'Screenshoots',
    public_id,
    tags = [],
    context = {},
    resource_type = 'image',
    transformation,
} = {}) {
    return new Promise((resolve, reject) => {
        const pass = new stream.PassThrough();
        const cld = cloudinary.uploader.upload_stream(
            { folder, public_id, tags, context, resource_type, transformation, use_filename: !!public_id, unique_filename: !public_id },
            (err, res) => (err ? reject(err) : resolve(res))
        );
        pass.end(buffer);
        pass.pipe(cld);
    });
}


module.exports = { cloudinary , uploadBufferToCloudinary }
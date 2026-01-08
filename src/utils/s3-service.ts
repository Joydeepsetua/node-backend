import AWS from 'aws-sdk';
import dotenv from 'dotenv';
dotenv.config();

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-south-1'
});

const s3 = new AWS.S3();

export interface S3UploadResult {
    success: boolean;
    url?: string;
    error?: string;
}

export const uploadToS3 = async (
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
): Promise<S3UploadResult> => {
    try {
        const bucketName = process.env.S3_BUCKET_NAME;
        const folder = process.env.S3_FOLDER_NAME || 'uploads';

        if (!bucketName) {
            throw new Error('S3_BUCKET_NAME environment variable is not set');
        }

        const params = {
            Bucket: bucketName,
            Key: folder ? `${folder}/${fileName}` : fileName,
            Body: fileBuffer,
            ContentType: contentType
        };

        const result = await s3.upload(params).promise();

        return {
            success: true,
            url: result.Location
        };
    } catch (error) {
        // Handle specific S3 errors
        if (error instanceof Error) {
            if (error.message.includes('Access Denied')) {
                return {
                    success: false,
                    error: 'Access denied to S3 bucket. Please check your AWS credentials and bucket permissions.'
                };
            } else if (error.message.includes('NoSuchBucket')) {
                return {
                    success: false,
                    error: 'S3 bucket not found. Please check your bucket name configuration.'
                };
            } else if (error.message.includes('InvalidAccessKeyId')) {
                return {
                    success: false,
                    error: 'Invalid AWS access key. Please check your AWS credentials.'
                };
            } else {
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        return {
            success: false,
            error: 'Unknown error occurred while uploading to S3'
        };
    }
};

export const deleteFromS3 = async (fileUrl: string): Promise<S3UploadResult> => {
    try {
        const bucketName = process.env.S3_BUCKET_NAME;

        if (!bucketName) {
            throw new Error('S3_BUCKET_NAME environment variable is not set');
        }

        // Extract key from URL
        const url = new URL(fileUrl);
        const key = url.pathname.substring(1); // Remove leading slash

        const params = {
            Bucket: bucketName,
            Key: key
        };
        await s3.deleteObject(params).promise();
        return {
            success: true
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}; 
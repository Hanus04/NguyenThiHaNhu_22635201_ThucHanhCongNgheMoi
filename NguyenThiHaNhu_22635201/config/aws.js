require("dotenv").config();

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { S3Client } = require("@aws-sdk/client-s3");

const dynamoClient = new DynamoDBClient({
    region: process.env.AWS_REGION
});

const s3Client = new S3Client({
    region: process.env.AWS_REGION
});

module.exports = { dynamoClient, s3Client };


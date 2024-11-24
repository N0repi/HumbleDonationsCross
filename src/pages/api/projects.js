// projects.js

import AWS from "aws-sdk"

// Set AWS SDK configuration
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
})

const s3 = new AWS.S3()

export default async function handler(req, res) {
    console.log("Request to /api/projects received")

    if (req.method === "POST") {
        // Parse JSON body from the request
        const project = req.body
        console.log("Received new project:", project)

        // Fetch the existing projects data from S3
        const s3Params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: "db.json",
        }

        try {
            const existingData = await s3.getObject(s3Params).promise()
            const existingProjects = JSON.parse(existingData.Body.toString("utf-8"))

            // Add the new project to the existing data
            existingProjects.projects.push(project)

            // Update S3 bucket with the new data
            const jsonData = JSON.stringify(existingProjects, null, 2)
            const updateParams = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: "db.json",
                Body: jsonData,
                ContentType: "application/json",
            }

            await s3.upload(updateParams).promise()
            console.log("Data written to S3 bucket")

            res.status(200 || 201).json(project)
        } catch (error) {
            console.error("Error updating data in S3 bucket:", error)
            // res.status(500).json({ error: "Internal Server Error MSGx1" })
        }
    } else if (req.method === "GET") {
        const { title } = req.query

        // Fetch the projects data from S3
        const s3Params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: "db.json",
        }

        try {
            const data = await s3.getObject(s3Params).promise()
            const projects = JSON.parse(data.Body.toString("utf-8"))

            if (title) {
                // If a title is provided, filter the projects based on the title
                const filteredProjects = projects.projects.filter(
                    (project) => project.title.toLowerCase() === title.toLowerCase()
                )
                res.status(200 || 201).json(filteredProjects)
            } else {
                // If no title is provided, return all projects
                res.status(200 || 201).json(projects.projects)
            }
        } catch (error) {
            console.error("Error fetching data from S3 bucket:", error)
            // res.status(500).json({ error: "Internal Server Error MSGx2" })
        }
    } else {
        // Handle other HTTP methods (PUT, DELETE, etc.)
        res.status(405).end() // Method Not Allowed
    }
}

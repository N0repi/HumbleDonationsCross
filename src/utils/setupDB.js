// setupDB.js

import { Pool } from "pg"
import "./rds-combined-ca-bundle.pem"

// Calculate DAU (Daily Active Users) by logging SIWE

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT, // Typically 5432 for PostgreSQL
})

// SQL query to create the siwe_logs table
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS siwe_logs (
    id SERIAL PRIMARY KEY,
    address VARCHAR(255) UNIQUE,
    nonce VARCHAR(255),
    verify TIMESTAMP,
    me TIMESTAMP,
    logout TIMESTAMP
  );
`

// Function to create the table
const createTable = async () => {
    try {
        await pool.query(createTableQuery)
        console.log("Table siwe_logs created successfully")
    } catch (error) {
        console.error("Error creating table siwe_logs:", error)
    } finally {
        await pool.end()
    }
}

// Run the function to create the table
createTable()

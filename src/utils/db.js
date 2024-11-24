// utils/db.js
require("dotenv").config() // Load environment variables from .env.local
const { Pool } = require("pg")

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT, // Typically 5432 for PostgreSQL
})

module.exports = pool

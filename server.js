// Import required modules
require("dotenv").config(); // Load environment variables
const express = require("express"); // Web framework
const path = require("path"); // Utility for handling file paths

// Initialize Express app
const app = express();

// Middleware to parse URL-encoded and JSON payloads (optional, if needed later)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Start the server on the specified port (default: 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
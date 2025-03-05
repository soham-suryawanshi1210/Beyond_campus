const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// PostgreSQL setup
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "alumini_network",
  password: "root",
  port: 5432,
});

// Function to find user by username
async function findUserByUsername(username) {
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    return result.rows[0]; 
  } catch (error) {
    console.error("Error finding user by username:", error);
    throw error;
  }
}

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await findUserByUsername(username);
    if (user && await bcrypt.compare(password, user.password)) {
      const profileResult = await pool.query("SELECT * FROM alumni_profiles WHERE email = $1", [username]);
      const profileExists = profileResult.rows.length > 0;

      res.json({
        message: "Login successful",
        profileExists,
      });
    } else {
      res.status(401).json({ error: "Invalid username or password" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Register route
app.post("/register", async (req, res) => {
  const { username, password, securityQuestion, securityAnswer } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedAnswer = await bcrypt.hash(securityAnswer, 10);
    await pool.query(
      "INSERT INTO users (username, password, security_question, security_answer) VALUES ($1, $2, $3, $4)",
      [username, hashedPassword, securityQuestion, hashedAnswer]
    );
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    if (error.code === "23505") {
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

//view profile
app.get("/get-profile/:username", async (req, res) => {
  let { username } = req.params;
  username = decodeURIComponent(username); // Decode special characters
  console.log("Fetching profile for:", username); // Debugging

  try {
    const result = await pool.query(
      "SELECT first_name, last_name, email, passing_year, branch, company, designation, linkedin_url, profile_picture, achievements FROM alumni_profiles WHERE LOWER(email) = LOWER($1)", 
      [username]
    );

    if (result.rows.length === 0) {
      console.error("Profile not found for:", username);
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey("your sendgrid api key"); 


app.post("/forgot-password", async (req, res) => {
  const { username } = req.body;
  try {
    const user = await findUserByUsername(username);
    if (!user) return res.status(400).json({ error: "Invalid username" });

   
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

   
    await pool.query("UPDATE users SET password = $1 WHERE username = $2", [hashedPassword, username]);

    
    const msg = {
      to: username, 
      from: "soham12102004@gmail.com", 
      subject: "Password Reset Request @BeyondCampus.in",
      text: `Your new password is: ${newPassword}. Please change it after logging in.`,
      html: `
      <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9; text-align: center;">
        <div style="background: #784BA0; padding: 10px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Beyond Campus</h2>
        </div>
        
        <p style="font-size: 16px; color: #333;">We received a request to reset your password. Here is your new password:</p>
        
        <div style="font-size: 20px; font-weight: bold; padding: 10px; background: #fff; border: 2px solid #784BA0; display: inline-block; border-radius: 5px; margin: 10px auto;">
          ${newPassword}
        </div>
  
        <p style="font-size: 14px; color: #555;">Please change your password immediately after logging in for security reasons.</p>
        
  
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #777;">If you didn’t request this, please ignore this email or contact our support team.</p>
      </div>
    `,
  };

    await sgMail.send(msg);
    res.json({ message: "A new password has been sent to your email." });

  } catch (error) {
    console.error("Error in forgot-password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/change-password", async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;

  if (!username || !currentPassword || !newPassword) {
    console.log("Missing fields:", { username, currentPassword, newPassword });
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Fetch user details
    const user = await findUserByUsername(username);
    if (!user) {
      console.log("User not found:", username);
      return res.status(400).json({ error: "Invalid username" });
    }
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      console.log("Incorrect password for user:", username);
      return res.status(401).json({ error: "Incorrect current password" });
    }
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    // Update password in the database
    const result = await pool.query("UPDATE users SET password = $1 WHERE username = $2", [hashedNewPassword, username]);
    console.log("Password updated for:", username, result);
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



// Fetch security question route
app.get("/security-question/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query("SELECT security_question FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) return res.status(400).json({ error: "Invalid username" });

    res.json({ securityQuestion: result.rows[0].security_question });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Feedback submission route
app.post("/submit-feedback", async (req, res) => {
  const { subject, feedback } = req.body;

  if (!subject || !feedback) {
    return res.status(400).json({ error: "Subject and feedback are required" });
  }

  try {
    const query = "INSERT INTO feedback (subject, feedback, timestamp) VALUES ($1, $2, NOW())";
    await pool.query(query, [subject, feedback]);
    res.status(200).json({ message: "Feedback submitted successfully" });
  } catch (error) {
    console.error("Error saving feedback:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Multer image upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  },
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  }
});

app.use('/uploads', express.static('uploads'));

// Profile save route
// app.post('/save-profile', upload.single('profilePicture'), async (req, res) => {
//   const { firstName, lastName, email, passingYear, branch, company, designation, linkedIn, achievement } = req.body;
//   const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;

//   let achievements = [];

//   try {
//     // Ensure achievements are stored as a valid JSON array
//     if (achievement) {
//       try {
//         // Try to parse if it's a valid JSON string
//         achievements = JSON.parse(achievement);
//       } catch (err) {
//         // If it's not valid JSON, just assign an empty array or use it as-is
//         achievements = [achievement]; // or [] if you prefer no achievements
//       }
//     }

//     const result = await pool.query(
//       `INSERT INTO alumni_profiles (first_name, last_name, email, passing_year, branch, company, designation, linkedin_url, profile_picture, achievements) 
//        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
//       [firstName, lastName, email, passingYear, branch, company, designation, linkedIn, profilePicture, JSON.stringify(achievements)]
//     );

//     res.json({ success: true, profile: result.rows[0] });
//   } catch (err) {
//     console.error("Error saving profile:", err);
//     res.status(500).json({ success: false, message: 'Error saving profile' });
//   }
// });


app.post('/save-profile', upload.single('profilePicture'), async (req, res) => {
  const { firstName, lastName, email, passingYear, branch, company, designation, linkedIn, achievement } = req.body;
  const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;

  let achievements = achievement || ''; // Store achievements as plain text

  try {
      const result = await pool.query(
          `INSERT INTO alumni_profiles (first_name, last_name, email, passing_year, branch, company, designation, linkedin_url, profile_picture, achievements) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
           ON CONFLICT (email) DO UPDATE 
           SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, passing_year = EXCLUDED.passing_year, 
           branch = EXCLUDED.branch, company = EXCLUDED.company, designation = EXCLUDED.designation, 
           linkedin_url = EXCLUDED.linkedin_url, profile_picture = EXCLUDED.profile_picture, 
           achievements = EXCLUDED.achievements 
           RETURNING *`,
          [firstName, lastName, email, passingYear, branch, company, designation, linkedIn, profilePicture, achievements]
      );

      res.json({ success: true, profile: result.rows[0] });
  } catch (err) {
      console.error("Error saving profile:", err);
      res.status(500).json({ success: false, message: 'Error saving profile' });
  }
});



// Search route
app.get("/search", async (req, res) => {
  const { type, query } = req.query;
  let column;
  switch (type) {
    case "name":
      column = "first_name || ' ' || last_name";
      break;
    case "batch":
      column = "passing_year";
      break;
    case "company":
      column = "company";
      break;
    default:
      return res.status(400).json({ error: "Invalid search type" });
  }
  try {
    const result = await pool.query(
      `SELECT first_name, last_name, passing_year, company, designation, email, achievements, linkedin_url AS linkedin, profile_picture AS profile_pic 
       FROM alumni_profiles 
       WHERE ${column} ILIKE $1`,
      [`%${query}%`]
    );
    const profiles = result.rows.map(profile => ({
      ...profile,
      achievements: profile.achievements ? profile.achievements.split(', ') : []

    }));
    res.json(profiles);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


//view
app.get("/get-profile/:email", async (req, res) => {
  const email = req.params.email;
  console.log("Fetching profile for email:", email);

  try {
    const result = await pool.query("SELECT * FROM alumni_profiles WHERE email = $1", [email]);
    console.log("Query result:", result.rows);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Database error:", error.message);
    res.status(500).json({ error: error.message });  // Send actual error message for debugging
  }
});




// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

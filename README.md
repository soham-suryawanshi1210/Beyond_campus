# Beyond Campus - Alumni Connect Website

## Project Overview
Beyond Campus is a web-based Alumni Connect platform designed to foster professional engagement, knowledge sharing, and networking among alumni, students, and faculty members of JSPM institutions. The platform provides alumni with a space to update career information, explore professional opportunities, participate in events, and mentor current students.

## Features
- **User Authentication**: Secure login and registration system.
- **Profile Management**: Alumni can create and update their profiles.
- **Search & Networking**: Search alumni by name, batch, or company.
- **Announcements**: Stay updated with upcoming events.
- **Feedback System**: Users can provide feedback to improve the platform.

## Technologies Used
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL

## Installation & Setup
1. Clone the repository:
   
   git clone https://github.com/your-repo/beyond-campus.git

2. Install dependencies:
   npm install
 
3. Configure PostgreSQL database in `server.js`:
   ```js
   const pool = new Pool({
      user: "postgres",
      host: "localhost",
      database: "alumini_network",
      password: "your_password",
      port: 5432,
   });
   
4. Run the server:
   
   node server.js
  
5. Open `index.html` in a browser.

## Database Schema & Queries
### 1. **Users Table** (Authentication)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    security_question TEXT NOT NULL,
    security_answer TEXT NOT NULL
);
```

### 2. **Alumni Profiles Table**
```sql
CREATE TABLE alumni_profiles (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    passing_year INT NOT NULL,
    branch VARCHAR(100),
    company VARCHAR(255),
    designation VARCHAR(255),
    linkedin_url TEXT,
    profile_picture TEXT,
    achievements TEXT
);
```

### 3. **Feedback Table**
```sql
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    subject TEXT NOT NULL,
    feedback TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sample Queries
#### Insert User (Registration)
```sql
INSERT INTO users (username, password, security_question, security_answer)
VALUES ($1, $2, $3, $4);
```

#### Authenticate User (Login)
```sql
SELECT * FROM users WHERE username = $1;
```

#### Insert Alumni Profile
```sql
INSERT INTO alumni_profiles (first_name, last_name, email, passing_year, branch, company, designation, linkedin_url, profile_picture, achievements)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
ON CONFLICT (email) DO UPDATE SET
first_name = EXCLUDED.first_name,
last_name = EXCLUDED.last_name,
passing_year = EXCLUDED.passing_year,
branch = EXCLUDED.branch,
company = EXCLUDED.company,
designation = EXCLUDED.designation,
linkedin_url = EXCLUDED.linkedin_url,
profile_picture = EXCLUDED.profile_picture,
achievements = EXCLUDED.achievements;
```

#### Search Alumni by Name/Batch/Company
```sql
SELECT first_name, last_name, passing_year, company, designation, email, achievements, linkedin_url AS linkedin, profile_picture AS profile_pic
FROM alumni_profiles
WHERE first_name || ' ' || last_name ILIKE $1 OR passing_year::TEXT ILIKE $1 OR company ILIKE $1;
```

#### Submit Feedback
```sql
INSERT INTO feedback (subject, feedback) VALUES ($1, $2);
```

## Future Enhancements
- Implement real-time chat for networking.
- AI-based recommendations for alumni connections.
- Event registration & alumni job board integration.

## Developers
- **Soham**
- **Prerna**
- **Chaitanya**

---
**License:** all rights reserved with the developers


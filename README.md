# Photography Contest Platform

A full-stack web application for organizing and managing photography competitions with fair voting mechanisms. This platform allows participants to upload photos while designated admins can vote for their favorites and superadmin declair the winner.

<!-- ## Live Demo -->
<!-- [Photography Contest Platform](https://photography-contest-q18x.onrender.com/) -->

## Features

- **Secure Authentication System**
  - Random participant ID generation
  - Separate login flows for participants and admins
  - Single account per participant

- **Photo Management**
  - Seamless photo uploads (up to 10MB)
  - Gallery view of all submitted photos
  - Real-time likes counter

- **Role-Based Access Control**
  - Participants (1st, 2nd, and 3rd-year students) can upload photos
  - Admins (4th-year students) can view and like photos
  - Prevents voting manipulation through role separation

- **Automated Winner Selection**
  - Winner determined by highest photo likes
  - Time-limited prize claim system
  - Fallback winner selection if primary winner doesn't claim

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Storage**: AWS S3 Bucket
- **Deployment**: Render

## Installation and Setup

### Prerequisites
- Node.js and npm
- MongoDB
- AWS account with S3 access

### Backend Setup
1. Clone the repository
   ```
   git clone https://github.com/RAKESH-PATEL57/Zreyas-Photography-Event.git
   cd photography-contest-platform/backend
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file with the following variables
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_BUCKET_NAME=your_s3_bucket_name
   JWT_SECRET=your_jwt_secret
   ```

4. Start the server
   ```
   npm start
   ```

### Frontend Setup
1. Navigate to the frontend directory
   ```
   cd ../frontend
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file with the following variable
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. Start the development server
   ```
   npm start
   ```

## How to Participate

1. Click "Participant Login" and create a new account
2. Use the provided random participant ID and password to log in
3. Upload your photos (no watermarks, less than 10MB)
4. View all submitted photos and their likes

## Admin Access

1. Admins (4th-year students) use a separate login flow
2. After login, admins can browse all photos and like their favorites
3. Admins cannot participate in the contest

## Winner Selection

1. The photo with the highest likes wins
2. Winner must claim the prize within 10 minutes by clicking "Claim Prize"
3. Winner must provide Name, SIC, and Year details
4. If unclaimed, the prize goes to the runner-up

## Project Structure

```
photography-contest-platform/
├── backend/
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   ├── index.js
│   ├── .gitignore
│   ├── package-lock.json
│   ├── package.json
│   ├── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── vite.config.js
└── README.md
```

## Future Enhancements

- Email notifications for winners
- Social media sharing integration
- Advanced analytics for admins
- User profile customization
- Categories for different types of photography

## License

This project is licensed under the MIT License - see the LICENSE file for details.
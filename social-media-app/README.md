# SocialApp - Complete Node.js + Express + MySQL Project

## Features

- Register and login
- JWT authentication
- Password hashing with bcrypt
- User profiles
- Edit profile
- Create posts
- Delete your own posts
- Like / unlike posts
- Comments
- Follow / unfollow users
- Followers and following counts
- Responsive HTML/CSS/JavaScript frontend

## IMPORTANT: MySQL setup

### 1. Start MySQL

Make sure MySQL Server is running.

### 2. Create the database

Open MySQL Workbench and open:

`database/database.sql`

Run the complete script.

It creates:

- social_media
- users
- posts
- comments
- likes
- followers

### 3. Configure .env

The ZIP contains a `.env` file.

Open:

`.env`

Change ONLY this value:

`DB_PASSWORD=YOUR_MYSQL_PASSWORD`

For example, if your MySQL root password is `root123`:

`DB_PASSWORD=root123`

Keep:

`DB_HOST=localhost`
`DB_USER=root`
`DB_NAME=social_media`

Do not use quotes.

### 4. Install packages

Open terminal in this project folder:

```bash
npm install
```

### 5. Start

```bash
npm run dev
```

or:

```bash
npm start
```

The server checks the database connection before starting.

Successful output:

```text
MySQL connected successfully
Server running at http://localhost:3000
```

### 6. Open

```text
http://localhost:3000
```

Register an account, login, then use the application.

## If you get ER_ACCESS_DENIED_ERROR

If you see:

`Access denied for user ''@'localhost'`

the `.env` file is not configured or is not being loaded.

Make sure `.env` is in the same folder as `server.js`.

If you see:

`Access denied for user 'root'@'localhost'`

then `.env` is loading correctly, but the MySQL password is wrong. Update `DB_PASSWORD`.

## Project structure

```text
social-media-app/
├── .env
├── .env.example
├── package.json
├── server.js
├── README.md
├── database/
│   └── database.sql
└── public/
    ├── index.html
    ├── login.html
    ├── register.html
    ├── profile.html
    ├── app.js
    └── style.css
```


## Demo users and profile photos

The project includes `database/sample_data.sql`, which adds 8 random demo users with profile photos, sample posts, and follow relationships.

Run `database/database.sql` first, then run `database/sample_data.sql`.

All demo users use:

```text
Password: password123
```

Example login:

```text
Email: arjun@example.com
Password: password123
```

The demo profile photos use remote avatar URLs, so an internet connection is required to display them. You can replace any `profile_image` URL in `sample_data.sql` with your own image URL.


## Profile photo upload

A logged-in user can change only their own profile photo.

1. Open **My Profile** after logging in.
2. Choose a photo from your computer.
3. Click **Upload Photo**.

Supported formats:
- JPG / JPEG
- PNG
- WEBP
- GIF

Maximum file size: **2 MB**

Uploaded files are stored in:

```text
uploads/profiles/
```

The backend protects this endpoint with JWT authentication:

```text
POST /api/me/profile-photo
```

The photo is saved against the authenticated user's ID, so users cannot choose another user's ID to change their photo.

When viewing another user's profile, the upload control is hidden and they can only view/follow that user.

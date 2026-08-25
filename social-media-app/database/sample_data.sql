USE social_media;

-- Demo password for all sample users: password123
-- Password hashes below were generated with bcrypt.
INSERT IGNORE INTO users (username, email, password, bio, profile_image) VALUES
('Arjun Kumar', 'arjun@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Software developer and coffee lover.', 'https://i.pravatar.cc/300?img=12'),
('Priya Sharma', 'priya@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Designer | Traveller | Creator', 'https://i.pravatar.cc/300?img=47'),
('Rahul Verma', 'rahul@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Learning something new every day.', 'https://i.pravatar.cc/300?img=33'),
('Sneha Reddy', 'sneha@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Frontend enthusiast and photographer.', 'https://i.pravatar.cc/300?img=44'),
('Vikram Singh', 'vikram@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Backend, APIs and open source.', 'https://i.pravatar.cc/300?img=11'),
('Ananya Rao', 'ananya@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Student | Coder | Music lover', 'https://i.pravatar.cc/300?img=32'),
('Karthik Nair', 'karthik@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Building projects and chasing ideas.', 'https://i.pravatar.cc/300?img=68'),
('Meera Iyer', 'meera@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Books, technology and good conversations.', 'https://i.pravatar.cc/300?img=49');

-- Demo posts
INSERT INTO posts (user_id, content)
SELECT id, 'Welcome to SocialApp! Excited to connect with everyone.' FROM users WHERE email='arjun@example.com'
AND NOT EXISTS (SELECT 1 FROM posts WHERE content='Welcome to SocialApp! Excited to connect with everyone.');

INSERT INTO posts (user_id, content)
SELECT id, 'Just finished building my first full-stack project with Node.js and Express.' FROM users WHERE email='priya@example.com'
AND NOT EXISTS (SELECT 1 FROM posts WHERE content='Just finished building my first full-stack project with Node.js and Express.');

INSERT INTO posts (user_id, content)
SELECT id, 'What is everyone learning this week? Share your goals below!' FROM users WHERE email='rahul@example.com'
AND NOT EXISTS (SELECT 1 FROM posts WHERE content='What is everyone learning this week? Share your goals below!');

INSERT INTO posts (user_id, content)
SELECT id, 'A clean UI makes a huge difference. Working on some frontend improvements today.' FROM users WHERE email='sneha@example.com'
AND NOT EXISTS (SELECT 1 FROM posts WHERE content='A clean UI makes a huge difference. Working on some frontend improvements today.');

INSERT INTO posts (user_id, content)
SELECT id, 'APIs are the bridge between a great frontend and a reliable backend.' FROM users WHERE email='vikram@example.com'
AND NOT EXISTS (SELECT 1 FROM posts WHERE content='APIs are the bridge between a great frontend and a reliable backend.');

INSERT INTO posts (user_id, content)
SELECT id, 'Small progress every day adds up to big results.' FROM users WHERE email='ananya@example.com'
AND NOT EXISTS (SELECT 1 FROM posts WHERE content='Small progress every day adds up to big results.');

INSERT INTO posts (user_id, content)
SELECT id, 'Today I learned something new about SQL joins. Practice really helps!' FROM users WHERE email='karthik@example.com'
AND NOT EXISTS (SELECT 1 FROM posts WHERE content='Today I learned something new about SQL joins. Practice really helps!');

INSERT INTO posts (user_id, content)
SELECT id, 'Weekend reading recommendation: pick a topic you enjoy and learn deeply.' FROM users WHERE email='meera@example.com'
AND NOT EXISTS (SELECT 1 FROM posts WHERE content='Weekend reading recommendation: pick a topic you enjoy and learn deeply.');

-- Demo follows
INSERT IGNORE INTO followers (follower_id, following_id)
SELECT a.id, b.id FROM users a, users b
WHERE a.email='arjun@example.com' AND b.email='priya@example.com';

INSERT IGNORE INTO followers (follower_id, following_id)
SELECT a.id, b.id FROM users a, users b
WHERE a.email='priya@example.com' AND b.email='sneha@example.com';

INSERT IGNORE INTO followers (follower_id, following_id)
SELECT a.id, b.id FROM users a, users b
WHERE a.email='rahul@example.com' AND b.email='arjun@example.com';

INSERT IGNORE INTO followers (follower_id, following_id)
SELECT a.id, b.id FROM users a, users b
WHERE a.email='sneha@example.com' AND b.email='ananya@example.com';

INSERT IGNORE INTO followers (follower_id, following_id)
SELECT a.id, b.id FROM users a, users b
WHERE a.email='vikram@example.com' AND b.email='karthik@example.com';

INSERT IGNORE INTO followers (follower_id, following_id)
SELECT a.id, b.id FROM users a, users b
WHERE a.email='meera@example.com' AND b.email='priya@example.com';

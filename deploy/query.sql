SELECT id, username, email, "emailVerified", "verificationToken" IS NOT NULL as has_token FROM users;

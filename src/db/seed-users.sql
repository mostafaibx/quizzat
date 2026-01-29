-- Seed users for quizat
-- Generated with bcrypt cost factor 10

INSERT INTO users (id, email, name, password, role) VALUES ('seed-teacher-1', 'teacher@app.com', 'Teacher User', '$2b$10$TyGxCuE4Xr9A75xu8lvxzewNZ3dnGgyUvudMra7gu6jfxrJaxgMfO', 'teacher');
INSERT INTO users (id, email, name, password, role) VALUES ('seed-student-2', 'student@app.com', 'Student User', '$2b$10$tKgbnnfH/1SlMURFKQgaTOxtS3tf5qdFcM2hYUrubUOl5glI/xlkW', 'student');
INSERT INTO users (id, email, name, password, role) VALUES ('seed-admin-3', 'admin@app.com', 'Admin User', '$2b$10$1tXCWKkUVeL4zXvnn3AjjuEV20L6lg0m3GeEVtJcYBFe0XYI3qEFO', 'admin');

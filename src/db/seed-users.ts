import { hashSync } from "bcryptjs";

// Generate bcrypt hashes for seed users
const users = [
  { email: "teacher@app.com", password: "teacher@123", role: "teacher", name: "Teacher User" },
  { email: "student@app.com", password: "student@123", role: "student", name: "Student User" },
  { email: "admin@app.com", password: "admin@123", role: "admin", name: "Admin User" },
];

// Generate SQL INSERT statements
const sql = users
  .map((user, index) => {
    const hash = hashSync(user.password, 10);
    const id = `seed-${user.role}-${index + 1}`;
    return `INSERT INTO users (id, email, name, password, role) VALUES ('${id}', '${user.email}', '${user.name}', '${hash}', '${user.role}');`;
  })
  .join("\n");

console.log("-- Seed users for quizat");
console.log("-- Generated with bcrypt cost factor 10");
console.log("");
console.log(sql);

// app/broken-samples/samples/api.ts

const brokenAPI = `
import express from "express";
import db from "../db";

const router = express.Router();

router.post("/create-user", async (req, res) => {
  const name = req.body.name;
  const email = req.body.email;

  // VULNERABLE & BUGGY:
  // - No validation
  // - SQL injection via string concat
  // - No try/catch around DB call
  const query = \`INSERT INTO users (name, email) VALUES ('\${name}', '\${email}')\`;

  const result = await db.query(query); // Crashes if query fails

  res.send("User created");
});

export default router;
`;

export default brokenAPI;

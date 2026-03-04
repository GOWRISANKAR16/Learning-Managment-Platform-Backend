import { app } from "./app";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`LMS backend running on port ${PORT}`);
});


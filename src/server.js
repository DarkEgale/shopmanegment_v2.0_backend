const app = require("./app");
const connectDB = require("./config/db");
const env = require("./config/env");

const start = async () => {
  try {
    await connectDB();
    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

start();

import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`Canyon API running on http://localhost:${config.PORT}`);
});
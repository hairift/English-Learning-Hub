import { createApp } from "./app";

const port = Number(process.env.PORT || 5174);
const app = createApp();

app.listen(port, () => {
  console.log(`Sela Tutor English API berjalan di http://127.0.0.1:${port}`);
});

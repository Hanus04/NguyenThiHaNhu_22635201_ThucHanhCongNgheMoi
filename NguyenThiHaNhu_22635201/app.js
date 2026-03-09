const express = require("express");
const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cartRoutes");

app.use("/", productRoutes);
app.use("/", cartRoutes);

app.listen(3000, () => {
  console.log("Server running http://localhost:3000");
});



const express = require("express");
const bodyParser = require("body-parser");
const database = require("../database/index.js");

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(express.static(`${__dirname}/../dist`));

app.get("/reviews/", (req, res) => {
  console.log("GET request at /reviews/");
  if (!req.query.product_id) {
    res.status(400).send("ERROR: invalid product_id provided");
  } else {
    let product_id = req.query.product_id;
    let page = req.query.page || 1;
    let count = req.query.count || 5;
    let sort = req.query.sort || "relevant";
    let orderBy = null;
    if (sort !== "relevant") {
      if (sort === "helpful") {
        orderBy = "helpfulness";
      } else if (sort === "newest") {
        orderBy = "date";
      }
    }

    database.getReviews(product_id, page, count, orderBy, (err, reviewData) => {
      if (err) {
        console.log("GET request error: ", err);
        res.status(400).send(err);
      } else {
        console.log("GET requet success!");
        res.status(200).send(reviewData);
      }
    });
  }
});

app.get("/reviews/meta", (req, res) => {
  console.log("META TIME");
  console.log(req.query);
  let product_id = req.query.product_id;
  database.getMeta(product_id, (err, metaData) => {
    if (err) {
      console.log("GET request error: ", err);
      res.status(400).send(err);
    } else {
      console.log("GET requet success!");
      res.status(200).send(metaData);
    }
  });
});

app.listen(port, () => {
  console.log(`Listening on port: ${port}! Reviews API Server!`);
});

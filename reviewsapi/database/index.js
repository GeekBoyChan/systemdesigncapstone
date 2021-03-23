const Pool = require("pg").Pool;
const pool = new Pool({
  host: "localhost",
  database: "reviewsapi",
  port: 5432,
});

const getReviews = (product_id, page, count, orderBy, cb) => {
  console.log("getReviews was invoked. ID:", product_id);
  let updatedResults;
  const offset = (page - 1) * count;

  if (!orderBy) {
    pool
      .query("SELECT * FROM reviews WHERE product_id = $1 OFFSET $2 LIMIT $3", [
        product_id,
        offset,
        count,
      ])
      .then((results) => {
        updatedResults = results.rows;
        const photoPromises = [];
        for (let i = 0; i < results.rows.length; i++) {
          photoPromises.push(
            pool.query(
              "SELECT id, url FROM reviews_photos WHERE review_id = $1",
              [results.rows[i].id]
            )
          );
        }
        return Promise.all(photoPromises);
      })
      .then((result) => {
        for (let i = 0; i < updatedResults.length; i++) {
          updatedResults[i].photos = result[i].rows;
        }
        let finalResult = {
          product: product_id,
          page: page - 1,
          count: count,
          results: updatedResults,
        };
        cb(null, finalResult);
      })
      .catch((error) => {
        cb(error, null);
      });
  } else {
    pool
      .query(
        "SELECT * FROM reviews WHERE product_id = $1 ORDER BY $2 DESC OFFSET $3 LIMIT $4",
        [product_id, orderBy, offset, count]
      )
      .then((results) => {
        updatedResults = results.rows;
        console.log(updatedResults);
        const photoPromises = [];
        for (let i = 0; i < results.rows.length; i++) {
          photoPromises.push(
            pool.query(
              "SELECT id, url FROM reviews_photos WHERE review_id = $1",
              [results.rows[i].id]
            )
          );
        }
        return Promise.all(photoPromises);
      })
      .then((result) => {
        for (let i = 0; i < updatedResults.length; i++) {
          updatedResults[i].photos = result[i].rows;
        }
        let finalResult = {
          product: product_id,
          page: page - 1,
          count: count,
          results: updatedResults,
        };
        cb(null, finalResult);
      })
      .catch((error) => {
        cb(error, null);
      });
  }
};

const getMeta = (product_id, cb) => {
  console.log("getMeta invoked productID: ", product_id);
  let finalMeta = {
    product_id: product_id,
  };
  let metaPromise = [];
  metaPromise.push(
    pool.query(
      "SELECT count(rating),1 SortOrder FROM reviews Where product_id = 17762 AND rating = $1 UNION ALL SELECT count(rating),2 FROM reviews Where product_id = $1 AND rating = 2 UNION ALL  SELECT count(rating),3 FROM reviews Where product_id = $1 AND rating = 3 UNION ALL SELECT count(rating),4 FROM reviews Where product_id = $1 AND rating = 4 UNION ALL SELECT count(rating),5 FROM reviews Where product_id = $1 AND rating = 5 UNION ALL SELECT count(recommend),6 FROM reviews Where product_id = $1 AND recommend = false UNION ALL SELECT count(recommend),7 FROM reviews Where product_id = $1 AND recommend = true ORDER BY SortOrder",
      [product_id]
    )
  );
  metaPromise.push(
    pool.query(
      "select name, id, ROUND(AVG(value), 16) FROM(select c.name, c.id, cr.value from characteristics c inner join characteristic_reviews cr on c.id = cr.characteristic_id Where c.product_id = $1) sub Group by 1,2",
      [product_id]
    )
  );

  return Promise.all(metaPromise)
    .then((metaData) => {
      console.log("ratings/recommended: ", metaData[0].rows);
      console.log("characteristics: ", metaData[1].rows);
      let ratings = {};
      let recommended = {};
      let characteristics = {};
      for (let i = 1; i <= metaData[0].rows.length; i++) {
        if (i <= 5) {
          if (metaData[0].rows[i - 1].count > 0) {
            ratings[i] = metaData[0].rows[i - 1].count;
          }
        }
        if (i === 6) {
          if (metaData[0].rows[i - 1].count > 0) {
            recommended["false"] = metaData[0].rows[i - 1].count;
          }
        }
        if (i === 7) {
          if (metaData[0].rows[i - 1].count > 0) {
            recommended["true"] = metaData[0].rows[i - 1].count;
          }
        }
      }

      metaData[1].rows.forEach((characteristic) => {
        characteristics[characteristic.name] = {
          id: characteristic.id,
          value: characteristic.round,
        };
      });

      finalMeta.ratings = ratings;
      finalMeta.recommended = recommended;
      finalMeta.characteristics = characteristics;
      console.log("finalMeta: ", finalMeta);
      cb(null, finalMeta);
    })
    .catch((err) => {
      cb(err, null);
    });
};

module.exports = {
  getReviews,
  getMeta,
};

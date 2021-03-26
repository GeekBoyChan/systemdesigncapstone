const Pool = require("pg").Pool;
const pool = new Pool({
  user: "postgres",
  host: "3.142.240.142",
  database: "reviewsapi",
  password: "password",
  port: 5432,
});

const getReviews = (product_id, page, count, orderBy, cb) => {
  console.log("getReviews was invoked. ID:", product_id);
  let updatedResults;
  const offset = (page - 1) * count;

  if (!orderBy) {
    pool.query(
      "SELECT reviews.id as review_id, reviews.rating, reviews.summary, reviews.recommend, reviews.responce, reviews.body, reviews.date, reviews.reviewer_name, reviews.helpfulness, json_agg(json_build_object('id', reviews_photos.id, 'url',reviews_photos.url)) as photos from reviews left join reviews_photos on reviews.id = reviews_photos.review_id where product_id = $1 group by reviews.id OFFSET $2 LIMIT $3",
      [product_id, offset, count],
      (err, results) => {
        if (err) {
          cb(err, null);
        } else {
          console.log("results: ", results.rows);
          updatedResults = results.rows;
          for (let i = 0; i < results.rows.length; i++) {
            if (!results.rows[i].photos[0].id) {
              updatedResults[i].photos = [];
            }
          }
          console.log("updatedResults: ", updatedResults);
          let finalResult = {
            product: product_id,
            page: page - 1,
            count: count,
            results: updatedResults,
          };
          cb(null, finalResult);
        }
      }
    );
  } else {
    pool.query(
      "SELECT reviews.id as review_id, reviews.rating, reviews.summary, reviews.recommend, reviews.responce, reviews.body, reviews.date, reviews.reviewer_name, reviews.helpfulness, json_agg(json_build_object('id', reviews_photos.id, 'url',reviews_photos.url)) as photos from reviews left join reviews_photos on reviews.id = reviews_photos.review_id where product_id = $1 group by reviews.id ORDER BY $2 OFFSET $3 LIMIT $4",
      [product_id, orderBy, offset, count],
      (err, results) => {
        if (err) {
          cb(err, null);
        } else {
          updatedResults = results.rows;
          for (let i = 0; i < results.rows.length; i++) {
            if (!results.rows[i].photos[0].id) {
              updatedResults[i].photos = [];
            }
          }
          let finalResult = {
            product: product_id,
            page: page - 1,
            count: count,
            results: updatedResults,
          };
          cb(null, finalResult);
        }
      }
    );
  }
};

const getMeta = (product_id, cb) => {
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

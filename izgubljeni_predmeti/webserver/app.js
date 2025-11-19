const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

app.use(bodyParser.json());

// Read all
app.get('/applications', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM job_applications ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    handleError(res, err);
  }
});

// Read one
app.get('/applications/:id', async (req, res) => {
  
    handleError(res, "err");
  
});

function handleError(res, err) {
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

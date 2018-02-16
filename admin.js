const express = require('express');

const json2csv = require('json2csv');
// Nöfn á dálkum í töflu, nptað til að breyta í csv skrá
const fields = ['date', 'name', 'email', 'amount', 'ssn'];

const { Client } = require('pg');

const connectionString =
    process.env.DATABASE_URL || 'postgres://arnar:12345@localhost/v2';

const router = express.Router();

/*
  Búa til tengingu við gagnagrunn
  Þarf bara að búa til eina því það er bara einn notandi
*/
const client = new Client({ connectionString });
client.connect();

// Sækja töflu
async function fetchNotes() {
  const result = await client.query('SELECT * FROM info');
  return result.rows;
}

// Athuga hvort notandi hafi aðgang á viðkomandi síðu, annars redirect á login
function ensureLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.redirect('/login');
}

router.get('/', ensureLoggedIn, async (req, res) => {
  const notes = await fetchNotes();
  return res.render('admin', { notes, title: 'Stjórnsíða' });
});

router.get('/download', ensureLoggedIn, async (req, res) => {
  // Sækja töfluna
  const notes = await fetchNotes();
  // Breyta töflu í csv með json2csv
  const csv = json2csv({ data: notes, fields });
  // Sett upp svo /admin/download shippi download.csv skrá
  const filename = 'download.csv';
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

module.exports = router;

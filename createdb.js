const { Client } = require('pg');
const fs = require('fs');
const util = require('util');

const readFileAsync = util.promisify(fs.readFile);

const schemaFile = './schema.sql';
const connectionString = process.env.DATABASE_URL || 'postgres://arnar:12345@localhost/v2';

async function create() {
  const data = await readFileAsync(schemaFile);

  const client = new Client({ connectionString });
  await client.connect();
  await client.query(data.toString('utf-8'));
  await client.end();

  console.info('Schema created');
}

create().catch((err) => {
  console.error(err);
});

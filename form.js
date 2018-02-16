const express = require('express');
const { check, validationResult } = require('express-validator/check');
const users = require('./users');
const { Strategy } = require('passport-local');
const passport = require('passport');
const { Client } = require('pg');
const xss = require('xss');
const { sanitize } = require('express-validator/filter');

const router = express.Router();

router.use(express.urlencoded({ extended: true }));

const connectionString =
process.env.DATABASE_URL || 'postgres://arnar:12345@localhost/v2';

/*
  Búa til tengingu við gagnagrunn
  Þarf bara að búa til eina því það er bara einn notandi
*/
const client = new Client({ connectionString });
client.connect();

// köllum á async-middleware með þessu falli svo við getum gripið villur ef þæ koma upp
function catchErrors(fn) {
  return function (req, res, next) { // eslint-disable-line
    return fn(req, res, next).catch(next);
  };
}

function strat(username, password, done) {
  users
    .findByUsername(username)
    .then((user) => {
      if (!user) {
        return false;
      }

      return users.comparePasswords(password, user);
    })
    .then(res => done(null, res))
    .catch((err) => {
      done(err);
    });
}

passport.use(new Strategy(strat));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  users
    .findById(id)
    .then(user => done(null, user))
    .catch(err => done(err));
});

router.use(passport.initialize());
router.use(passport.session());

router.use((req, res, next) => {
  if (req.isAuthenticated()) {
    // getum núna notað user í viewum
    res.locals.user = req.user;
  }
  next();
});

/**
 * async fall sem bætir gildum í info töfluna í gagnagrunninum okkar
 * @param {*} note gildin object með gildum sem slegin voru inn í form-ið okkar
 */
async function addNote(note) {
  await client.query(
    'INSERT INTO info(name, email, ssn, amount) VALUES($1, $2, $3, $4)',
    [note.name, note.email, note.ssn, note.amount],
  );
}

router.get('/', (req, res) => {
  const data = {};
  // Ef innskráður þá sækja nafnið (form.pug birtist þá öðruvísi)
  if (req.isAuthenticated()) {
    data.user = req.user.name;
  }
  res.render('form', { data, title: 'Form' });
});

router.get('/thanks', (req, res) => {
  const data = {};
  // Ath hvort sé innskráður, þá bæta í data, svo footer sýni rétt!
  if (req.isAuthenticated()) {
    data.user = req.user.name;
  }
  res.render('thanks', { data, title: 'Takk fyrir' });
});

router.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/admin');
  }

  return res.render('login', { title: 'Innskráning' });
});

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

router.post(
  '/',

  // Hægt að nota .escape() hér aftast til að sanitize-a, en notum xss hér að neðan
  sanitize(['name', 'email', 'ssn', 'amount']).trim(),
  check('name').isLength({ min: 1 }).withMessage('Nafn má ekki vera tómt'),
  check('email').isLength({ min: 1 }).withMessage('Netfang má ekki vera tómt'),
  check('email').isEmail().withMessage('Netfang verður að vera netfang'),
  check('ssn').isLength({ min: 1 }).withMessage('Kennitala má ekki vera tóm'),
  check('ssn').matches(/^[0-9]{6}-?[0-9]{4}$/).withMessage('Kennitala verður að vera á formi 000000-0000'),
  check('amount').matches(/^\+?([1-9]\d*)$/).withMessage('Fjöldi verður að vera tala, stærri en 0'),

  catchErrors(async (req, res) => {
    const errors = validationResult(req);
    const data = req.body;

    // Ath hvort sé innskráður, þá bæta í data, svo footer sýni rétt!
    if (req.isAuthenticated()) {
      data.user = req.user.name;
    }

    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(i => i.msg);
      errors.array().map((i) => {
        data[`${i.param}Error`] = 'error';
        return 0;
      });
      return res.render('form', { errorMessages, data, title: 'Form' });
    }

    /**
     * Sækja lykla í data og map-a yfir þá
     * þ.e. xss beitt á öll input sem við erum að fara setja í
     * gagnagrunninn
     */
    Object.keys(data).map((key) => {
      data[key] = xss(data[key]);
      return 0;
    });

    // Búið að validate-a og sanitize-a, þá bæta í gagnagrunn og redirect
    try {
      await addNote(data);
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { err });
    }
    return res.redirect('/thanks');
  }),
);

router.post(
  '/login',
  passport.authenticate('local', {
    failureRedirect: '/login',
  }),
  (req, res) => {
    res.redirect('/admin');
  },
);

module.exports = router;

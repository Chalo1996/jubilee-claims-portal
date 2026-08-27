const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT id, email, full_name, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.full_name },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, me };

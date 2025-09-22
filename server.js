// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const path = require('path');

const app = express();

/* ---------- Config from .env ---------- */
/*
  Create a .env with:
  MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0...   (or local mongodb URI)
  SESSION_SECRET=some_long_secret
  STEAM_RETURN_URL=http://localhost:3000/auth/steam/return
  STEAM_REALM=http://localhost:3000/
  ADMIN_STEAM_ID=7656119xxxxxxxxxx   <-- set to your Steam64 ID to be the admin
*/
const {
  MONGODB_URI,
  SESSION_SECRET,
  STEAM_RETURN_URL,
  STEAM_REALM,
  ADMIN_STEAM_ID
} = process.env;

if(!MONGODB_URI || !SESSION_SECRET || !STEAM_RETURN_URL || !STEAM_REALM){
  console.warn('Missing env vars. See README in assistant response for required .env fields.');
}

/* ---------- Mongoose models ---------- */
mongoose.set('strictQuery', true);
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1) });

const ListingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  imageUrl: { type: String }, // NOTE: for real images, use proper file storage (S3, Firebase Storage, etc.)
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  ownerSteamId: { type: String, required: true }
});
const Listing = mongoose.model('Listing', ListingSchema);

/* ---------- Sessions ---------- */
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
}));

/* ---------- Passport + Steam OpenID ---------- */
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new SteamStrategy({
  returnURL: STEAM_RETURN_URL,
  realm: STEAM_REALM,
  apiKey: process.env.STEAM_API_KEY || '' // optional, but recommended for Steam web API calls
}, function(identifier, profile, done) {
  // profile contains Steam info; profile.id is the Steam64 ID
  // We'll keep profile as the session user object (do not store sensitive data in session)
  profile.identifier = identifier;
  return done(null, profile);
}));

app.use(passport.initialize());
app.use(passport.session());

/* ---------- Middleware ---------- */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // serves index.html and assets

/* ---------- Auth routes ---------- */
app.get('/auth/steam', passport.authenticate('steam', { failureRedirect: '/' }));

app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => {
    // On success redirect to the main page
    res.redirect('/');
  });

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

/* ---------- Helper: check admin ---------- */
function ensureAuthenticated(req, res, next){
  if(req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}
function ensureAdmin(req, res, next){
  if(!req.isAuthenticated || !req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
  const steamId = (req.user && req.user.id) || (req.user && req.user._json && req.user._json.steamid);
  if(String(steamId) === String(ADMIN_STEAM_ID)) return next();
  return res.status(403).json({ error: 'Forbidden: not admin' });
}

/* ---------- API: Listings ---------- */
// Public: list all listings
app.get('/api/listings', async (req, res) => {
  const items = await Listing.find().sort({ createdAt: -1 }).lean();
  res.json(items);
});

// Admin-only: create a listing (only the configured ADMIN_STEAM_ID)
app.post('/api/listings', ensureAdmin, async (req, res) => {
  const { title, imageUrl, notes } = req.body;
  if(!title) return res.status(400).json({ error: 'Title required' });
  const ownerSteamId = req.user.id || req.user._json?.steamid;
  const item = new Listing({ title, imageUrl, notes, ownerSteamId });
  await item.save();
  res.json({ ok: true, item });
});

// Admin-only: delete
app.delete('/api/listings/:id', ensureAdmin, async (req, res) => {
  const id = req.params.id;
  await Listing.findByIdAndDelete(id);
  res.json({ ok: true });
});

/* ---------- Small endpoint to return session user ---------- */
app.get('/api/me', (req, res) => {
  if(!req.isAuthenticated || !req.isAuthenticated()) return res.json({ user: null });
  // return a safe subset
  const safe = {
    id: req.user.id || req.user._json?.steamid,
    displayName: req.user.displayName || req.user._json?.personaname,
    photos: req.user.photos || req.user._json?.avatarfull
  };
  res.json({ user: safe });
});

/* ---------- Start server ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// tests/auth.test.js
// Disable emails and ensure JWT secret BEFORE any app code loads
process.env.DISABLE_EMAILS = '1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

const request = require('supertest');
const express = require('express');
const setup = require('./setup');

const authRoutes = require('../routes/authRoutes');
const adminRoutes = require('../routes/adminRoutes');

const User = require('../models/User');

let app;

beforeAll(async () => {
  await setup.connect();
  app = express();
  app.use(express.json());
  // mount only required routes for these tests
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
});

afterAll(async () => {
  await setup.closeDatabase();
});

afterEach(async () => {
  await setup.clearDatabase();
});

describe('Auth & Admin flows', () => {
  test('registers user and login returns token and user', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'alicepass'
    });
    expect(reg.statusCode).toBe(201);
    expect(reg.body).toHaveProperty('_id');
    expect(reg.body).toHaveProperty('email', 'alice@example.com');
    expect(reg.body).toHaveProperty('role', 'attendee');

    const login = await request(app).post('/api/auth/login').send({
      email: 'alice@example.com',
      password: 'alicepass'
    });
    expect(login.statusCode).toBe(200);
    expect(login.body).toHaveProperty('token');
    expect(login.body.user).toHaveProperty('role', 'attendee');
  });

  test('superadmin seeding and promotion flow', async () => {
    // create a superadmin directly in DB
    const superadmin = new User({ name: 'Super', email: 'super@example.com', password: 'superpass', role: 'superadmin' });
    await superadmin.save();

    // login superadmin to get token
    const loginSuper = await request(app).post('/api/auth/login').send({ email: 'super@example.com', password: 'superpass' });
    expect(loginSuper.statusCode).toBe(200);
    const superToken = loginSuper.body.token;
    expect(superToken).toBeDefined();

    // create an attendee to promote
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'bobpass'
    });
    expect(reg.statusCode).toBe(201);
    const bobId = reg.body._id;

    // superadmin promotes Bob to organizer
    const promote = await request(app)
      .put(`/api/admin/users/${bobId}/role`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ role: 'organizer' });
    expect(promote.statusCode).toBe(200);
    expect(promote.body.user).toHaveProperty('role', 'organizer');

    // ensure an organizer cannot assign superadmin (negative test)
    // login as organizer
    const loginOrg = await request(app).post('/api/auth/login').send({ email: 'bob@example.com', password: 'bobpass' });
    expect(loginOrg.statusCode).toBe(200);
    const orgToken = loginOrg.body.token;
    // try to assign superadmin with organizer token
    const tryPromote = await request(app)
      .put(`/api/admin/users/${bobId}/role`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ role: 'superadmin' });
    expect(tryPromote.statusCode).toBe(403);
  });

  test('invalid role and invalid userId produce 400', async () => {
    const superadmin = new User({ name: 'S', email: 's@example.com', password: 's', role: 'superadmin' });
    await superadmin.save();
    const loginSuper = await request(app).post('/api/auth/login').send({ email: 's@example.com', password: 's' });
    const superToken = loginSuper.body.token;

    // invalid role
    const reg = await request(app).post('/api/auth/register').send({ name: 'X', email: 'x@example.com', password: 'xpass' });
    const xId = reg.body._id;
    const invalidRole = await request(app)
      .put(`/api/admin/users/${xId}/role`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ role: 'nope' });
    expect(invalidRole.statusCode).toBe(400);

    // invalid object id
    const invalidId = await request(app)
      .put(`/api/admin/users/123/role`)
      .set('Authorization', `Bearer ${superToken}`)
      .send({ role: 'organizer' });
    expect(invalidId.statusCode).toBe(400);
  });
});

// tests/auth.test.js
const request = require('supertest');
const express = require('express');
require('dotenv').config(); // ensure env vars like JWT_SECRET exist for tests
const setup = require('./setup');

const authRoutes = require('../routes/authRoutes'); // adapt if your route path differs

let app;

beforeAll(async () => {
  await setup.connect();
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});

afterAll(async () => {
  await setup.closeDatabase();
});

afterEach(async () => {
  await setup.clearDatabase();
});

describe('Auth API', () => {
  test('POST /api/auth/register - success', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123', role: 'attendee' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('email', 'test@example.com');
    expect(res.body).not.toHaveProperty('password');
  });

  test('POST /api/auth/register - duplicate email fails', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'dup@example.com', password: 'password1' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'B', email: 'dup@example.com', password: 'password2' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  test('POST /api/auth/login - success returns token', async () => {
    // register first
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Login User', email: 'login@example.com', password: 'mypassword' });

    // login
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'mypassword' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('POST /api/auth/login - wrong password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Login User 2', email: 'login2@example.com', password: 'correctpass' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login2@example.com', password: 'wrongpass' });

    expect(res.statusCode).toBe(401);
  });
});

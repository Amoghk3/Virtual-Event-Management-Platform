// tests/events.test.js
const request = require('supertest');
const express = require('express');
require('dotenv').config();
const setup = require('./setup');

const authRoutes = require('../routes/authRoutes');
const eventRoutes = require('../routes/eventRoutes');

let app;

beforeAll(async () => {
  await setup.connect();
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
});

afterAll(async () => {
  await setup.closeDatabase();
});

afterEach(async () => {
  await setup.clearDatabase();
});

describe('Events API', () => {
  let organizerToken;
  let attendeeToken;
  beforeEach(async () => {
    // create organizer
    await request(app).post('/api/auth/register').send({
      name: 'Organizer', email: 'org@example.com', password: 'orgpass', role: 'organizer'
    });
    const orgLogin = await request(app).post('/api/auth/login').send({
      email: 'org@example.com', password: 'orgpass'
    });
    organizerToken = orgLogin.body.token;

    // create attendee
    await request(app).post('/api/auth/register').send({
      name: 'Attendee', email: 'att@example.com', password: 'attpass', role: 'attendee'
    });
    const attLogin = await request(app).post('/api/auth/login').send({
      email: 'att@example.com', password: 'attpass'
    });
    attendeeToken = attLogin.body.token;
  });

  test('organizer can create event', async () => {
    const future = new Date(Date.now() + 3600 * 1000).toISOString();
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'Test Event', description: 'desc', start: future, capacity: 10 });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body).toHaveProperty('title', 'Test Event');
    expect(res.body).toHaveProperty('organizer');
  });

  test('attendee cannot create event', async () => {
    const future = new Date(Date.now() + 3600 * 1000).toISOString();
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({ title: 'Bad Event', start: future });

    expect(res.statusCode).toBe(403);
  });

  test('attendee can register for event', async () => {
    const future = new Date(Date.now() + 3600 * 1000).toISOString();
    // create by organizer
    const create = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'Joinable', start: future, capacity: 2 });
    const eventId = create.body._id || create.body.id || create.body.id;

    // register as attendee
    const reg = await request(app)
      .post(`/api/events/${eventId}/register`)
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send();

    expect(reg.statusCode).toBe(200);
    expect(reg.body).toHaveProperty('message', expect.any(String));
  });

  test('duplicate registration is prevented', async () => {
    const future = new Date(Date.now() + 3600 * 1000).toISOString();
    const create = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'Joinable 2', start: future });

    const eventId = create.body._id || create.body.id;
    // first registration
    await request(app).post(`/api/events/${eventId}/register`).set('Authorization', `Bearer ${attendeeToken}`).send();
    // second registration should fail
    const second = await request(app).post(`/api/events/${eventId}/register`).set('Authorization', `Bearer ${attendeeToken}`).send();

    expect(second.statusCode).toBe(400);
  });
});

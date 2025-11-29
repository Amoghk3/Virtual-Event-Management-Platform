// tests/events.test.js
process.env.DISABLE_EMAILS = '1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

const request = require('supertest');
const express = require('express');
const setup = require('./setup');

const authRoutes = require('../routes/authRoutes');
const eventRoutes = require('../routes/eventRoutes');
const adminRoutes = require('../routes/adminRoutes');

const User = require('../models/User');
const Event = require('../models/Event');

let app;

function expectStatus(res, expected) {
  if (res.statusCode !== expected) {
    console.error('Unexpected response:', {
      status: res.statusCode,
      body: res.body,
      text: res.text
    });
  }
  expect(res.statusCode).toBe(expected);
}

beforeAll(async () => {
  await setup.connect();
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/admin', adminRoutes);
});

afterAll(async () => {
  await setup.closeDatabase();
});

afterEach(async () => {
  await setup.clearDatabase();
});

describe('Events & participation flows', () => {
  let superToken;
  let organizerToken;
  let attendeeToken;
  let eventId;
  let organizerId;

  beforeEach(async () => {
    const superadmin = new User({ name: 'Super', email: 'super@t.com', password: 'superpass', role: 'superadmin' });
    await superadmin.save();
    const loginSuper = await request(app).post('/api/auth/login').send({ email: 'super@t.com', password: 'superpass' });
    superToken = loginSuper.body.token;

    const regOrg = await request(app).post('/api/auth/register').send({ name: 'Org', email: 'org@t.com', password: 'orgpass' });
    organizerId = regOrg.body._id;

    await request(app).put(`/api/admin/users/${organizerId}/role`).set('Authorization', `Bearer ${superToken}`).send({ role: 'organizer' });
    const loginOrg = await request(app).post('/api/auth/login').send({ email: 'org@t.com', password: 'orgpass' });
    organizerToken = loginOrg.body.token;

    await request(app).post('/api/auth/register').send({ name: 'Bob', email: 'bob@t.com', password: 'bobpass' });
    const loginBob = await request(app).post('/api/auth/login').send({ email: 'bob@t.com', password: 'bobpass' });
    attendeeToken = loginBob.body.token;
  });

  test('organizer can create, update, and delete event', async () => {
    const future = new Date(Date.now() + 3600 * 1000).toISOString();
    const createRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'E1', description: 'desc', start: future, capacity: 2 });
    expectStatus(createRes, 201);
    eventId = createRes.body._id;

    const updateRes = await request(app)
      .put(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'E1-updated' });
    expectStatus(updateRes, 200);
    expect(updateRes.body).toHaveProperty('title', 'E1-updated');

    const delRes = await request(app)
      .delete(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${organizerToken}`);
    expectStatus(delRes, 200);
  });

  test('attendee can register and unregister; duplicates prevented; capacity enforced', async () => {
    const future = new Date(Date.now() + 3600 * 1000).toISOString();
    const createRes = await request(app).post('/api/events').set('Authorization', `Bearer ${organizerToken}`).send({
      title: 'Limited',
      start: future,
      capacity: 1
    });
    expectStatus(createRes, 201);
    eventId = createRes.body._id;

    const reg1 = await request(app).post(`/api/events/${eventId}/register`).set('Authorization', `Bearer ${attendeeToken}`).send();
    expectStatus(reg1, 200);

    const regDup = await request(app).post(`/api/events/${eventId}/register`).set('Authorization', `Bearer ${attendeeToken}`).send();
    expectStatus(regDup, 400);

    await request(app).post('/api/auth/register').send({ name: 'C', email: 'c@t.com', password: 'cpass' });
    const loginC = await request(app).post('/api/auth/login').send({ email: 'c@t.com', password: 'cpass' });
    const tokenC = loginC.body.token;

    const regC = await request(app).post(`/api/events/${eventId}/register`).set('Authorization', `Bearer ${tokenC}`).send();
    expectStatus(regC, 400); // event full

    const unreg = await request(app).post(`/api/events/${eventId}/unregister`).set('Authorization', `Bearer ${attendeeToken}`).send();
    expectStatus(unreg, 200);

    const regCAfter = await request(app).post(`/api/events/${eventId}/register`).set('Authorization', `Bearer ${tokenC}`).send();
    expectStatus(regCAfter, 200);
  });

  test('non-organizer cannot create event', async () => {
    const future = new Date(Date.now() + 3600 * 1000).toISOString();
    const res = await request(app).post('/api/events').set('Authorization', `Bearer ${attendeeToken}`).send({
      title: 'Bad',
      start: future
    });
    expectStatus(res, 403);
  });
});

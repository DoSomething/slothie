'use strict';

const test = require('ava');
const chai = require('chai');
const nock = require('nock');

const integrationHelper = require('../../../helpers/integration');
const stubs = require('../../../helpers/stubs');

chai.should();

test.before(async () => {
  await integrationHelper.hooks.db.connect();
});

test.beforeEach((t) => {
  integrationHelper.hooks.app(t.context);
});

test.afterEach(async () => {
  await integrationHelper.hooks.db.messages.removeAll();
  await integrationHelper.hooks.db.conversations.removeAll();
  nock.cleanAll();
});

test.after.always(async () => {
  await integrationHelper.hooks.db.disconnect();
});

/**
 * GET /
 */
test('GET /api/v2/messages should return 401 if not using valid credentials', async (t) => {
  const res = await t.context.request.get(integrationHelper.routes.v2.messages());
  res.status.should.be.equal(401);
});

test('GET /api/v2/messages should return 404', async (t) => {
  const res = await t.context.request.get(integrationHelper.routes.v2.messages())
    .set('Authorization', `Basic ${integrationHelper.getAuthKey()}`);
  res.status.should.be.equal(404);
});

test('POST /api/v2/messages?origin=broadcastLite should return 422 if userId is not found', async (t) => {
  const cioWebhookPayload = stubs.broadcast.getCioWebhookPayload();
  cioWebhookPayload.userId = null;
  const res = await t.context.request
    .post(integrationHelper.routes.v2.messages(false, {
      origin: 'broadcastLite',
    }))
    .set('Authorization', `Basic ${integrationHelper.getAuthKey()}`)
    .send(cioWebhookPayload);

  res.status.should.be.equal(422);
  /**
   * TODO: checking against a hard coded string is brittle.
   * Will break w/ updating the error sent to user. Let's update when we cross that bridge.
   */
  res.body.message.should.include('Missing required userId');
});

test('POST /api/v2/messages?origin=broadcastLite should return 422 if broadcastId is not found', async (t) => {
  const cioWebhookPayload = stubs.broadcast.getCioWebhookPayload();
  cioWebhookPayload.broadcastId = null;
  const res = await t.context.request
    .post(integrationHelper.routes.v2.messages(false, {
      origin: 'broadcastLite',
    }))
    .set('Authorization', `Basic ${integrationHelper.getAuthKey()}`)
    .send(cioWebhookPayload);
  res.status.should.be.equal(422);
  res.body.message.should.include('Missing required broadcastId');
});

test('POST /api/v2/messages?origin=broadcastLite should return 422 if mobile is not found', async (t) => {
  const cioWebhookPayload = stubs.broadcast.getCioWebhookPayload();
  cioWebhookPayload.mobile = null;
  const res = await t.context.request
    .post(integrationHelper.routes.v2.messages(false, {
      origin: 'broadcastLite',
    }))
    .set('Authorization', `Basic ${integrationHelper.getAuthKey()}`)
    .send(cioWebhookPayload);
  res.status.should.be.equal(422);
  res.body.message.should.include('Missing required mobile');
});

test('POST /api/v2/messages?origin=broadcastLite should return 422 if mobile is not valid', async (t) => {
  const validMobileNumber = false;
  const cioWebhookPayload = stubs.broadcast.getCioWebhookPayload(validMobileNumber);

  nock(integrationHelper.routes.northstar.baseURI)
    .get(`/users/id/${cioWebhookPayload.userId}`)
    .reply(200, stubs.northstar.getUser({
      noMobile: true,
    }));

  nock(integrationHelper.routes.gambitContent.baseURI)
    .get(`/broadcasts/${stubs.getBroadcastId()}`)
    .reply(200, stubs.gambitContent.getBroadcastSingleResponse());

  const res = await t.context.request
    .post(integrationHelper.routes.v2.messages(false, {
      origin: 'broadcastLite',
    }))
    .set('Authorization', `Basic ${integrationHelper.getAuthKey()}`)
    .send(cioWebhookPayload);
  res.status.should.be.equal(422);
  res.body.message.should.include('Cannot format mobile number');
});

test('POST /api/v2/messages?origin=broadcastLite should return 404 if user is not found', async (t) => {
  const cioWebhookPayload = stubs.broadcast.getCioWebhookPayload();

  nock(integrationHelper.routes.northstar.baseURI)
    .get(`/users/id/${cioWebhookPayload.userId}`)
    .reply(404, {});

  nock(integrationHelper.routes.gambitContent.baseURI)
    .get(`/broadcasts/${stubs.getBroadcastId()}`)
    .reply(200, stubs.gambitContent.getBroadcastSingleResponse());

  const res = await t.context.request
    .post(integrationHelper.routes.v2.messages(false, {
      origin: 'broadcastLite',
    }))
    .set('Authorization', `Basic ${integrationHelper.getAuthKey()}`)
    .send(cioWebhookPayload);

  res.status.should.be.equal(404);
  res.body.message.should.include('Northstar user not found');
});

test('POST /api/v2/messages?origin=broadcastLite should return 422 if user is unsubscribed', async (t) => {
  const cioWebhookPayload = stubs.broadcast.getCioWebhookPayload();

  nock(integrationHelper.routes.northstar.baseURI)
    .get(`/users/id/${cioWebhookPayload.userId}`)
    .reply(200, stubs.northstar.getUser({
      noMobile: true,
      subscription: 'stop',
    }));

  nock(integrationHelper.routes.gambitContent.baseURI)
    .get(`/broadcasts/${stubs.getBroadcastId()}`)
    .reply(200, stubs.gambitContent.getBroadcastSingleResponse());

  const res = await t.context.request
    .post(integrationHelper.routes.v2.messages(false, {
      origin: 'broadcastLite',
    }))
    .set('Authorization', `Basic ${integrationHelper.getAuthKey()}`)
    .send(cioWebhookPayload);

  res.status.should.be.equal(422);
  res.body.message.should.include('Northstar User is unsubscribed');
});

test('POST /api/v2/messages?origin=broadcastLite should return 200 if broadcast is sent successfully', async (t) => {
  const cioWebhookPayload = stubs.broadcast.getCioWebhookPayload();

  nock(integrationHelper.routes.northstar.baseURI)
    .get(`/users/id/${cioWebhookPayload.userId}`)
    .reply(200, stubs.northstar.getUser({
      noMobile: true,
    }));

  nock(integrationHelper.routes.gambitContent.baseURI)
    .get(`/broadcasts/${stubs.getBroadcastId()}`)
    .reply(200, stubs.gambitContent.getBroadcastSingleResponse());

  /**
   * We are using Twilio Test credentials in Wercker.
   * When this runs on wercker we are indeed making a call to the Twilio API.
   * But we do it with the Test credentials so its free and we are not actually
   * sending the text.
   */
  const res = await t.context.request
    .post(integrationHelper.routes.v2.messages(false, {
      origin: 'broadcastLite',
    }))
    .set('Authorization', `Basic ${integrationHelper.getAuthKey()}`)
    .send(cioWebhookPayload);

  res.status.should.be.equal(200);
  res.body.data.messages.length.should.be.equal(1);
});

test.serial('POST /api/v2/messages?origin=twilio should return 200 if processed successfully', async (t) => {
  const member = stubs.northstar.getUser({ validUsNumber: true });
  const inboundRequestPayload = stubs.twilio.getInboundRequestBody(member);

  // mock user fetch
  nock(integrationHelper.routes.northstar.baseURI)
    .get(`/users/mobile/${inboundRequestPayload.From}`)
    .reply(200, member)
    // mock user update
    .put(`/users/_id/${member.data.id}`)
    .reply(200, member);

  /**
   * FIXME: This test will fail in wercker since we are not yet intercepting the external
   * calls to G-Content API. Leaving it here so I can merge the GraphQL changes in the remote
   * master branch!
   */

  /**
   * We are using Twilio Test credentials in Wercker.
   * When this runs on wercker we are indeed making a call to the Twilio API.
   * But we do it with the Test credentials so its free and we are not actually
   * sending the text.
   */
  const res = await t.context.request
    .post(integrationHelper.routes.v2.messages(false, {
      origin: 'twilio',
    }))
    .set('Authorization', `Basic ${integrationHelper.getAuthKey()}`)
    .send(inboundRequestPayload);

  res.status.should.be.equal(200);
  res.body.data.messages.inbound.length.should.be.equal(1);
  res.body.data.messages.outbound.length.should.be.equal(1);
});

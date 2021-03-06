'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');

const helpers = require('../../../../../../lib/helpers');
const broadcastFactory = require('../../../../../helpers/factories/broadcast');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const parseBroadcast = require('../../../../../../lib/middleware/messages/broadcast/broadcast-parse');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

test.beforeEach((t) => {
  sandbox.stub(helpers.attachments, 'add')
    .returns(underscore.noop);
  sandbox.stub(helpers.request, 'setOutboundMessageTemplate')
    .returns(underscore.noop);
  sandbox.stub(helpers.request, 'setTopic')
    .returns(underscore.noop);
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(underscore.noop);
  t.context.req = httpMocks.createRequest();
  t.context.res = httpMocks.createResponse();
});

test.afterEach((t) => {
  sandbox.restore();
  t.context = {};
});

test('parseBroadcast should inject the broadcast.topic into req.topic if exists', async (t) => {
  const next = sinon.stub();
  const middleware = parseBroadcast();
  const broadcast = broadcastFactory.getValidAutoReplyBroadcast();
  t.context.req.broadcast = broadcast;
  sandbox.stub(helpers.request, 'setOutboundMessageText')
    .returns(underscore.noop);

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.request.setTopic.should.have.been.calledWith(t.context.req, broadcast.topic);
  helpers.request.setOutboundMessageText
    .should.have.been.calledWith(t.context.req, broadcast.text);
  helpers.request.setOutboundMessageTemplate
    .should.have.been.calledWith(t.context.req, broadcast.type);
  helpers.attachments.add
    .should.have.been.calledWith(t.context.req, broadcast.attachments[0]);
  next.should.have.been.called;
});

test('parseBroadcast should inject the broadcast into req.topic if broadcast.topic is empty', async (t) => {
  const next = sinon.stub();
  const middleware = parseBroadcast();
  const broadcast = broadcastFactory.getValidAskYesNo();
  t.context.req.broadcast = broadcast;
  sandbox.stub(helpers.request, 'setOutboundMessageText')
    .returns(underscore.noop);

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.request.setTopic.should.have.been.calledWith(t.context.req, broadcast);
  next.should.have.been.called;
});

test('parseBroadcast should call sendErrorResponse on error', async (t) => {
  const next = sinon.stub();
  const middleware = parseBroadcast();
  sandbox.stub(helpers.request, 'setOutboundMessageText')
    .throws();

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.sendErrorResponse.should.have.been.called;
  next.should.not.have.been.called;
});

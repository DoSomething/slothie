'use strict';

require('dotenv').config();

const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const httpMocks = require('node-mocks-http');
const underscore = require('underscore');
const Promise = require('bluebird');

const helpers = require('../../../../lib/helpers');
const analyticsHelper = require('../../../../lib/helpers/analytics');
const Conversation = require('../../../../app/models/Conversation');
const userFactory = require('../../../helpers/factories/user');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const createUser = require('../../../../lib/middleware/receive-message/user-create');

// sinon sandbox object
const sandbox = sinon.sandbox.create();
const conversation = new Conversation();

// stubs
const sendErrorResponseStub = underscore.noop;
const mockUser = userFactory.getValidUser();
const userLookupStub = () => Promise.resolve(mockUser);
const userLookupFailStub = () => Promise.reject({ message: 'Epic fail' });

// Setup!
test.beforeEach((t) => {
  sandbox.stub(analyticsHelper, 'addParameters')
    .returns(underscore.noop);
  sandbox.stub(helpers, 'sendErrorResponse')
    .returns(sendErrorResponseStub);

  // setup req, res mocks
  t.context.req = httpMocks.createRequest();
  t.context.req.conversation = conversation;
  t.context.res = httpMocks.createResponse();
});

// Cleanup!
test.afterEach((t) => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  t.context = {};
});

test('createUser should inject a user into the req object when created in Northstar', async (t) => {
  // setup
  const next = sinon.stub();
  const middleware = createUser();
  sandbox.stub(conversation, 'createNorthstarUserFromReq')
    .callsFake(userLookupStub);

  // test
  await middleware(t.context.req, t.context.res, next);
  const user = t.context.req.user;

  user.should.deep.equal(mockUser);
  conversation.createNorthstarUserFromReq.should.have.been.called;
  analyticsHelper.addParameters.should.have.been.called;
  next.should.have.been.called;
});

test('createUser should call next if req.user exists', async (t) => {
  // setup
  const next = sinon.stub();
  const middleware = createUser();
  t.context.req.user = mockUser;

  // test
  await middleware(t.context.req, t.context.res, next);
  analyticsHelper.addParameters.should.not.have.been.called;
  next.should.have.been.called;
});

test('createUser should call sendErrorResponse if Conversation.createNorthstarUserFromReq fails', async (t) => {
  // setup
  const next = sinon.stub();
  const middleware = createUser();
  sandbox.stub(conversation, 'createNorthstarUserFromReq')
    .callsFake(userLookupFailStub);

  // test
  await middleware(t.context.req, t.context.res, next);
  helpers.sendErrorResponse.should.have.been.called;
  analyticsHelper.addParameters.should.not.have.been.called;
  t.context.req.should.not.have.property('user');
  next.should.not.have.been.called;
});

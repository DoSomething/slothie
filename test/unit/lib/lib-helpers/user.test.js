'use strict';

require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const underscore = require('underscore');
const httpMocks = require('node-mocks-http');
const northstar = require('../../../../lib/northstar');
const rogue = require('../../../../lib/rogue');
const helpers = require('../../../../lib/helpers');
const subscriptionHelper = require('../../../../lib/helpers/subscription');
const config = require('../../../../config/lib/helpers/user');

chai.should();
chai.use(sinonChai);

// module to be tested
const userHelper = require('../../../../lib/helpers/user');

// sinon sandbox object
const sandbox = sinon.sandbox.create();

// stubs
const stubs = require('../../../helpers/stubs');
const conversationFactory = require('../../../helpers/factories/conversation');
const messageFactory = require('../../../helpers/factories/message');
const userFactory = require('../../../helpers/factories/user');

const mockPost = { id: stubs.getCampaignRunId() };
const mockUser = userFactory.getValidUser();
const userLookupStub = () => Promise.resolve(mockUser);
const platformUserAddressStub = {
  country: 'US',
};
const source = stubs.getPlatform();

test.beforeEach((t) => {
  t.context.req = httpMocks.createRequest();
  sandbox.stub(rogue, 'createPost')
    .returns(Promise.resolve(mockPost));
});

test.afterEach((t) => {
  t.context = {};
  sandbox.restore();
});

// createVotingPlan
test('createVotingPlan passes user voting plan info to rogue.createPost', async () => {
  const description = stubs.getRandomWord();
  sandbox.stub(userHelper, 'getVotingPlanDescription')
    .returns(description);
  const result = await userHelper.createVotingPlan(mockUser, source);
  rogue.createPost.should.have.been.calledWith({
    text: description,
    campaign_id: config.posts.votingPlan.campaignId,
    northstar_id: mockUser.id,
    type: config.posts.votingPlan.type,
    source,
  });
  result.should.deep.equal(mockPost);
});

// createVotingPlanIfDoesntExist
test('createVotingPlanIfDoesntExist returns null if voting plan exists for user', async (t) => {
  sandbox.stub(userHelper, 'fetchVotingPlan')
    .returns(Promise.resolve(mockPost));
  sandbox.stub(userHelper, 'createVotingPlan')
    .returns(Promise.resolve(mockPost));

  const result = await userHelper.createVotingPlanIfDoesntExist(mockUser, source);
  userHelper.fetchVotingPlan.should.have.been.calledWith(mockUser);
  userHelper.createVotingPlan.should.not.have.been.called;
  t.is(result, null);
});

test('createVotingPlanIfDoesntExist creates voting plan if voting plan does not exist for user', async () => {
  sandbox.stub(userHelper, 'fetchVotingPlan')
    .returns(Promise.resolve(null));
  sandbox.stub(userHelper, 'createVotingPlan')
    .returns(Promise.resolve(mockPost));

  const result = await userHelper.createVotingPlanIfDoesntExist(mockUser, source);
  userHelper.fetchVotingPlan.should.have.been.calledWith(mockUser);
  userHelper.createVotingPlan.should.have.been.calledWith(mockUser, source);
  result.should.deep.equal(mockPost);
});

// fetchById
test('fetchById calls northstar.fetchUserById', async () => {
  sandbox.stub(northstar, 'fetchUserById')
    .returns(userLookupStub);

  const result = await userHelper.fetchById(mockUser.id);
  northstar.fetchUserById.should.have.been.called;
  result.should.deep.equal(userLookupStub);
});

// fetchByMobile
test('fetchByMobile calls northstar.fetchUserById', async () => {
  sandbox.stub(northstar, 'fetchUserByMobile')
    .returns(userLookupStub);

  const result = await userHelper.fetchByMobile(mockUser.mobile);
  northstar.fetchUserByMobile.should.have.been.called;
  result.should.deep.equal(userLookupStub);
});

// fetchFromReq
test('fetchFromReq calls fetchById if !req.platformUserId', async (t) => {
  sandbox.stub(userHelper, 'fetchById')
    .returns(userLookupStub);
  sandbox.stub(userHelper, 'fetchByMobile')
    .returns(userLookupStub);
  t.context.req.userId = stubs.getUserId();

  await userHelper.fetchFromReq(t.context.req);
  userHelper.fetchById.should.not.have.been.calledWith(t.context.req, t.context.req.userId);
  userHelper.fetchByMobile.should.not.have.been.called;
});

test('fetchFromReq calls fetchByMobile if req.platformUserId', async (t) => {
  sandbox.stub(userHelper, 'fetchById')
    .returns(userLookupStub);
  sandbox.stub(userHelper, 'fetchByMobile')
    .returns(userLookupStub);
  t.context.req.platformUserId = stubs.getMobileNumber();

  await userHelper.fetchFromReq(t.context.req);
  userHelper.fetchByMobile.should.have.been.called;
  userHelper.fetchById.should.not.have.been.called;
});

// fetchVotingPlan
test('fetchVotingPlan should call rogue.getPosts with query for user voting plan', async () => {
  const mockQuery = { test: '123' };
  sandbox.stub(userHelper, 'getFetchVotingPlanQuery')
    .returns(mockQuery);
  sandbox.stub(rogue, 'getPosts')
    .returns(Promise.resolve({ data: [mockPost] }));

  const result = await userHelper.fetchVotingPlan(mockUser);
  rogue.getPosts.should.have.been.calledWith(mockQuery);
  result.should.deep.equal(mockPost);
});

// getCreatePayloadFromReq
test('getCreatePayloadFromReq should return object', () => {
  const req = {
    platform: stubs.getPlatform(),
    platformUserAddress: platformUserAddressStub,
    platformUserId: stubs.getMobileNumber(),
  };
  sandbox.stub(underscore, 'extend')
    .returns(platformUserAddressStub);
  const result = userHelper.getCreatePayloadFromReq(req);
  result.source.should.equal(req.platform);
  result.mobile.should.equal(req.platformUserId);
});

// getDefaultUpdatePayloadFromReq
test('getDefaultUpdatePayloadFromReq should return object', () => {
  const inboundMessage = messageFactory.getValidMessage();
  const conversation = conversationFactory.getValidConversation();
  const isSupportTopic = true;
  sandbox.stub(conversation, 'isSupportTopic')
    .returns(isSupportTopic);
  const result = userHelper.getDefaultUpdatePayloadFromReq({
    inboundMessage,
    conversation,
  });
  result.last_messaged_at.should.equal(inboundMessage.createdAt.toISOString());
  result.sms_paused.should.equal(isSupportTopic);
});

// getFetchVotingPlanQuery
test('getFetchVotingPlanQuery should return object with user id and voting plan campaign/type', () => {
  const result = userHelper.getFetchVotingPlanQuery(mockUser);
  result.should.deep.equal({
    'filter[northstar_id]': mockUser.id,
    'filter[campaign_id]': config.posts.votingPlan.campaignId,
    'filter[type]': config.posts.votingPlan.type,
  });
});

// getVotingPlanDescription
test('getVotingPlanDescription should return string with voting plan field values', () => {
  const votingPlan = {
    attending_with: mockUser[config.fields.votingPlanAttendingWith.name],
    method_of_transport: mockUser[config.fields.votingPlanMethodOfTransport.name],
    time_of_day: mockUser[config.fields.votingPlanTimeOfDay.name],
  };
  const result = userHelper.getVotingPlanDescription(mockUser);
  result.should.deep.equal(JSON.stringify(votingPlan));
});

// hasAddress
test('hasAddress should return true if user has address properties set', (t) => {
  const user = userFactory.getValidUserWithAddress();
  t.true(userHelper.hasAddress(user));
});

test('hasAddress should return false if user does not have address properties set', (t) => {
  const user = userFactory.getValidUser();
  t.falsy(userHelper.hasAddress(user));
});

// isPaused
test('isPaused should return user.sms_paused', (t) => {
  const user = userFactory.getValidUser();
  const result = userHelper.isPaused(user);
  t.deepEqual(result, user.sms_paused);
});

// setPendingSubscriptionStatusForUserId
test('setPendingSubscriptionStatusForUserId should call northstar.updateUser with pending status', async () => {
  const userId = mockUser.id;
  sandbox.stub(northstar, 'updateUser')
    .returns(Promise.resolve({}));

  await userHelper.setPendingSubscriptionStatusForUserId(userId);
  northstar.updateUser.should.have.been
    .calledWith(userId, { sms_status: subscriptionHelper.statuses.pending() });
});

// updateByMemberMessageReq
test('updateByMemberMessageReq should return rejected error if getDefaultUpdatePayloadFromReq throws', async (t) => {
  const error = { message: 'Epic fail' };
  sandbox.stub(userHelper, 'getDefaultUpdatePayloadFromReq')
    .throws(error);
  t.context.req.macro = stubs.getMacro();

  const result = await t.throws(userHelper.updateByMemberMessageReq(t.context.req));
  result.should.deep.equal(error);
});

test('updateByMemberMessageReq should return rejected error if getProfileUpdate throws', async (t) => {
  const error = { message: 'Epic fail' };
  sandbox.stub(userHelper, 'getDefaultUpdatePayloadFromReq')
    .returns({});
  sandbox.stub(helpers.macro, 'getProfileUpdate')
    .throws(error);
  t.context.req.macro = stubs.getMacro();

  const result = await t.throws(userHelper.updateByMemberMessageReq(t.context.req));
  result.should.deep.equal(error);
});

test('updateByMemberMessageReq should return northstar.updateUser', async (t) => {
  t.context.req.user = mockUser;
  sandbox.stub(userHelper, 'getDefaultUpdatePayloadFromReq')
    .returns({ abc: 1 });
  sandbox.stub(helpers.macro, 'getProfileUpdate')
    .returns({ def: 2 });
  sandbox.stub(northstar, 'updateUser')
    .returns(Promise.resolve(mockUser));
  sandbox.stub(userHelper, 'hasAddress')
    .returns(false);
  t.context.req.macro = stubs.getMacro();

  const result = await userHelper.updateByMemberMessageReq(t.context.req);
  northstar.updateUser.should.have.been.calledWith(mockUser.id, { abc: 1, def: 2 });
  userHelper.hasAddress.should.not.have.been.called;
  result.should.deep.equal(mockUser);
});

test('updateByMemberMessageReq should not send req.platformUserAddress if user has address', async (t) => {
  t.context.req.user = mockUser;
  sandbox.stub(userHelper, 'getDefaultUpdatePayloadFromReq')
    .returns({ abc: 1 });
  sandbox.stub(helpers.macro, 'getProfileUpdate')
    .returns({ def: 2 });
  sandbox.stub(northstar, 'updateUser')
    .returns(Promise.resolve(mockUser));
  t.context.req.platformUserAddress = { ghi: 3 };
  sandbox.stub(userHelper, 'hasAddress')
    .returns(true);
  t.context.req.macro = stubs.getMacro();

  const result = await userHelper.updateByMemberMessageReq(t.context.req);
  northstar.updateUser.should.have.been.calledWith(mockUser.id, { abc: 1, def: 2 });
  userHelper.hasAddress.should.have.been.calledWith(t.context.req.user);
  result.should.deep.equal(mockUser);
});

test('updateByMemberMessageReq should not send req.platformUserAddress if user does not have address', async (t) => {
  t.context.req.user = mockUser;
  sandbox.stub(userHelper, 'getDefaultUpdatePayloadFromReq')
    .returns({ abc: 1 });
  sandbox.stub(helpers.macro, 'getProfileUpdate')
    .returns({ def: 2 });
  sandbox.stub(northstar, 'updateUser')
    .returns(Promise.resolve(mockUser));
  t.context.req.platformUserAddress = { ghi: 3 };
  sandbox.stub(userHelper, 'hasAddress')
    .returns(false);
  t.context.req.macro = stubs.getMacro();

  const result = await userHelper.updateByMemberMessageReq(t.context.req);
  northstar.updateUser.should.have.been.calledWith(mockUser.id, { abc: 1, def: 2, ghi: 3 });
  userHelper.hasAddress.should.have.been.calledWith(t.context.req.user);
  result.should.deep.equal(mockUser);
});

test('updateByMemberMessageReq should call createVotingPlan if macro isCompletedVotingPlan', async (t) => {
  t.context.req.user = mockUser;
  sandbox.stub(userHelper, 'getDefaultUpdatePayloadFromReq')
    .returns({ abc: 1 });
  sandbox.stub(helpers.macro, 'getProfileUpdate')
    .returns({ def: 2 });
  sandbox.stub(northstar, 'updateUser')
    .returns(Promise.resolve(mockUser));
  t.context.req.platformUserAddress = { ghi: 3 };
  sandbox.stub(userHelper, 'hasAddress')
    .returns(false);
  t.context.req.macro = stubs.getMacro();
  sandbox.stub(helpers.macro, 'isCompletedVotingPlan')
    .returns(true);
  sandbox.stub(helpers.user, 'createVotingPlanIfDoesntExist')
    .returns(Promise.resolve(mockPost));

  const result = await userHelper.updateByMemberMessageReq(t.context.req);
  northstar.updateUser.should.have.been.calledWith(mockUser.id, { abc: 1, def: 2, ghi: 3 });
  userHelper.hasAddress.should.have.been.calledWith(t.context.req.user);
  helpers.user.createVotingPlanIfDoesntExist.should.have.been.calledWith(t.context.req.user);
  result.should.deep.equal(mockUser);
});

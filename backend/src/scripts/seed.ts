import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { connectDB, disconnectDB, getSandboxDb } from '../config/db';
import { ChallengeModel } from '../models/challenge.model';
import { SubmissionModel } from '../models/submission.model';
import { UserModel } from '../models/user.model';
import { QueryPayload } from '../types/query';
import { recomputeUserStats } from '../services/user-stats.service';

const productsSeed = [
  { sku: 'P-001', name: 'Laptop Pro 14', category: 'tech', price: 1800, stock: 4 },
  { sku: 'P-002', name: 'Smartphone X', category: 'tech', price: 999, stock: 8 },
  { sku: 'P-003', name: 'Monitor 4K', category: 'tech', price: 420, stock: 12 },
  { sku: 'P-004', name: 'Mouse Basic', category: 'tech', price: 35, stock: 150 },
  {
    sku: 'P-005',
    name: 'Mechanical Keyboard',
    category: 'tech',
    price: 129,
    stock: 40,
  },
  { sku: 'P-006', name: 'Headphones Pro', category: 'tech', price: 299, stock: 35 },
  { sku: 'P-007', name: 'Tablet Lite', category: 'tech', price: 380, stock: 21 },
];

const ordersSeed = [
  { orderId: 'O-1001', customerId: 'u1', status: 'paid', amount: 1200 },
  { orderId: 'O-1002', customerId: 'u1', status: 'paid', amount: 1300 },
  { orderId: 'O-1003', customerId: 'u1', status: 'pending', amount: 900 },
  { orderId: 'O-1004', customerId: 'u2', status: 'paid', amount: 2500 },
  { orderId: 'O-1005', customerId: 'u2', status: 'paid', amount: 1150 },
  { orderId: 'O-1006', customerId: 'u3', status: 'paid', amount: 200 },
  { orderId: 'O-1007', customerId: 'u3', status: 'paid', amount: 170 },
  { orderId: 'O-1008', customerId: 'u3', status: 'canceled', amount: 500 },
];

const usersSeed = [
  {
    username: 'admin',
    password: 'Admin12345!',
    role: 'admin' as const,
  },
  {
    username: 'ana',
    password: 'User12345!',
    role: 'user' as const,
  },
  {
    username: 'luis',
    password: 'User12345!',
    role: 'user' as const,
  },
];

const challenge1Baseline: QueryPayload = {
  type: 'find',
  collection: 'products',
  filter: { price: { $gte: 100 } },
  projection: { _id: 0, name: 1, price: 1 },
  sort: { price: -1 },
  limit: 3,
};

const challenge2Baseline: QueryPayload = {
  type: 'aggregate',
  collection: 'orders',
  pipeline: [
    { $match: { status: 'paid' } },
    { $group: { _id: '$customerId', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
  ],
  limit: 3,
};

const challenge3Baseline: QueryPayload = {
  type: 'aggregate',
  collection: 'orders',
  pipeline: [
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ],
  limit: 10,
};

const shouldReset = process.env.SEED_RESET !== 'false';

const seedSandboxDatasets = async (): Promise<void> => {
  const sandboxDb = getSandboxDb();

  if (shouldReset) {
    await sandboxDb.collection('products').deleteMany({});
    await sandboxDb.collection('orders').deleteMany({});
  }

  await sandboxDb.collection('products').insertMany(productsSeed);
  await sandboxDb.collection('orders').insertMany(ordersSeed);
};

const seedUsers = async (): Promise<Map<string, string>> => {
  if (shouldReset) {
    await UserModel.deleteMany({});
  }

  const usersMap = new Map<string, string>();

  for (const userSeed of usersSeed) {
    const passwordHash = await bcrypt.hash(userSeed.password, 12);

    const createdUser = await UserModel.create({
      username: userSeed.username,
      passwordHash,
      role: userSeed.role,
    });

    usersMap.set(userSeed.username, createdUser._id.toString());
  }

  return usersMap;
};

const seedChallenges = async (): Promise<Map<string, string>> => {
  if (shouldReset) {
    await ChallengeModel.deleteMany({});
  }

  const challenges = await ChallengeModel.insertMany([
    {
      title: 'Top 3 productos caros (price >= 100)',
      description:
        'Devuelve nombre y precio de los 3 productos con mayor precio, filtrando solo los que tienen price >= 100.',
      difficulty: 'easy',
      points: 100,
      datasetCollection: 'products',
      expectedResult: [
        { name: 'Laptop Pro 14', price: 1800 },
        { name: 'Smartphone X', price: 999 },
        { name: 'Monitor 4K', price: 420 },
      ],
      baselineQuery: challenge1Baseline,
      tags: ['find', 'filter', 'sort', 'limit'],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Total pagado por cliente',
      description:
        'Agrupa pedidos pagados por customerId y calcula total gastado por cliente, ordenando de mayor a menor.',
      difficulty: 'medium',
      points: 200,
      datasetCollection: 'orders',
      expectedResult: [
        { _id: 'u2', total: 3650 },
        { _id: 'u1', total: 2500 },
        { _id: 'u3', total: 370 },
      ],
      baselineQuery: challenge2Baseline,
      tags: ['aggregate', 'match', 'group', 'sort'],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Conteo de pedidos por estado',
      description:
        'Cuenta cuántos pedidos hay por status y devuelve el resultado ordenado por nombre de status.',
      difficulty: 'easy',
      points: 100,
      datasetCollection: 'orders',
      expectedResult: [
        { _id: 'canceled', count: 1 },
        { _id: 'paid', count: 6 },
        { _id: 'pending', count: 1 },
      ],
      baselineQuery: challenge3Baseline,
      tags: ['aggregate', 'group', 'sort'],
      active: true,
      orderMatters: true,
    },
  ]);

  return new Map(challenges.map((challenge) => [challenge.title, challenge._id.toString()]));
};

const seedSampleSubmissions = async (
  userIdsByUsername: Map<string, string>,
  challengeIdsByTitle: Map<string, string>,
): Promise<void> => {
  if (shouldReset) {
    await SubmissionModel.deleteMany({});
  }

  const anaId = userIdsByUsername.get('ana');
  const luisId = userIdsByUsername.get('luis');
  const challenge1Id = challengeIdsByTitle.get('Top 3 productos caros (price >= 100)');
  const challenge2Id = challengeIdsByTitle.get('Total pagado por cliente');
  const challenge3Id = challengeIdsByTitle.get('Conteo de pedidos por estado');

  if (!anaId || !luisId || !challenge1Id || !challenge2Id || !challenge3Id) {
    throw new Error('Could not resolve user/challenge IDs for sample submissions');
  }

  await SubmissionModel.insertMany([
    {
      userId: new Types.ObjectId(anaId),
      challengeId: new Types.ObjectId(challenge1Id),
      query: challenge1Baseline,
      status: 'evaluated',
      isCorrect: true,
      correctnessScore: 70,
      efficiencyScore: 18.6,
      queryQualityScore: 8.9,
      normalizedScore: 97.5,
      maxPoints: 100,
      score: 94.5,
      metrics: {
        submitted: {
          executionTimeMillis: 4,
          totalDocsExamined: 5,
          totalKeysExamined: 5,
        },
        baseline: {
          executionTimeMillis: 5,
          totalDocsExamined: 5,
          totalKeysExamined: 5,
        },
      },
      resultSample: [
        { name: 'Laptop Pro 14', price: 1800 },
        { name: 'Smartphone X', price: 999 },
        { name: 'Monitor 4K', price: 420 },
      ],
    },
    {
      userId: new Types.ObjectId(anaId),
      challengeId: new Types.ObjectId(challenge2Id),
      query: {
        type: 'aggregate',
        collection: 'orders',
        pipeline: [
          { $match: { status: 'paid' } },
          { $group: { _id: '$customerId', total: { $sum: '$amount' } } },
          { $sort: { total: 1 } },
        ],
        limit: 3,
      },
      status: 'evaluated',
      isCorrect: false,
      correctnessScore: 0,
      efficiencyScore: 0,
      queryQualityScore: 0,
      normalizedScore: 0,
      maxPoints: 200,
      score: 0,
      metrics: {
        submitted: {
          executionTimeMillis: 7,
          totalDocsExamined: 8,
          totalKeysExamined: 0,
        },
      },
      resultSample: [
        { _id: 'u3', total: 370 },
        { _id: 'u1', total: 2500 },
        { _id: 'u2', total: 3650 },
      ],
    },
    {
      userId: new Types.ObjectId(luisId),
      challengeId: new Types.ObjectId(challenge3Id),
      query: challenge3Baseline,
      status: 'evaluated',
      isCorrect: true,
      correctnessScore: 70,
      efficiencyScore: 16.4,
      queryQualityScore: 7.8,
      normalizedScore: 94.2,
      maxPoints: 100,
      score: 88.2,
      metrics: {
        submitted: {
          executionTimeMillis: 6,
          totalDocsExamined: 8,
          totalKeysExamined: 0,
        },
        baseline: {
          executionTimeMillis: 5,
          totalDocsExamined: 8,
          totalKeysExamined: 0,
        },
      },
      resultSample: [
        { _id: 'canceled', count: 1 },
        { _id: 'paid', count: 6 },
        { _id: 'pending', count: 1 },
      ],
    },
  ]);
};

const printSeedSummary = (): void => {
  console.log('Seed completed successfully.');
  console.log('Test accounts:');
  console.log('- admin / Admin12345!');
  console.log('- ana / User12345!');
  console.log('- luis / User12345!');
};

const run = async (): Promise<void> => {
  try {
    await connectDB();
    await seedSandboxDatasets();
    const users = await seedUsers();
    const challenges = await seedChallenges();
    await seedSampleSubmissions(users, challenges);

    const userIds = Array.from(users.values());
    for (const userId of userIds) {
      await recomputeUserStats(userId);
    }

    printSeedSummary();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

void run();

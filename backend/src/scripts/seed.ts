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
    password: '123456',
    role: 'admin' as const,
  },
  {
    username: 'user1',
    password: '123456',
    role: 'user' as const,
  },
  {
    username: 'user2',
    password: '123456',
    role: 'user' as const,
  },
  {
    username: 'user3',
    password: '123456',
    role: 'user' as const,
  },
  {
    username: 'user4',
    password: '123456',
    role: 'user' as const,
  },
  {
    username: 'user5',
    password: '123456',
    role: 'user' as const,
  },
  {
    username: 'user6',
    password: '123456',
    role: 'user' as const,
  },
  {
    username: 'user7',
    password: '123456',
    role: 'user' as const,
  },
  {
    username: 'user8',
    password: '123456',
    role: 'user' as const,
  },
  {
    username: 'user9',
    password: '123456',
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

const challenge4Baseline: QueryPayload = {
  type: 'find',
  collection: 'products',
  filter: { stock: { $lte: 20 } },
  projection: { _id: 0, sku: 1, stock: 1 },
  sort: { stock: 1 },
  limit: 3,
};

const challenge5Baseline: QueryPayload = {
  type: 'aggregate',
  collection: 'products',
  pipeline: [
    {
      $group: {
        _id: '$category',
        totalStock: { $sum: '$stock' },
        productCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ],
  limit: 10,
};

const challenge6Baseline: QueryPayload = {
  type: 'find',
  collection: 'orders',
  filter: { status: { $in: ['pending', 'canceled'] } },
  projection: { _id: 0, orderId: 1, status: 1, amount: 1 },
  sort: { amount: -1 },
  limit: 2,
};

const challenge7Baseline: QueryPayload = {
  type: 'aggregate',
  collection: 'orders',
  pipeline: [
    { $match: { status: 'paid' } },
    {
      $group: {
        _id: '$customerId',
        maxAmount: { $max: '$amount' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { maxAmount: -1, _id: 1 } },
  ],
  limit: 3,
};

const challenge8Baseline: QueryPayload = {
  type: 'find',
  collection: 'products',
  filter: { price: { $gte: 100, $lte: 500 } },
  projection: { _id: 0, name: 1, price: 1 },
  sort: { name: 1 },
  limit: 4,
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
    {
      title: 'Productos con stock bajo',
      description:
        'Devuelve sku y stock de productos con stock <= 20, ordenados de menor a mayor stock y limitados a 3.',
      difficulty: 'easy',
      points: 100,
      datasetCollection: 'products',
      expectedResult: [
        { sku: 'P-001', stock: 4 },
        { sku: 'P-002', stock: 8 },
        { sku: 'P-003', stock: 12 },
      ],
      baselineQuery: challenge4Baseline,
      tags: ['find', 'filter', 'sort', 'projection'],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Stock total por categoria',
      description:
        'Agrupa productos por categoria y calcula stock total y cantidad de productos, ordenando por categoria.',
      difficulty: 'medium',
      points: 200,
      datasetCollection: 'products',
      expectedResult: [{ _id: 'tech', totalStock: 270, productCount: 7 }],
      baselineQuery: challenge5Baseline,
      tags: ['aggregate', 'group', 'sum'],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Pedidos no pagados mas altos',
      description:
        'Obtiene los pedidos con status pending o canceled, devolviendo orderId, status y amount, ordenados por amount desc limit 2.',
      difficulty: 'easy',
      points: 100,
      datasetCollection: 'orders',
      expectedResult: [
        { orderId: 'O-1003', status: 'pending', amount: 900 },
        { orderId: 'O-1008', status: 'canceled', amount: 500 },
      ],
      baselineQuery: challenge6Baseline,
      tags: ['find', 'in', 'sort', 'limit'],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Maximo pago por cliente',
      description:
        'Para pedidos paid, calcula el monto maximo por customerId y la cantidad de pedidos paid por cliente.',
      difficulty: 'hard',
      points: 300,
      datasetCollection: 'orders',
      expectedResult: [
        { _id: 'u2', maxAmount: 2500, orders: 2 },
        { _id: 'u1', maxAmount: 1300, orders: 2 },
        { _id: 'u3', maxAmount: 200, orders: 2 },
      ],
      baselineQuery: challenge7Baseline,
      tags: ['aggregate', 'match', 'group', 'sort'],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Productos rango medio de precio',
      description:
        'Devuelve nombre y precio de productos con precio entre 100 y 500, ordenados por nombre y limitados a 4.',
      difficulty: 'medium',
      points: 200,
      datasetCollection: 'products',
      expectedResult: [
        { name: 'Headphones Pro', price: 299 },
        { name: 'Mechanical Keyboard', price: 129 },
        { name: 'Monitor 4K', price: 420 },
        { name: 'Tablet Lite', price: 380 },
      ],
      baselineQuery: challenge8Baseline,
      tags: ['find', 'filter', 'sort'],
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
  const mariaId = userIdsByUsername.get('maria');
  const pedroId = userIdsByUsername.get('pedro');
  const sofiaId = userIdsByUsername.get('sofia');
  const diegoId = userIdsByUsername.get('diego');
  const carlaId = userIdsByUsername.get('carla');
  const juanId = userIdsByUsername.get('juan');
  const elenaId = userIdsByUsername.get('elena');
  const challenge1Id = challengeIdsByTitle.get('Top 3 productos caros (price >= 100)');
  const challenge2Id = challengeIdsByTitle.get('Total pagado por cliente');
  const challenge3Id = challengeIdsByTitle.get('Conteo de pedidos por estado');
  const challenge4Id = challengeIdsByTitle.get('Productos con stock bajo');
  const challenge5Id = challengeIdsByTitle.get('Stock total por categoria');
  const challenge6Id = challengeIdsByTitle.get('Pedidos no pagados mas altos');
  const challenge7Id = challengeIdsByTitle.get('Maximo pago por cliente');
  const challenge8Id = challengeIdsByTitle.get('Productos rango medio de precio');

  if (
    !anaId ||
    !luisId ||
    !mariaId ||
    !pedroId ||
    !sofiaId ||
    !diegoId ||
    !carlaId ||
    !juanId ||
    !elenaId ||
    !challenge1Id ||
    !challenge2Id ||
    !challenge3Id ||
    !challenge4Id ||
    !challenge5Id ||
    !challenge6Id ||
    !challenge7Id ||
    !challenge8Id
  ) {
    console.log('Could not resolve user/challenge IDs for sample submissions');
    console.log('Ana:', anaId);
    console.log('Luis:', luisId);
    console.log('Maria:', mariaId);
    console.log('Pedro:', pedroId);
    console.log('Sofia:', sofiaId);
    console.log('Diego:', diegoId);
    console.log('Carla:', carlaId);
    console.log('Juan:', juanId);
    console.log('Elena:', elenaId);
    console.log('Challenge 1:', challenge1Id);
    console.log('Challenge 2:', challenge2Id);
    console.log('Challenge 3:', challenge3Id);
    console.log('Challenge 4:', challenge4Id);
    console.log('Challenge 5:', challenge5Id);
    console.log('Challenge 6:', challenge6Id);
    console.log('Challenge 7:', challenge7Id);
    console.log('Challenge 8:', challenge8Id);
    return;
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
    {
      userId: new Types.ObjectId(mariaId),
      challengeId: new Types.ObjectId(challenge4Id),
      query: challenge4Baseline,
      status: 'evaluated',
      isCorrect: true,
      correctnessScore: 70,
      efficiencyScore: 17.2,
      queryQualityScore: 8.1,
      normalizedScore: 95.3,
      maxPoints: 100,
      score: 92.3,
      metrics: {
        submitted: {
          executionTimeMillis: 5,
          totalDocsExamined: 7,
          totalKeysExamined: 0,
        },
      },
      resultSample: [
        { sku: 'P-001', stock: 4 },
        { sku: 'P-002', stock: 8 },
        { sku: 'P-003', stock: 12 },
      ],
    },
    {
      userId: new Types.ObjectId(pedroId),
      challengeId: new Types.ObjectId(challenge5Id),
      query: {
        type: 'aggregate',
        collection: 'products',
        pipeline: [{ $group: { _id: '$category', totalStock: { $sum: '$stock' } } }],
        limit: 10,
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
          executionTimeMillis: 6,
          totalDocsExamined: 7,
          totalKeysExamined: 0,
        },
      },
      resultSample: [{ _id: 'tech', totalStock: 270 }],
    },
    {
      userId: new Types.ObjectId(sofiaId),
      challengeId: new Types.ObjectId(challenge6Id),
      query: challenge6Baseline,
      status: 'evaluated',
      isCorrect: true,
      correctnessScore: 70,
      efficiencyScore: 15.9,
      queryQualityScore: 8.4,
      normalizedScore: 94.3,
      maxPoints: 100,
      score: 89.2,
      metrics: {
        submitted: {
          executionTimeMillis: 5,
          totalDocsExamined: 8,
          totalKeysExamined: 0,
        },
      },
      resultSample: [
        { orderId: 'O-1003', status: 'pending', amount: 900 },
        { orderId: 'O-1008', status: 'canceled', amount: 500 },
      ],
    },
    {
      userId: new Types.ObjectId(diegoId),
      challengeId: new Types.ObjectId(challenge7Id),
      query: challenge7Baseline,
      status: 'evaluated',
      isCorrect: true,
      correctnessScore: 70,
      efficiencyScore: 16.2,
      queryQualityScore: 8.6,
      normalizedScore: 94.8,
      maxPoints: 300,
      score: 284.4,
      metrics: {
        submitted: {
          executionTimeMillis: 7,
          totalDocsExamined: 8,
          totalKeysExamined: 0,
        },
      },
      resultSample: [
        { _id: 'u2', maxAmount: 2500, orders: 2 },
        { _id: 'u1', maxAmount: 1300, orders: 2 },
        { _id: 'u3', maxAmount: 200, orders: 2 },
      ],
    },
    {
      userId: new Types.ObjectId(carlaId),
      challengeId: new Types.ObjectId(challenge8Id),
      query: challenge8Baseline,
      status: 'evaluated',
      isCorrect: true,
      correctnessScore: 70,
      efficiencyScore: 17.5,
      queryQualityScore: 8.7,
      normalizedScore: 96.2,
      maxPoints: 200,
      score: 192.4,
      metrics: {
        submitted: {
          executionTimeMillis: 4,
          totalDocsExamined: 7,
          totalKeysExamined: 0,
        },
      },
      resultSample: [
        { name: 'Headphones Pro', price: 299 },
        { name: 'Mechanical Keyboard', price: 129 },
        { name: 'Monitor 4K', price: 420 },
        { name: 'Tablet Lite', price: 380 },
      ],
    },
    {
      userId: new Types.ObjectId(juanId),
      challengeId: new Types.ObjectId(challenge2Id),
      query: challenge2Baseline,
      status: 'pending',
    },
    {
      userId: new Types.ObjectId(elenaId),
      challengeId: new Types.ObjectId(challenge6Id),
      query: {
        type: 'find',
        collection: 'orders',
        filter: { $where: 'this.amount > 0' },
        limit: 10,
      },
      status: 'error',
      errorMessage: 'Query contains blocked operators',
    },
    {
      userId: new Types.ObjectId(luisId),
      challengeId: new Types.ObjectId(challenge1Id),
      query: {
        type: 'find',
        collection: 'products',
        filter: { price: { $gte: 100 } },
        projection: { _id: 0, name: 1, price: 1 },
        sort: { price: -1 },
        limit: 2,
      },
      status: 'evaluated',
      isCorrect: false,
      correctnessScore: 0,
      efficiencyScore: 0,
      queryQualityScore: 0,
      normalizedScore: 0,
      maxPoints: 100,
      score: 0,
      metrics: {
        submitted: {
          executionTimeMillis: 3,
          totalDocsExamined: 4,
          totalKeysExamined: 0,
        },
      },
      resultSample: [
        { name: 'Laptop Pro 14', price: 1800 },
        { name: 'Smartphone X', price: 999 },
      ],
    },
    {
      userId: new Types.ObjectId(mariaId),
      challengeId: new Types.ObjectId(challenge2Id),
      query: challenge2Baseline,
      status: 'evaluated',
      isCorrect: true,
      correctnessScore: 70,
      efficiencyScore: 17.7,
      queryQualityScore: 8.8,
      normalizedScore: 96.5,
      maxPoints: 200,
      score: 193,
      metrics: {
        submitted: {
          executionTimeMillis: 6,
          totalDocsExamined: 8,
          totalKeysExamined: 0,
        },
      },
      resultSample: [
        { _id: 'u2', total: 3650 },
        { _id: 'u1', total: 2500 },
        { _id: 'u3', total: 370 },
      ],
    },
    {
      userId: new Types.ObjectId(pedroId),
      challengeId: new Types.ObjectId(challenge5Id),
      query: challenge5Baseline,
      status: 'evaluated',
      isCorrect: true,
      correctnessScore: 70,
      efficiencyScore: 16.1,
      queryQualityScore: 8.3,
      normalizedScore: 94.4,
      maxPoints: 200,
      score: 188.8,
      metrics: {
        submitted: {
          executionTimeMillis: 7,
          totalDocsExamined: 7,
          totalKeysExamined: 0,
        },
      },
      resultSample: [{ _id: 'tech', totalStock: 270, productCount: 7 }],
    },
    {
      userId: new Types.ObjectId(anaId),
      challengeId: new Types.ObjectId(challenge8Id),
      query: challenge8Baseline,
      status: 'evaluated',
      isCorrect: true,
      correctnessScore: 70,
      efficiencyScore: 16.9,
      queryQualityScore: 8.5,
      normalizedScore: 95.4,
      maxPoints: 200,
      score: 190.8,
      metrics: {
        submitted: {
          executionTimeMillis: 4,
          totalDocsExamined: 7,
          totalKeysExamined: 0,
        },
      },
      resultSample: [
        { name: 'Headphones Pro', price: 299 },
        { name: 'Mechanical Keyboard', price: 129 },
        { name: 'Monitor 4K', price: 420 },
        { name: 'Tablet Lite', price: 380 },
      ],
    },
  ]);
};

const printSeedSummary = (): void => {
  console.log('Seed completed successfully.');
  console.log('Test accounts:');
  console.log('- admin / 123456');
  console.log('- ana / 123456');
  console.log('- luis / 123456');
  console.log('- maria / 123456');
  console.log('- pedro / 123456');
  console.log('- sofia / 123456');
  console.log('- diego / 123456');
  console.log('- carla / 123456');
  console.log('- juan / 123456');
  console.log('- elena / 123456');
  console.log('Seed data includes 8 active challenges and mixed submissions (evaluated, pending, error).');
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

import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { connectDB, disconnectDB, getSandboxDb } from '../config/db';
import { ChallengeModel } from '../models/challenge.model';
import { SubmissionModel } from '../models/submission.model';
import { UserModel } from '../models/user.model';
import { QueryPayload } from '../types/query';
import { recomputeUserStats } from '../services/user-stats.service';

const baseProducts = [
  { sku: 'P-001', name: 'Laptop Pro 14', category: 'tech', price: 1800, stock: 4 },
  { sku: 'P-002', name: 'Smartphone X', category: 'tech', price: 999, stock: 8 },
  { sku: 'P-003', name: 'Monitor 4K', category: 'tech', price: 420, stock: 12 },
  { sku: 'P-004', name: 'Mouse Basic', category: 'tech', price: 35, stock: 150 },
  { sku: 'P-005', name: 'Mechanical Keyboard', category: 'tech', price: 129, stock: 40 },
  { sku: 'P-006', name: 'Headphones Pro', category: 'tech', price: 299, stock: 35 },
  { sku: 'P-007', name: 'Tablet Lite', category: 'tech', price: 380, stock: 21 },
  { sku: 'P-008', name: 'Smartwatch Series 5', category: 'wearables', price: 249, stock: 50 },
  { sku: 'P-009', name: 'Wireless Earbuds', category: 'audio', price: 89, stock: 100 },
  { sku: 'P-010', name: 'Gaming Chair', category: 'furniture', price: 199, stock: 15 },
  { sku: 'P-011', name: 'Desk Lamp LED', category: 'office', price: 29, stock: 80 },
  { sku: 'P-012', name: 'External SSD 1TB', category: 'tech', price: 110, stock: 45 },
  { sku: 'P-013', name: 'Bluetooth Speaker', category: 'audio', price: 59, stock: 60 },
  { sku: 'P-014', name: 'Webcam 1080p', category: 'tech', price: 45, stock: 30 },
  { sku: 'P-015', name: 'Microphone USB', category: 'audio', price: 75, stock: 25 },
  { sku: 'P-016', name: 'USB-C Hub 7-in-1', category: 'accessories', price: 35, stock: 120 },
  { sku: 'P-017', name: 'Ergonomic Mouse', category: 'tech', price: 45, stock: 65 },
  { sku: 'P-018', name: 'Laptop Stand Aluminum', category: 'accessories', price: 25, stock: 90 },
  { sku: 'P-019', name: 'Dual Monitor Arm', category: 'furniture', price: 65, stock: 20 },
  { sku: 'P-020', name: 'Mech Keyboard Blue Switch', category: 'gaming', price: 110, stock: 35 },
  { sku: 'P-021', name: 'Noise Cancelling Headphones', category: 'audio', price: 349, stock: 18 },
  { sku: 'P-022', name: 'Tablet Pro 12"', category: 'tech', price: 850, stock: 10 },
  { sku: 'P-023', name: 'Smartphone Mini', category: 'tech', price: 699, stock: 22 },
  { sku: 'P-024', name: 'Wi-Fi 6 Router', category: 'networking', price: 130, stock: 40 },
  { sku: 'P-025', name: 'Smart Display 8"', category: 'smart_home', price: 129, stock: 25 },
  { sku: 'P-026', name: 'Action Camera 4K', category: 'photography', price: 299, stock: 15 },
  { sku: 'P-027', name: 'Power Bank 20000mAh', category: 'accessories', price: 49, stock: 200 },
  { sku: 'P-028', name: 'Wireless Charging Pad', category: 'accessories', price: 19, stock: 150 },
  { sku: 'P-029', name: 'Gaming Mouse Pad XL', category: 'gaming', price: 22, stock: 85 },
  { sku: 'P-030', name: 'HDMI Cable 2m', category: 'accessories', price: 9, stock: 300 },
  { sku: 'P-031', name: 'DisplayPort Cable 1.4', category: 'accessories', price: 14, stock: 250 },
  { sku: 'P-032', name: 'Ethernet Cable Cat8', category: 'networking', price: 12, stock: 400 },
  { sku: 'P-033', name: 'Smart Bulb RGB', category: 'smart_home', price: 15, stock: 120 },
  { sku: 'P-034', name: 'Smart Plug Mini', category: 'smart_home', price: 12, stock: 180 },
  { sku: 'P-035', name: 'Security Camera Indoor', category: 'smart_home', price: 45, stock: 60 },
  { sku: 'P-036', name: 'Video Doorbell', category: 'smart_home', price: 99, stock: 30 },
  { sku: 'P-037', name: 'E-Reader Paper White', category: 'tech', price: 139, stock: 40 },
  { sku: 'P-038', name: 'Portable Projector', category: 'video', price: 249, stock: 12 },
  { sku: 'P-039', name: 'Soundbar 2.1', category: 'audio', price: 149, stock: 25 },
  { sku: 'P-040', name: 'Over-ear Studio Monitor', category: 'audio', price: 199, stock: 14 },
  { sku: 'P-041', name: 'MicroSD Card 256GB', category: 'storage', price: 35, stock: 250 },
  { sku: 'P-042', name: 'USB Flash Drive 128GB', category: 'storage', price: 20, stock: 300 },
  { sku: 'P-043', name: 'NAS Storage 2-Bay', category: 'networking', price: 299, stock: 8 },
  { sku: 'P-044', name: 'Drawing Tablet', category: 'tech', price: 80, stock: 35 },
  { sku: 'P-045', name: 'VR Headset Basic', category: 'gaming', price: 299, stock: 15 },
  { sku: 'P-046', name: 'Smart Thermostat', category: 'smart_home', price: 199, stock: 20 },
  { sku: 'P-047', name: 'Fitness Tracker', category: 'wearables', price: 49, stock: 110 },
  { sku: 'P-048', name: 'Ring Light with Tripod', category: 'photography', price: 40, stock: 55 },
  { sku: 'P-049', name: 'Green Screen Collapsible', category: 'photography', price: 65, stock: 22 },
  { sku: 'P-050', name: 'Capture Card 1080p', category: 'gaming', price: 85, stock: 40 }
];

const categories = ['tech', 'gaming', 'audio', 'office', 'smart_home', 'wearables', 'accessories'];
const adjectives = ['Pro', 'Lite', 'Max', 'Ultra', 'Plus', 'Basic', 'Advanced', 'V2', 'Edition', 'Mini'];
const types = ['Cable', 'Adapter', 'Stand', 'Charger', 'Case', 'Pad', 'Hub', 'Lens', 'Mount', 'Controller'];

const generatedProducts = Array.from({ length: 5000 - baseProducts.length }).map((_, index) => {
  const skuNumber = index + baseProducts.length + 1;
  const randomType = types[Math.floor(Math.random() * types.length)];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];

  return {
    sku: `P-${skuNumber.toString().padStart(3, '0')}`,
    name: `${randomType} ${randomAdj}`,
    category: categories[Math.floor(Math.random() * categories.length)],
    price: Math.floor(Math.random() * 500) + 5,
    stock: Math.floor(Math.random() * 150) + 1,
  };
});

export const productsSeed = [...baseProducts, ...generatedProducts];

const baseOrders = [
  { orderId: 'O-1001', customerId: 'u1', status: 'paid', amount: 1200 },
  { orderId: 'O-1002', customerId: 'u1', status: 'paid', amount: 1300 },
  { orderId: 'O-1003', customerId: 'u1', status: 'pending', amount: 900 },
  { orderId: 'O-1004', customerId: 'u2', status: 'paid', amount: 2500 },
  { orderId: 'O-1005', customerId: 'u2', status: 'paid', amount: 1150 },
  { orderId: 'O-1006', customerId: 'u3', status: 'paid', amount: 200 },
  { orderId: 'O-1007', customerId: 'u3', status: 'paid', amount: 170 },
  { orderId: 'O-1008', customerId: 'u3', status: 'canceled', amount: 500 },
];

const statuses = ['paid', 'pending', 'canceled'];
const generatedOrders = Array.from({ length: 5000 - baseOrders.length }).map((_, index) => {
  return {
    orderId: `O-${1009 + index}`,
    customerId: `u${Math.floor(Math.random() * 100) + 1}`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    amount: Math.floor(Math.random() * 1000) + 10,
  };
});

export const ordersSeed = [...baseOrders, ...generatedOrders];

const usersSeed = [
  { username: 'admin', password: '123456', role: 'admin' as const },
  { username: 'user1', password: '123456', role: 'user' as const },
  { username: 'user2', password: '123456', role: 'user' as const },
  { username: 'user3', password: '123456', role: 'user' as const },
  { username: 'user4', password: '123456', role: 'user' as const },
  { username: 'user5', password: '123456', role: 'user' as const },
  { username: 'user6', password: '123456', role: 'user' as const },
  { username: 'user7', password: '123456', role: 'user' as const },
  { username: 'user8', password: '123456', role: 'user' as const },
  { username: 'user9', password: '123456', role: 'user' as const },
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
      title: 'Top 3 expensive products (price >= 100)',
      description:
        'Return the name and price of the top 3 most expensive products, filtering only those with price >= 100.',
      difficulty: 'easy',
      points: 100,
      datasetCollection: 'products',
      baselineQuery: challenge1Baseline,
      tags: ['find', 'filter', 'sort', 'limit'],
      notes: [
        "Project only 'name' and 'price', excluding '_id'.",
        "Sort descending by price, limited to 3."
      ],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Total paid per customer',
      description:
        'Group paid orders by customerId and calculate the total amount spent per customer, ordered from highest to lowest.',
      difficulty: 'medium',
      points: 200,
      datasetCollection: 'orders',
      baselineQuery: challenge2Baseline,
      tags: ['aggregate', 'match', 'group', 'sort'],
      notes: [
        "Use $match for 'paid' status.",
        "Group by '$customerId' and alias the sum of amount as 'total'.",
        "Sort descending by 'total'.",
        "Limited to 3 results."
      ],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Order count by status',
      description:
        'Count how many orders exist per status and return the result ordered alphabetically by status name.',
      difficulty: 'easy',
      points: 100,
      datasetCollection: 'orders',
      baselineQuery: challenge3Baseline,
      tags: ['aggregate', 'group', 'sort'],
      notes: [
        "Group by '$status' and alias the count as 'count'.",
        "Sort alphabetically by _id.",
        "Limited to 10 results."
      ],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Low stock products',
      description:
        'Return sku and stock of products with stock <= 20, ordered ascending by stock and limited to 3.',
      difficulty: 'easy',
      points: 100,
      datasetCollection: 'products',
      baselineQuery: challenge4Baseline,
      tags: ['find', 'filter', 'sort', 'projection'],
      notes: [
        "Project only 'sku' and 'stock' (exclude '_id').",
        "Sort ascending by stock, limited to 3 results."
      ],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Total stock by category',
      description:
        'Group products by category, calculating total stock and product count, ordered alphabetically by category.',
      difficulty: 'medium',
      points: 200,
      datasetCollection: 'products',
      baselineQuery: challenge5Baseline,
      tags: ['aggregate', 'group', 'sum'],
      notes: [
        "Group by '$category'.",
        "Use aliases 'totalStock' (sum of stock) and 'productCount' (sum of 1).",
        "Sort alphabetically by _id.",
        "Limited to 10 results."
      ],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Highest unpaid orders',
      description:
        'Get orders with pending or canceled status, returning orderId, status and amount, ordered by amount descending limit 2.',
      difficulty: 'easy',
      points: 100,
      datasetCollection: 'orders',
      baselineQuery: challenge6Baseline,
      tags: ['find', 'in', 'sort', 'limit'],
      notes: [
        "Use $in for 'pending' and 'canceled' statuses.",
        "Project 'orderId', 'status', 'amount' (exclude '_id').",
        "Sort descending by amount, limited to 2."
      ],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Max payment per customer',
      description:
        'For paid orders, calculate the maximum amount per customerId and the number of paid orders per customer.',
      difficulty: 'hard',
      points: 300,
      datasetCollection: 'orders',
      baselineQuery: challenge7Baseline,
      tags: ['aggregate', 'match', 'group', 'sort'],
      notes: [
        "Match 'paid' orders.",
        "Group by '$customerId', aliasing max amount as 'maxAmount' and order count as 'orders'.",
        "Sort descending by 'maxAmount', then ascending by '_id'.",
        "Limited to 3 results."
      ],
      active: true,
      orderMatters: true,
    },
    {
      title: 'Mid-range price products',
      description:
        'Return name and price of products priced between 100 and 500, ordered by name and limited to 4.',
      difficulty: 'medium',
      points: 200,
      datasetCollection: 'products',
      baselineQuery: challenge8Baseline,
      tags: ['find', 'filter', 'sort'],
      notes: [
        "Filter price between 100 and 500 inclusive ($gte, $lte).",
        "Project 'name', 'price' (exclude '_id').",
        "Sort alphabetically by name, limited to 4."
      ],
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

  const user1Id = userIdsByUsername.get('user1');
  const user2Id = userIdsByUsername.get('user2');
  const user3Id = userIdsByUsername.get('user3');
  const user4Id = userIdsByUsername.get('user4');
  const user5Id = userIdsByUsername.get('user5');
  const user6Id = userIdsByUsername.get('user6');
  const user7Id = userIdsByUsername.get('user7');
  const user8Id = userIdsByUsername.get('user8');
  const user9Id = userIdsByUsername.get('user9');
  const challenge1Id = challengeIdsByTitle.get('Top 3 expensive products (price >= 100)');
  const challenge2Id = challengeIdsByTitle.get('Total paid per customer');
  const challenge3Id = challengeIdsByTitle.get('Order count by status');
  const challenge4Id = challengeIdsByTitle.get('Low stock products');
  const challenge5Id = challengeIdsByTitle.get('Total stock by category');
  const challenge6Id = challengeIdsByTitle.get('Highest unpaid orders');
  const challenge7Id = challengeIdsByTitle.get('Max payment per customer');
  const challenge8Id = challengeIdsByTitle.get('Mid-range price products');

  if (
    !user1Id ||
    !user2Id ||
    !user3Id ||
    !user4Id ||
    !user5Id ||
    !user6Id ||
    !user7Id ||
    !user8Id ||
    !user9Id ||
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
    return;
  }

  await SubmissionModel.insertMany([
    {
      userId: new Types.ObjectId(user1Id),
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
      userId: new Types.ObjectId(user1Id),
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
      userId: new Types.ObjectId(user2Id),
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
      userId: new Types.ObjectId(user3Id),
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
      userId: new Types.ObjectId(user4Id),
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
      userId: new Types.ObjectId(user5Id),
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
      userId: new Types.ObjectId(user6Id),
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
      userId: new Types.ObjectId(user7Id),
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
      userId: new Types.ObjectId(user8Id),
      challengeId: new Types.ObjectId(challenge2Id),
      query: challenge2Baseline,
      status: 'pending',
    },
    {
      userId: new Types.ObjectId(user9Id),
      challengeId: new Types.ObjectId(challenge6Id),
      query: {
        type: 'find',
        collection: 'orders',
        filter: { amount: { $gt: 0 }, _blocked: '$where' },
        limit: 10,
      },
      status: 'error',
      errorMessage: 'Query contains blocked operators',
    },
    {
      userId: new Types.ObjectId(user2Id),
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
      userId: new Types.ObjectId(user3Id),
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
      userId: new Types.ObjectId(user4Id),
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
      userId: new Types.ObjectId(user1Id),
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
  for (let i = 1; i <= 9; i++) {
    console.log(`- user${i} / 123456`);
  }
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

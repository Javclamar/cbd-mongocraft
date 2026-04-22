import { Router } from 'express';
import { getSandboxDb } from '../config/db';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { ChallengeModel } from '../models/challenge.model';

const router = Router();

const getBsonScalarType = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if (Buffer.isBuffer(value)) {
    return 'buffer';
  }

  const bsonType =
    '_bsontype' in (value as Record<string, unknown>) &&
    typeof (value as Record<string, unknown>)._bsontype === 'string'
      ? ((value as Record<string, unknown>)._bsontype as string)
      : undefined;

  if (!bsonType) {
    return null;
  }

  if (bsonType === 'ObjectId' || bsonType === 'ObjectID') {
    return 'objectId';
  }

  if (bsonType === 'Decimal128') {
    return 'decimal128';
  }

  if (bsonType === 'Long') {
    return 'long';
  }

  if (bsonType === 'Int32') {
    return 'int32';
  }

  return bsonType.toLowerCase();
};

const isExpandableObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value) || value instanceof Date) {
    return false;
  }

  if (getBsonScalarType(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const getValueType = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (value instanceof Date) {
    return 'date';
  }

  const bsonType = getBsonScalarType(value);
  if (bsonType) {
    return bsonType;
  }

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return valueType;
  }

  if (valueType === 'object') {
    return 'object';
  }

  return 'unknown';
};

const addType = (fieldTypes: Map<string, Set<string>>, fieldPath: string, fieldType: string): void => {
  if (!fieldPath) {
    return;
  }

  const current = fieldTypes.get(fieldPath) ?? new Set<string>();
  current.add(fieldType);
  fieldTypes.set(fieldPath, current);
};

const collectFieldTypes = (
  value: unknown,
  parentPath: string,
  fieldTypes: Map<string, Set<string>>,
): void => {
  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      const arrayItemPath = parentPath ? `${parentPath}[]` : '[]';
      addType(fieldTypes, arrayItemPath, getValueType(item));

      if (isExpandableObject(item)) {
        collectFieldTypes(item, arrayItemPath, fieldTypes);
      }
    });
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    const currentType = getValueType(nestedValue);
    addType(fieldTypes, currentPath, currentType);

    if (Array.isArray(nestedValue)) {
      if (nestedValue.length === 0) {
        addType(fieldTypes, `${currentPath}[]`, 'unknown');
      }

      nestedValue.forEach((item) => {
        addType(fieldTypes, `${currentPath}[]`, getValueType(item));

        if (isExpandableObject(item)) {
          collectFieldTypes(item, `${currentPath}[]`, fieldTypes);
        }
      });
      continue;
    }

    if (isExpandableObject(nestedValue)) {
      collectFieldTypes(nestedValue, currentPath, fieldTypes);
    }
  }
};

router.get('/', async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const filter = includeInactive ? {} : { active: true };

  const challenges = await ChallengeModel.find(filter).sort({ createdAt: -1 });
  res.json(challenges);
});

router.get('/:id/schema', async (req, res) => {
  try {
    const challenge = await ChallengeModel.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const sandboxDb = getSandboxDb();
    const collection = sandboxDb.collection(challenge.datasetCollection);
    const documents = await collection.find({}).toArray();
    const totalDocuments = documents.length;

    const fieldTypes = new Map<string, Set<string>>();
    documents.forEach((document) => collectFieldTypes(document, '', fieldTypes));

    const fields = Array.from(fieldTypes.entries())
      .map(([path, types]) => ({
        path,
        types: Array.from(types).sort(),
      }))
      .sort((a, b) => a.path.localeCompare(b.path));

    return res.json({
      collection: challenge.datasetCollection,
      totalDocuments,
      sampledDocuments: documents.length,
      fields,
    });
  } catch (_error) {
    return res.status(400).json({ message: 'Invalid challenge id' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const challenge = await ChallengeModel.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    return res.json(challenge);
  } catch (_error) {
    return res.status(400).json({ message: 'Invalid challenge id' });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, description, datasetCollection, expectedResult, baselineQuery } = req.body;

  if (!title || !description || !datasetCollection || expectedResult === undefined || !baselineQuery) {
    return res.status(400).json({
      message:
        'Missing required fields: title, description, datasetCollection, expectedResult, baselineQuery',
    });
  }

  const challenge = await ChallengeModel.create(req.body);
  return res.status(201).json(challenge);
});

export default router;

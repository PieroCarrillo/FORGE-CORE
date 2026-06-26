import { MongoClient, ObjectId } from 'mongodb';
import { config } from './config.js';

export type ProductReviewDocument = {
  _id?: ObjectId;
  userId: number;
  userName: string;
  userEmail: string;
  productId: number;
  productName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulUserIds: number[];
  helpfulCount: number;
  status: 'published' | 'hidden';
  createdAt: Date;
  updatedAt: Date;
};

let mongoClient: MongoClient | null = null;

export function isMongoConfigured() {
  return Boolean(config.mongodb.uri);
}

export async function getMongoClient() {
  if (!config.mongodb.uri) {
    throw new Error('MongoDB Atlas no esta configurado');
  }

  if (!mongoClient) {
    mongoClient = new MongoClient(config.mongodb.uri);
    await mongoClient.connect();
  }

  return mongoClient;
}

export async function getReviewsCollection() {
  const client = await getMongoClient();
  const collection = client.db(config.mongodb.database).collection<ProductReviewDocument>('product_reviews');
  await collection.createIndex({ productId: 1, status: 1, createdAt: -1 });
  await collection.createIndex({ userId: 1, createdAt: -1 });
  await collection.createIndex({ rating: -1 });
  return collection;
}

export function toReviewResponse(review: ProductReviewDocument) {
  return {
    id: review._id?.toHexString(),
    userId: review.userId,
    userName: review.userName,
    productId: review.productId,
    productName: review.productName,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    verifiedPurchase: review.verifiedPurchase,
    helpfulCount: review.helpfulCount,
    status: review.status,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt
  };
}

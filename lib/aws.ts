import { CognitoUserPool, ICognitoStorage } from 'amazon-cognito-identity-js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AWS_REGION = process.env.EXPO_PUBLIC_AWS_REGION || '';
const USER_POOL_ID = process.env.EXPO_PUBLIC_AWS_USER_POOL_ID || '';
const USER_POOL_CLIENT_ID = process.env.EXPO_PUBLIC_AWS_USER_POOL_CLIENT_ID || '';
const IDENTITY_POOL_ID = process.env.EXPO_PUBLIC_AWS_IDENTITY_POOL_ID || '';

// Bridge AsyncStorage to the synchronous ICognitoStorage interface.
// Cognito SDK calls these methods synchronously, but AsyncStorage is async.
// We maintain an in-memory cache that syncs to AsyncStorage in the background.
const memoryCache: Record<string, string> = {};

const cognitoStorage: ICognitoStorage = {
  getItem(key: string): string | null {
    return memoryCache[key] ?? null;
  },
  setItem(key: string, value: string): void {
    memoryCache[key] = value;
    AsyncStorage.setItem(key, value).catch(() => {});
  },
  removeItem(key: string): void {
    delete memoryCache[key];
    AsyncStorage.removeItem(key).catch(() => {});
  },
  clear(): void {
    Object.keys(memoryCache).forEach(k => delete memoryCache[k]);
    AsyncStorage.clear().catch(() => {});
  },
};

// Pre-load cached Cognito keys from AsyncStorage on startup
async function hydrateCognitoStorage() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cognitoKeys = allKeys.filter(k => k.startsWith('CognitoIdentityServiceProvider'));
    if (cognitoKeys.length > 0) {
      const pairs = await AsyncStorage.multiGet(cognitoKeys);
      pairs.forEach(([key, value]) => {
        if (value !== null) memoryCache[key] = value;
      });
    }
  } catch {
    // Ignore hydration errors — fresh start
  }
}
hydrateCognitoStorage();

// Don't crash if AWS env vars are missing (offline mode)
let userPool: CognitoUserPool | null = null;

if (USER_POOL_ID && USER_POOL_CLIENT_ID) {
  userPool = new CognitoUserPool({
    UserPoolId: USER_POOL_ID,
    ClientId: USER_POOL_CLIENT_ID,
    Storage: cognitoStorage,
  });
  console.log('✅ AWS Cognito User Pool initialized');
} else {
  console.warn('⚠️ AWS env vars missing — running in offline mode');
}

function createDynamoClient(idToken: string): DynamoDBDocumentClient {
  const providerName = `cognito-idp.${AWS_REGION}.amazonaws.com/${USER_POOL_ID}`;
  const client = new DynamoDBClient({
    region: AWS_REGION,
    credentials: fromCognitoIdentityPool({
      identityPoolId: IDENTITY_POOL_ID,
      logins: {
        [providerName]: idToken,
      },
      clientConfig: { region: AWS_REGION },
    }),
  });
  return DynamoDBDocumentClient.from(client);
}

export { userPool, cognitoStorage, createDynamoClient, AWS_REGION, USER_POOL_ID, IDENTITY_POOL_ID };

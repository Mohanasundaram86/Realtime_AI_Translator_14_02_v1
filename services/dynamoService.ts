import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { createDynamoClient } from '@/lib/aws';
import { UserSettings, ConversationHistory } from '@/types';

class DynamoService {
  private docClient: DynamoDBDocumentClient | null = null;

  initialize(idToken: string) {
    this.docClient = createDynamoClient(idToken);
    console.log('✅ DynamoDB client initialized with Cognito credentials');
  }

  isInitialized(): boolean {
    return this.docClient !== null;
  }

  // ── USER SETTINGS ──

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    if (!this.docClient) return null;
    try {
      const result = await this.docClient.send(new GetCommand({
        TableName: 'user_settings',
        Key: { user_id: userId },
      }));
      return (result.Item as UserSettings) || null;
    } catch (error) {
      console.error('❌ DynamoDB getUserSettings error:', error);
      return null;
    }
  }

  async putUserSettings(settings: UserSettings): Promise<void> {
    if (!this.docClient) return;
    try {
      await this.docClient.send(new PutCommand({
        TableName: 'user_settings',
        Item: { ...settings, updated_at: new Date().toISOString() },
      }));
    } catch (error) {
      console.error('❌ DynamoDB putUserSettings error:', error);
      throw error;
    }
  }

  async updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings | null> {
    if (!this.docClient) return null;
    try {
      const expressionParts: string[] = [];
      const expressionValues: Record<string, any> = {};
      const expressionNames: Record<string, string> = {};

      Object.entries(updates).forEach(([key, value], i) => {
        if (key === 'user_id') return;
        expressionParts.push(`#k${i} = :v${i}`);
        expressionNames[`#k${i}`] = key;
        expressionValues[`:v${i}`] = value;
      });

      expressionParts.push('#upd = :updVal');
      expressionNames['#upd'] = 'updated_at';
      expressionValues[':updVal'] = new Date().toISOString();

      const result = await this.docClient.send(new UpdateCommand({
        TableName: 'user_settings',
        Key: { user_id: userId },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ReturnValues: 'ALL_NEW',
      }));

      return (result.Attributes as UserSettings) || null;
    } catch (error) {
      console.error('❌ DynamoDB updateUserSettings error:', error);
      throw error;
    }
  }

  // ── CONVERSATION HISTORY ──

  async getConversationHistory(userId: string): Promise<ConversationHistory[]> {
    if (!this.docClient) return [];
    try {
      const result = await this.docClient.send(new QueryCommand({
        TableName: 'conversation_history',
        KeyConditionExpression: 'user_id = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        ScanIndexForward: false, // descending by sort key (timestamp)
      }));
      return (result.Items as ConversationHistory[]) || [];
    } catch (error) {
      console.error('❌ DynamoDB getConversationHistory error:', error);
      return [];
    }
  }

  async putConversationHistory(item: Omit<ConversationHistory, 'id'>): Promise<void> {
    if (!this.docClient) return;
    try {
      const record = {
        ...item,
        id: `${item.user_id}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        created_at: new Date().toISOString(),
      };
      await this.docClient.send(new PutCommand({
        TableName: 'conversation_history',
        Item: record,
      }));
    } catch (error) {
      console.error('❌ DynamoDB putConversationHistory error:', error);
    }
  }

  async deleteConversationHistoryItem(userId: string, timestamp: string): Promise<void> {
    if (!this.docClient) return;
    try {
      await this.docClient.send(new DeleteCommand({
        TableName: 'conversation_history',
        Key: { user_id: userId, timestamp },
      }));
    } catch (error) {
      console.error('❌ DynamoDB deleteConversationHistory error:', error);
      throw error;
    }
  }

  async clearConversationHistory(userId: string): Promise<void> {
    if (!this.docClient) return;
    try {
      const items = await this.getConversationHistory(userId);
      for (const item of items) {
        await this.deleteConversationHistoryItem(userId, item.timestamp);
      }
    } catch (error) {
      console.error('❌ DynamoDB clearConversationHistory error:', error);
      throw error;
    }
  }
}

export const dynamoService = new DynamoService();

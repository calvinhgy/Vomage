/**
 * AWS服务连接测试API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const results = {
    timestamp: new Date().toISOString(),
    aws: {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.substring(0, 8) + '...',
        region: process.env.AWS_REGION,
      },
      tests: {
        s3: { success: false, error: null as string | null },
        bedrock: { success: false, error: null as string | null },
      },
    },
  };

  // 测试S3连接
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    results.aws.tests.s3.success = true;
    console.log('S3连接测试成功，桶数量:', response.Buckets?.length || 0);
  } catch (error) {
    results.aws.tests.s3.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('S3连接测试失败:', error);
  }

  // 测试Bedrock连接
  try {
    const bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new ConverseCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      messages: [
        {
          role: 'user',
          content: [{ text: 'Hello' }],
        },
      ],
      inferenceConfig: {
        maxTokens: 10,
        temperature: 0.1,
      },
    });

    const response = await bedrockClient.send(command);
    results.aws.tests.bedrock.success = true;
    console.log('Bedrock连接测试成功');
  } catch (error) {
    results.aws.tests.bedrock.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bedrock连接测试失败:', error);
  }

  res.status(200).json({
    success: true,
    data: results,
  });
}

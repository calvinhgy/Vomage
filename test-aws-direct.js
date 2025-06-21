/**
 * 直接测试AWS服务连接
 */

const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

async function testAWSServices() {
  console.log('开始测试AWS服务连接...');
  
  const awsConfig = {
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  };

  console.log('AWS配置:', {
    region: awsConfig.region,
    accessKeyId: awsConfig.credentials.accessKeyId?.substring(0, 8) + '...',
  });

  // 测试S3
  try {
    console.log('\n1. 测试S3连接...');
    const s3Client = new S3Client(awsConfig);
    const s3Response = await s3Client.send(new ListBucketsCommand({}));
    console.log('✅ S3连接成功，桶数量:', s3Response.Buckets?.length || 0);
    
    // 列出我们创建的桶
    const ourBuckets = s3Response.Buckets?.filter(bucket => 
      bucket.Name?.includes('vomage')
    );
    console.log('Vomage相关桶:', ourBuckets?.map(b => b.Name));
  } catch (error) {
    console.error('❌ S3连接失败:', error.message);
  }

  // 测试Bedrock Claude
  try {
    console.log('\n2. 测试Bedrock Claude连接...');
    const bedrockClient = new BedrockRuntimeClient(awsConfig);
    
    const command = new ConverseCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      messages: [
        {
          role: 'user',
          content: [{ text: 'Hello, this is a test' }],
        },
      ],
      inferenceConfig: {
        maxTokens: 20,
        temperature: 0.1,
      },
    });

    const response = await bedrockClient.send(command);
    console.log('✅ Claude连接成功');
    console.log('响应:', response.output?.message?.content?.[0]?.text?.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ Claude连接失败:', error.message);
  }

  console.log('\n测试完成！');
}

// 运行测试
testAWSServices().catch(console.error);

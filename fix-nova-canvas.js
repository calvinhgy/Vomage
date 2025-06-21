/**
 * Nova Canvas 修复脚本
 * 测试和修复Amazon Nova Canvas图片生成功能
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testNovaCanvas() {
  console.log('🔧 开始测试Nova Canvas...');
  
  // 初始化客户端
  const client = new BedrockRuntimeClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // 测试不同的请求格式
  const testCases = [
    {
      name: '标准格式',
      body: {
        taskType: 'TEXT_IMAGE',
        textToImageParams: {
          text: 'a simple blue sky with white clouds'
        },
        imageGenerationConfig: {
          numberOfImages: 1,
          quality: 'standard',
          height: 512,
          width: 512,
          cfgScale: 8.0,
          seed: 12345
        }
      }
    },
    {
      name: '简化格式',
      body: {
        prompt: 'a simple blue sky with white clouds',
        width: 512,
        height: 512,
        numberOfImages: 1
      }
    },
    {
      name: 'Amazon格式',
      body: {
        text: 'a simple blue sky with white clouds',
        images: 1,
        width: 512,
        height: 512
      }
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n🧪 测试 ${testCase.name}...`);
      console.log('📝 请求体:', JSON.stringify(testCase.body, null, 2));
      
      const command = new InvokeModelCommand({
        modelId: 'amazon.nova-canvas-v1:0',
        body: JSON.stringify(testCase.body),
        contentType: 'application/json',
        accept: 'application/json'
      });

      const response = await client.send(command);
      
      if (response.body) {
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        console.log('✅ 成功! 响应结构:', Object.keys(responseBody));
        console.log('📦 响应内容:', JSON.stringify(responseBody, null, 2).substring(0, 500) + '...');
        
        // 检查图片数据
        if (responseBody.images && responseBody.images.length > 0) {
          const imageData = responseBody.images[0];
          console.log('🖼️ 图片数据字段:', Object.keys(imageData));
          
          // 检查可能的base64字段
          const possibleFields = ['image', 'base64', 'data', 'content', 'imageData'];
          for (const field of possibleFields) {
            if (imageData[field]) {
              console.log(`✅ 找到图片数据字段: ${field}, 长度: ${imageData[field].length}`);
            }
          }
        }
        
        return { success: true, format: testCase.name, response: responseBody };
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} 失败:`, error.message);
    }
  }
  
  return { success: false };
}

// 运行测试
if (require.main === module) {
  testNovaCanvas()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 找到工作的格式:', result.format);
      } else {
        console.log('\n❌ 所有格式都失败了');
      }
    })
    .catch(error => {
      console.error('💥 测试失败:', error);
    });
}

module.exports = { testNovaCanvas };

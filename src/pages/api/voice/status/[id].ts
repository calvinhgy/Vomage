/**
 * 查询语音记录处理状态API
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { connectDatabase, getVoiceRecordCollection } from '@/services/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: '只支持 GET 请求',
      },
    });
  }

  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: '无效的记录ID',
        },
      });
    }

    // 连接数据库
    await connectDatabase();
    const voiceRecordCollection = getVoiceRecordCollection();

    // 查询记录
    const record = await voiceRecordCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: '记录不存在',
        },
      });
    }

    // 返回记录状态
    res.status(200).json({
      success: true,
      data: {
        id: record._id.toString(),
        processingStatus: record.processingStatus,
        processingError: record.processingError,
        isProcessed: record.isProcessed,
        transcript: record.transcript,
        transcriptConfidence: record.transcriptConfidence,
        sentiment: record.sentiment,
        generatedImages: record.generatedImages,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });

  } catch (error) {
    console.error('查询语音记录状态失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误',
      },
    });
  }
}

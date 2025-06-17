/**
 * 获取单个语音记录 API
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
          code: 'VALIDATION_ERROR',
          message: '缺少有效的记录ID',
        },
      });
    }

    // 验证ObjectId格式
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '无效的记录ID格式',
        },
      });
    }

    console.log('查询语音记录:', id);

    // 连接数据库
    await connectDatabase();
    const voiceRecordCollection = getVoiceRecordCollection();

    // 查找语音记录
    const voiceRecord = await voiceRecordCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!voiceRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '语音记录不存在',
        },
      });
    }

    console.log('找到语音记录:', {
      id: voiceRecord._id.toString(),
      processingStatus: voiceRecord.processingStatus,
      isProcessed: voiceRecord.isProcessed,
      hasTranscript: !!voiceRecord.transcript,
    });

    // 返回语音记录
    res.status(200).json({
      success: true,
      data: {
        id: voiceRecord._id.toString(),
        userId: voiceRecord.userId,
        audioUrl: voiceRecord.audioUrl,
        audioSize: voiceRecord.audioSize,
        duration: voiceRecord.duration,
        transcript: voiceRecord.transcript,
        transcriptConfidence: voiceRecord.transcriptConfidence,
        sentiment: voiceRecord.sentiment,
        context: voiceRecord.context,
        generatedImages: voiceRecord.generatedImages,
        metadata: voiceRecord.metadata,
        privacy: voiceRecord.privacy,
        tags: voiceRecord.tags,
        likes: voiceRecord.likes,
        shares: voiceRecord.shares,
        comments: voiceRecord.comments,
        isProcessed: voiceRecord.isProcessed,
        processingStatus: voiceRecord.processingStatus,
        processingError: voiceRecord.processingError,
        createdAt: voiceRecord.createdAt,
        updatedAt: voiceRecord.updatedAt,
      },
    });

  } catch (error) {
    console.error('获取语音记录失败:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取语音记录失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
    });
  }
}

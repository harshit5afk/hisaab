import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('extract-invoice')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async extractInvoice(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.aiService.extractInvoice(file.buffer, file.mimetype);
  }

  @Post('query')
  async query(@Body('question') question: string) {
    if (!question || question.trim().length === 0) {
      throw new BadRequestException('Question is required');
    }
    return this.aiService.answerQuery(question.trim());
  }
}

import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountingEngineService } from './accounting-engine.service';
import { PostSourceDocumentDto } from './dto/post-source-document.dto';
import { PostingPreviewRequestDto } from './dto/posting-preview-request.dto';
import { PostingPreviewResponseDto } from './dto/posting-preview-response.dto';
import { PostingResultResponseDto } from './dto/posting-result-response.dto';
import { ReverseSourceJournalDto } from './dto/reverse-source-journal.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Accounting Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounting-engine')
export class AccountingEngineController {
  constructor(private readonly engine: AccountingEngineService) {}

  @Post('preview')
  @ApiOkResponse({type: PostingPreviewResponseDto})
  preview(@Req() req: AuthenticatedRequest,@Body() dto: PostingPreviewRequestDto){
    return this.engine.preview(dto, req.user.companyId);
  }

  @Post('post')
  @ApiCreatedResponse({type: PostingResultResponseDto})
  post(@Req() req: AuthenticatedRequest,@Body() dto: PostSourceDocumentDto){
    return this.engine.post(dto, req.user.companyId, req.user.id);
  }

  @Post('reverse')
  @ApiCreatedResponse({type: PostingResultResponseDto})
  reverse(@Req() req: AuthenticatedRequest,@Body() dto: ReverseSourceJournalDto){
    return this.engine.reverse(dto, req.user.companyId, req.user.id);
  }
}

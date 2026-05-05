import { Controller, Post, Get, Delete, Param, Body, Query, NotFoundException, HttpCode, HttpStatus, UseGuards, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { Consultation } from './consultation.entity';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@ApiTags('Consultations')
@ApiBearerAuth()
@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly service: ConsultationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a new consultation request' })
  @ApiResponse({ status: 201, description: 'Consultation created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  async create(@Body() dto: CreateConsultationDto): Promise<{
    message: string;
    consultation: Consultation;
  }> {
    const consultation = await this.service.create(dto);
    return {
      message: 'Consultation request received. We will reply within one business day.',
      consultation,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List consultation requests with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'need', required: false, type: String })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('need') need?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    return this.service.findAllPaginated({
      page: pageNum,
      limit: limitNum,
      search,
      need,
    });
  }

  @Get('notifications')
  @Sse('notifications')
  @ApiOperation({ summary: 'SSE endpoint for real-time new consultation notifications' })
  sseNotifications(): Observable<MessageEvent> {
    return this.service.newConsultation$.pipe(
      map((consultation) => ({
        data: {
          id: consultation.id,
          name: consultation.name,
          need: consultation.need,
          createdAt: consultation.createdAt,
        },
      } as MessageEvent)),
    );
  }

  @Get('needs')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get unique service needs' })
  async getNeeds(): Promise<string[]> {
    return this.service.getUniqueNeeds();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single consultation by ID' })
  @ApiResponse({ status: 404, description: 'Consultation not found.' })
  async findOne(@Param('id') id: string): Promise<Consultation> {
    const consultation = await this.service.findOne(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation ${id} not found`);
    }
    return consultation;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a consultation request' })
  @ApiResponse({ status: 200, description: 'Consultation deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Consultation not found.' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    const consultation = await this.service.findOne(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation ${id} not found`);
    }
    await this.service.remove(id);
    return { message: 'Consultation deleted successfully.' };
  }

  @Post(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark a consultation request as read' })
  @ApiResponse({ status: 200, description: 'Consultation marked as read.' })
  @ApiResponse({ status: 404, description: 'Consultation not found.' })
  async markAsRead(@Param('id') id: string): Promise<Consultation> {
    const consultation = await this.service.markAsRead(id);
    if (!consultation) {
      throw new NotFoundException(`Consultation ${id} not found`);
    }
    return consultation;
  }
}

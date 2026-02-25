import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RulesService } from './rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@ApiTags('rules')
@Controller('rules')
export class RulesController {
  constructor(private readonly rules: RulesService) {}

  @Post()
  create(@Body() dto: CreateRuleDto) {
    return this.rules.create(dto);
  }

  @Get()
  list() {
    return this.rules.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.rules.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.rules.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rules.remove(id);
  }
}

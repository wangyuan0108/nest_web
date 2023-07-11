import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  // HttpException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfigService } from '@nestjs/config';

import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('用户')
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private configService: ConfigService,
  ) {}

  @ApiOperation({ summary: '创建用户' })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApiOperation({ summary: '用户列表' })
  @Get()
  findAll() {
    // console.log('configService===', this.configService.get('db'));
    // throw new HttpException('文章已存在', 401);
    return this.userService.findAll();
  }

  @ApiOperation({ summary: '用户详情' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @ApiOperation({ summary: '修改用户' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @ApiOperation({ summary: '删除用户' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}

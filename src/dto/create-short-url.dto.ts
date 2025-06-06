import {
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateShortUrlDto {
  @IsUrl({}, { message: 'originalUrl должен быть валидным URL' })
  originalUrl: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'expiresAt должен быть валидной датой в формате ISO' },
  )
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'alias не может быть длиннее 20 символов' })
  alias?: string;
}

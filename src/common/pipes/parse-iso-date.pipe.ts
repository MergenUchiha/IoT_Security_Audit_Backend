import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseIsoDatePipe
  implements PipeTransform<string | undefined, Date | undefined>
{
  transform(value: string | undefined): Date | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`Invalid ISO date: "${value}"`);
    }
    return d;
  }
}
